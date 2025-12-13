/**
 * Firebase Admin SDK の初期化
 * サーバーサイド専用（API Routes や Server Components で使用）
 */

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App;
let firestoreInstance: Firestore;
let authInstance: Auth;

/**
 * Firebase Admin アプリを初期化
 */
function initializeFirebaseAdmin(): App {
  // 既に初期化されている場合は既存のアプリを返す
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  // 環境変数から Service Account を取得
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // デバッグ用: 環境変数の存在確認（値はログに出力しない）
  console.log('Firebase Admin initialization check:', {
    hasServiceAccount: !!serviceAccountBase64,
    hasProjectId: !!projectId,
    projectId: projectId || 'MISSING',
    nodeEnv: process.env.NODE_ENV,
  });

  if (!serviceAccountBase64) {
    const error = new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set in environment variables');
    console.error('Firebase Admin initialization error:', error.message);
    throw error;
  }

  if (!projectId) {
    const error = new Error('FIREBASE_PROJECT_ID is not set in environment variables');
    console.error('Firebase Admin initialization error:', error.message);
    throw error;
  }

  try {
    // Base64 デコードして JSON をパース
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Firebase Admin を初期化
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
    
    console.log('Firebase Admin initialized successfully');
    return app;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });
    
    // より詳細なエラーメッセージ
    if (error.message?.includes('JSON')) {
      throw new Error('Failed to parse Firebase Service Account JSON. Please check FIREBASE_SERVICE_ACCOUNT_BASE64 format.');
    }
    
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

/**
 * Firebase Admin アプリのインスタンスを取得
 */
export function getAdminApp(): App {
  if (!app) {
    app = initializeFirebaseAdmin();
  }
  return app;
}

/**
 * Firestore インスタンスを取得
 */
export function getAdminFirestore(): Firestore {
  if (!firestoreInstance) {
    getAdminApp(); // アプリを初期化
    firestoreInstance = getFirestore();
  }
  return firestoreInstance;
}

/**
 * Auth インスタンスを取得
 */
export function getAdminAuth(): Auth {
  if (!authInstance) {
    getAdminApp(); // アプリを初期化
    authInstance = getAuth();
  }
  return authInstance;
}

/**
 * ユーザードキュメントを取得
 */
export async function getUserDocument(uid: string) {
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  return userDoc.exists ? userDoc.data() : null;
}

/**
 * ユーザードキュメントを更新
 */
export async function updateUserDocument(uid: string, data: any) {
  const db = getAdminFirestore();
  await db.collection('users').doc(uid).set(data, { merge: true });
}

/**
 * Stripe Customer ID からユーザーを検索
 */
export async function findUserByCustomerId(customerId: string) {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    uid: doc.id,
    data: doc.data(),
  };
}

/**
 * Stripe Subscription ID からユーザーを検索
 */
export async function findUserBySubscriptionId(subscriptionId: string) {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('users')
    .where('subscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    uid: doc.id,
    data: doc.data(),
  };
}

// デフォルトエクスポート
export const adminDb = getAdminFirestore;
export const adminAuth = getAdminAuth;






