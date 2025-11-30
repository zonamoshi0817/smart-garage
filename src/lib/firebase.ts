"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, type User,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
  setPersistence, browserLocalPersistence
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

// 認証状態をlocalStorageに永続化（ブラウザを閉じてもログイン状態を保持）
// デフォルトでもLOCALパーシスタンスが使用されますが、明示的に設定することで確実にします
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Failed to set auth persistence:', error);
  });
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

// Googleログイン用
const googleProvider = new GoogleAuthProvider();
let isGoogleLoginInProgress = false;

export const loginWithGoogle = async () => {
  // 重複実行を防ぐ
  if (isGoogleLoginInProgress) {
    throw new Error("Googleログイン処理が既に実行中です。しばらくお待ちください。");
  }

  try {
    isGoogleLoginInProgress = true;
    console.log("Attempting Google login...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google login successful:", result.user.uid);
    return result;
  } catch (error: any) {
    console.error("Google login failed:", error);
    // nonceエラーの場合は、少し待ってから再試行可能にする
    if (error?.code === "auth/missing-or-invalid-nonce") {
      console.log("Nonce error detected, resetting login state");
    }
    throw error;
  } finally {
    // 少し遅延を入れてからフラグをリセット（重複実行を防ぐ）
    setTimeout(() => {
      isGoogleLoginInProgress = false;
    }, 1000);
  }
};

// Appleログイン用
const appleProvider = new OAuthProvider('apple.com');
export const loginWithApple = async () => {
  try {
    console.log("Attempting Apple login...");
    const result = await signInWithPopup(auth, appleProvider);
    console.log("Apple login successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Apple login failed:", error);
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

// メールアドレスで新規登録
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    console.log("Attempting email signup...");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Email signup successful:", result.user.uid);
    return result;
  } catch (error: any) {
    // エラーコードを保持して再スロー（呼び出し元で適切にハンドリングされる）
    // 開発環境でのみ詳細なログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log("Email signup failed (handled by UI):", error?.code || error?.message);
    }
    throw error;
  }
};

// メールアドレスでログイン
export const loginWithEmail = async (email: string, password: string) => {
  try {
    console.log("Attempting email login...");
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("Email login successful:", result.user.uid);
    return result;
  } catch (error: any) {
    // エラーコードを保持して再スロー（呼び出し元で適切にハンドリングされる）
    // 開発環境でのみ詳細なログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log("Email login failed (handled by UI):", error?.code || error?.message);
    }
    throw error;
  }
};

// パスワードリセットメール送信
export const resetPassword = async (email: string) => {
  try {
    console.log("Attempting password reset...");
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent");
  } catch (error) {
    console.error("Password reset failed:", error);
    throw error;
  }
};

// ユーザープロフィール（表示名）を更新
export const updateUserProfile = async (displayName: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('ユーザーがログインしていません');
  }

  try {
    console.log("Attempting to update user profile...");
    await updateProfile(user, {
      displayName: displayName.trim() || null,
    });
    console.log("User profile updated successfully");
    // プロフィール更新後、ユーザー情報を再読み込み
    await user.reload();
    return user;
  } catch (error: any) {
    console.error("Profile update failed:", error);
    throw error;
  }
};

// 認証状態の監視（ログイン/ログアウト時に反応） - シングルトン購読で重複を回避
let authCallbacks: Array<(user: User | null) => void> = [];
let unsubscribeInternalAuth: (() => void) | null = null;

export const watchAuth = (cb: (user: User | null) => void) => {
  // コールバックを登録
  authCallbacks.push(cb);

  // 内部のonAuthStateChangedを一度だけ設定
  if (!unsubscribeInternalAuth) {
    console.log("watchAuth: Initializing singleton auth state listener");
    unsubscribeInternalAuth = onAuthStateChanged(auth, (user) => {
      console.log("watchAuth: Auth state changed:", user ? "logged in" : "logged out");
      // 登録された全コールバックに配信
      authCallbacks.forEach(fn => {
        try {
          fn(user);
        } catch (e) {
          console.error("watchAuth: callback error", e);
        }
      });
    });
  } else {
    console.log("watchAuth: Reusing existing auth state listener");
  }

  // 解除関数（コールバック登録解除）。最後の一つが解除されたら内部購読も解除
  return () => {
    authCallbacks = authCallbacks.filter(fn => fn !== cb);
    if (authCallbacks.length === 0 && unsubscribeInternalAuth) {
      try {
        unsubscribeInternalAuth();
      } catch {}
      unsubscribeInternalAuth = null;
      console.log("watchAuth: All callbacks removed, auth listener disposed");
    }
  };
};