import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
// @ts-ignore - firebase/auth/react-nativeは型定義が不完全な場合がある
import { 
  initializeAuth, 
  getAuth, 
  Auth,
  getReactNativePersistence
} from 'firebase/auth/react-native';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase設定を環境変数から取得
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Firebase初期化（既に初期化されている場合は再利用）
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth初期化（React Native用にpersistenceを設定）
// initializeAuthは二重実行できないので、try-catchでガード
let auth: Auth;
try {
  // 既に初期化されている場合はgetAuthで取得
  auth = getAuth(app);
} catch (error) {
  // まだ初期化されていない場合はinitializeAuthで初期化
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db: Firestore = getFirestore(app);
export default app;
