// src/lib/signatureToken.ts
"use client";

/**
 * エクスポートデータの署名トークン生成と検証
 * 
 * 目的:
 * - 共有URLの改ざん防止
 * - PDFエクスポートの真正性保証
 * - データの出所証明
 */

/**
 * 署名アルゴリズム: HMAC-SHA256
 * 本番環境では、サーバーサイドでの署名生成を推奨
 */

/**
 * 署名シークレット
 * ⚠️ 本番環境では環境変数または Firebase Functions で管理
 */
const SIGNATURE_SECRET = process.env.NEXT_PUBLIC_SIGNATURE_SECRET || 'smart-garage-default-secret-key';

/**
 * データから署名を生成
 * @param data 署名対象データ（JSON文字列化可能なオブジェクト）
 * @returns 署名トークン (hex string)
 */
export async function generateSignature(data: any): Promise<string> {
  const payload = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payload);
  const keyBuffer = encoder.encode(SIGNATURE_SECRET);

  // HMAC-SHA256署名を生成
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return signatureHex;
}

/**
 * 署名を検証
 * @param data 検証対象データ
 * @param signature 署名トークン
 * @returns 署名が有効かどうか
 */
export async function verifySignature(data: any, signature: string): Promise<boolean> {
  try {
    const expectedSignature = await generateSignature(data);
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * 共有URL用のトークンを生成
 * @param carId 車両ID
 * @param timestamp タイムスタンプ（ミリ秒）
 * @param expiresInMs 有効期限（ミリ秒、デフォルト: 30日）
 * @returns { token, expiresAt }
 */
export async function generateShareToken(
  carId: string,
  timestamp: number = Date.now(),
  expiresInMs: number = 30 * 24 * 60 * 60 * 1000 // 30日
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = timestamp + expiresInMs;
  const payload = {
    carId,
    timestamp,
    expiresAt
  };

  const signature = await generateSignature(payload);
  const token = `${carId}.${timestamp}.${expiresAt}.${signature}`;

  return { token, expiresAt };
}

/**
 * 共有URLトークンを検証
 * @param token トークン文字列
 * @returns { valid, carId, timestamp, expiresAt } | null
 */
export async function verifyShareToken(token: string): Promise<{
  valid: boolean;
  carId?: string;
  timestamp?: number;
  expiresAt?: number;
  error?: string;
}> {
  try {
    const parts = token.split('.');
    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [carId, timestampStr, expiresAtStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(timestamp) || isNaN(expiresAt)) {
      return { valid: false, error: 'Invalid timestamp' };
    }

    // 有効期限チェック
    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Token expired', carId, timestamp, expiresAt };
    }

    // 署名検証
    const payload = { carId, timestamp, expiresAt };
    const isValid = await verifySignature(payload, signature);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature', carId, timestamp, expiresAt };
    }

    return { valid: true, carId, timestamp, expiresAt };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * PDFエクスポート用の署名を生成
 * @param carId 車両ID
 * @param recordIds メンテナンス記録ID配列
 * @param timestamp タイムスタンプ（ミリ秒）
 * @returns { signature, metadata }
 */
export async function generatePdfSignature(
  carId: string,
  recordIds: string[],
  timestamp: number = Date.now()
): Promise<{
  signature: string;
  metadata: {
    carId: string;
    recordIds: string[];
    timestamp: number;
    version: string;
  };
}> {
  const metadata = {
    carId,
    recordIds: recordIds.sort(), // ソートして一貫性を保つ
    timestamp,
    version: '1.0'
  };

  const signature = await generateSignature(metadata);

  return { signature, metadata };
}

/**
 * PDFメタデータから署名を検証
 * @param metadata メタデータ
 * @param signature 署名
 * @returns 署名が有効かどうか
 */
export async function verifyPdfSignature(
  metadata: {
    carId: string;
    recordIds: string[];
    timestamp: number;
    version: string;
  },
  signature: string
): Promise<boolean> {
  // recordIdsをソートして検証
  const sortedMetadata = {
    ...metadata,
    recordIds: [...metadata.recordIds].sort()
  };

  return await verifySignature(sortedMetadata, signature);
}

/**
 * 短縮署名を生成（QRコード用など）
 * @param fullSignature 完全な署名
 * @returns 短縮署名（最初の16文字）
 */
export function shortenSignature(fullSignature: string): string {
  return fullSignature.substring(0, 16);
}

/**
 * 署名付きデータを生成（汎用）
 * @param data 任意のデータ
 * @returns { data, signature, timestamp }
 */
export async function signData<T>(data: T): Promise<{
  data: T;
  signature: string;
  timestamp: number;
}> {
  const timestamp = Date.now();
  const payload = { data, timestamp };
  const signature = await generateSignature(payload);

  return { data, signature, timestamp };
}

/**
 * 署名付きデータを検証（汎用）
 * @param signedData 署名付きデータ
 * @returns { valid, data } | null
 */
export async function verifySignedData<T>(signedData: {
  data: T;
  signature: string;
  timestamp: number;
}): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    const payload = {
      data: signedData.data,
      timestamp: signedData.timestamp
    };

    const isValid = await verifySignature(payload, signedData.signature);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, data: signedData.data };
  } catch (error) {
    console.error('Signed data verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

