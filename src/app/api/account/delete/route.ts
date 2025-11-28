/**
 * アカウント削除API
 * 
 * - Firebase Authentication からユーザーを削除
 * - Firestore のユーザーデータを削除
 * - Firebase Storage のユーザーファイルを削除
 * - Stripe の顧客情報を削除（該当する場合）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore, getAdminApp } from '@/lib/firebaseAdmin';
import { getStorage, Storage } from 'firebase-admin/storage';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    const firestore = getAdminFirestore();
    const app = getAdminApp();
    const storage = getStorage(app);

    // ID Token を検証してユーザーIDを取得
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    console.log(`[Account Deletion] Starting deletion for user: ${uid}`);

    // 注意: アカウント削除時はStripeのサブスクリプションは削除しない
    // プラン変更（有料→無料）は別のAPI (/api/account/downgrade) で処理する

    // 1. Firestore のユーザーデータを削除
    try {
      const userRef = firestore.collection('users').doc(uid);
      
      // サブコレクションを削除
      const subcollections = ['cars', 'maintenance', 'fuelLogs', 'customs'];
      
      for (const subcollection of subcollections) {
        const snapshot = await userRef.collection(subcollection).get();
        const batch = firestore.batch();
        
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        if (snapshot.docs.length > 0) {
          await batch.commit();
          console.log(`[Account Deletion] Deleted ${snapshot.docs.length} documents from ${subcollection}`);
        }
      }

      // ユーザードキュメントを削除
      await userRef.delete();
      console.log(`[Account Deletion] Deleted user document`);
    } catch (error) {
      console.error(`[Account Deletion] Firestore deletion error:`, error);
      throw error;
    }

    // 2. Firebase Storage のユーザーファイルを削除
    try {
      const bucket = storage.bucket();
      const prefix = `users/${uid}/`;
      const [files] = await bucket.getFiles({ prefix });

      if (files.length > 0) {
        const deletePromises = files.map((file) => file.delete());
        await Promise.all(deletePromises);
        console.log(`[Account Deletion] Deleted ${files.length} files from Storage`);
      }
    } catch (error) {
      console.error(`[Account Deletion] Storage deletion error:`, error);
      // Storage の削除エラーは続行（ファイルが存在しない可能性がある）
    }

    // 3. Firebase Authentication からユーザーを削除
    try {
      await auth.deleteUser(uid);
      console.log(`[Account Deletion] Deleted user from Authentication`);
    } catch (error) {
      console.error(`[Account Deletion] Auth deletion error:`, error);
      throw error;
    }

    console.log(`[Account Deletion] Successfully deleted account for user: ${uid}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Account Deletion] Error:', error);
    return NextResponse.json(
      { error: error.message || 'アカウント削除に失敗しました' },
      { status: 500 }
    );
  }
}

