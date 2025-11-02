"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, type User
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// .env.local の値を読み込む
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo-app-id",
};

// Firebaseアプリを初期化（複数回呼んでも大丈夫にする）
const app = (() => {
  try {
    const existingApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    return existingApp;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // フォールバック用のダミー設定
    return getApps().length ? getApp() : initializeApp({
      apiKey: "demo-api-key",
      authDomain: "demo-project.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "demo-app-id",
    });
  }
})();

// デバッグ用：Firebase設定を確認
console.log("Firebase initialized with config:", {
  apiKey: firebaseConfig.apiKey ? "***" : "MISSING",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId ? "***" : "MISSING"
});

// 本番環境でのデバッグ用
if (typeof window !== 'undefined') {
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Firebase config values:", {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "SET" : "NOT SET",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "SET" : "NOT SET",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "SET" : "NOT SET",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "SET" : "NOT SET",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "SET" : "NOT SET",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "SET" : "NOT SET"
  });
}

// 認証とDBのインスタンスをexport
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

// Googleログイン用
const provider = new GoogleAuthProvider();
export const loginWithGoogle = async () => {
  try {
    console.log("Attempting Google login...");
    const result = await signInWithPopup(auth, provider);
    console.log("Google login successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Google login failed:", error);
    throw error;
  }
};
export const logout = async () => {
  try {
    console.log("Attempting logout...");
    await signOut(auth);
    console.log("Logout successful");
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

// 認証状態の監視（ログイン/ログアウト時に反応）
export const watchAuth = (cb: (user: User | null) => void) => {
  console.log("watchAuth: Setting up auth state listener");
  return onAuthStateChanged(auth, (user) => {
    console.log("watchAuth: Auth state changed:", user ? "logged in" : "logged out");
    cb(user);
  });
};