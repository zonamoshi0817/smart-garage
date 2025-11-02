// Cloud Functions for Smart Garage
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';

// Firebase Admin初期化
admin.initializeApp();

/**
 * 環境変数から秘密鍵を取得
 * 本番環境: Firebase Functions環境変数で管理
 * ローカル: functions/.env.localで管理
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7日間

/**
 * JWT署名付きPDFエクスポートトークン発行
 * 
 * クライアントの問題:
 * - HMAC秘密鍵をクライアントに持てない
 * - 署名の真正性が保証できない
 * 
 * Cloud Functionsでの解決:
 * - サーバーサイドでJWT発行
 * - kid（Key ID）付与で鍵ローテーション対応
 * - 短命トークン（7日）で漏洩リスク低減
 */
export const generatePdfExportToken = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { carId, recordIds, options } = data;
    const userId = context.auth.uid;

    // 入力検証
    if (!carId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'carIdは必須です'
      );
    }

    // 車両の所有権を確認
    const carDoc = await admin.firestore()
      .doc(`users/${userId}/cars/${carId}`)
      .get();

    if (!carDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '指定された車両が見つかりません'
      );
    }

    // JWTペイロード
    const payload = {
      type: 'pdf_export',
      userId,
      carId,
      recordIds: recordIds || [],
      options: options || {},
      scope: 'export:pdf',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    };

    // JWT署名（kid付き）
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      keyid: 'v1', // 鍵バージョン（ローテーション対応）
    });

    functions.logger.info('PDF export token generated', {
      userId,
      carId,
      tokenLength: token.length,
    });

    return {
      token,
      expiresAt: payload.exp,
      downloadUrl: `${functions.config().app?.url || 'https://smart-garage.app'}/api/export/pdf?token=${token}`,
    };
  });

/**
 * JWT署名付き共有URLトークン発行
 * 
 * 機能:
 * - scope指定（share:car / share:vehicle-history）
 * - 有効期限設定
 * - 失効機能（revokedAt）
 */
export const generateShareToken = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { carId, scope, expiresInDays = 30 } = data;
    const userId = context.auth.uid;

    // 入力検証
    if (!carId || !scope) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'carIdとscopeは必須です'
      );
    }

    // scope検証
    const validScopes = ['share:car', 'share:vehicle-history'];
    if (!validScopes.includes(scope)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `無効なscope: ${scope}`
      );
    }

    // 車両の所有権を確認
    const carDoc = await admin.firestore()
      .doc(`users/${userId}/cars/${carId}`)
      .get();

    if (!carDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '指定された車両が見つかりません'
      );
    }

    // 有効期限計算
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);

    // JWTペイロード
    const payload = {
      type: 'share_link',
      userId,
      carId,
      scope,
      iat: Math.floor(Date.now() / 1000),
      exp: expiresAt,
      revokedAt: null, // 失効時にFirestoreで管理
    };

    // JWT署名
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      keyid: 'v1',
    });

    // 共有トークンをFirestoreに保存（失効管理用）
    const shareTokenRef = await admin.firestore()
      .collection(`users/${userId}/shareTokens`)
      .add({
        carId,
        scope,
        token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt * 1000),
        revokedAt: null,
        accessCount: 0,
      });

    functions.logger.info('Share token generated', {
      userId,
      carId,
      scope,
      tokenId: shareTokenRef.id,
    });

    return {
      token,
      tokenId: shareTokenRef.id,
      expiresAt,
      shareUrl: `${functions.config().app?.url || 'https://smart-garage.app'}/share/${token}`,
    };
  });

/**
 * 共有トークンの検証
 * 
 * クライアントから呼び出され、トークンの有効性を検証
 */
export const verifyShareToken = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const { token } = data;

    if (!token) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'トークンは必須です'
      );
    }

    try {
      // JWT検証
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as any;

      // トークンタイプチェック
      if (decoded.type !== 'share_link') {
        throw new functions.https.HttpsError(
          'permission-denied',
          '無効なトークンタイプ'
        );
      }

      // Firestoreで失効チェック
      const tokensSnapshot = await admin.firestore()
        .collection(`users/${decoded.userId}/shareTokens`)
        .where('token', '==', token)
        .limit(1)
        .get();

      if (tokensSnapshot.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'トークンが見つかりません'
        );
      }

      const tokenDoc = tokensSnapshot.docs[0];
      const tokenData = tokenDoc.data();

      // 失効チェック
      if (tokenData.revokedAt) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'このトークンは失効されています'
        );
      }

      // アクセスカウント更新
      await tokenDoc.ref.update({
        accessCount: admin.firestore.FieldValue.increment(1),
        lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info('Share token verified', {
        userId: decoded.userId,
        carId: decoded.carId,
        scope: decoded.scope,
        tokenId: tokenDoc.id,
      });

      return {
        valid: true,
        userId: decoded.userId,
        carId: decoded.carId,
        scope: decoded.scope,
        expiresAt: decoded.exp,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'トークンの検証に失敗しました'
        );
      }
      throw error;
    }
  });

/**
 * 共有トークンの失効
 * 
 * トークン発行者のみが失効可能
 */
export const revokeShareToken = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザー認証が必要です'
      );
    }

    const { tokenId } = data;
    const userId = context.auth.uid;

    if (!tokenId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'tokenIdは必須です'
      );
    }

    // トークンの所有権確認
    const tokenDoc = await admin.firestore()
      .doc(`users/${userId}/shareTokens/${tokenId}`)
      .get();

    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'トークンが見つかりません'
      );
    }

    // 失効処理
    await tokenDoc.ref.update({
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedBy: userId,
    });

    functions.logger.info('Share token revoked', {
      userId,
      tokenId,
    });

    return {
      success: true,
      revokedAt: new Date().toISOString(),
    };
  });

/**
 * PDFエクスポートトークンの検証
 */
export const verifyPdfExportToken = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const { token } = data;

    if (!token) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'トークンは必須です'
      );
    }

    try {
      // JWT検証
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as any;

      // トークンタイプチェック
      if (decoded.type !== 'pdf_export') {
        throw new functions.https.HttpsError(
          'permission-denied',
          '無効なトークンタイプ'
        );
      }

      functions.logger.info('PDF export token verified', {
        userId: decoded.userId,
        carId: decoded.carId,
      });

      return {
        valid: true,
        userId: decoded.userId,
        carId: decoded.carId,
        recordIds: decoded.recordIds || [],
        options: decoded.options || {},
        expiresAt: decoded.exp,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'トークンの検証に失敗しました'
        );
      }
      throw error;
    }
  });

