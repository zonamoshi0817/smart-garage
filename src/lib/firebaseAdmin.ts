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
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set in environment variables');
  }

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not set in environment variables');
  }

  try {
    // Base64 デコードして JSON をパース
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Firebase Admin を初期化
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
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






