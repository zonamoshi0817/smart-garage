"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { loginWithGoogle, loginWithEmail } from "@/lib/firebase";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInvalidCredential, setIsInvalidCredential] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    if (isLoading) return; // 既に処理中の場合は何もしない
    
    try {
      setIsLoading(true);
      setError(null);
      await loginWithGoogle();
      router.push("/home");
    } catch (error: any) {
      console.error("Google login error:", error);
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.toString() || "不明なエラー";
      
      let userFriendlyMessage = "Googleでログインに失敗しました";
      
      if (errorCode === "auth/missing-or-invalid-nonce") {
        userFriendlyMessage = "認証処理が重複しました。ページをリロードしてから再度お試しください。";
      } else if (errorCode === "auth/popup-closed-by-user") {
        userFriendlyMessage = "ログインがキャンセルされました。";
        setError(null); // ユーザーがキャンセルした場合はエラーを表示しない
        return;
      } else if (errorMessage.includes("popup") || errorMessage.includes("blocked")) {
        userFriendlyMessage = "ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。";
      } else if (errorMessage.includes("既に実行中")) {
        userFriendlyMessage = errorMessage;
      }
      
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setIsInvalidCredential(false);
      
      if (!email || !password) {
        setError("メールアドレスとパスワードを入力してください");
        return;
      }

      await loginWithEmail(email, password);
      router.push("/home");
    } catch (error: any) {
      // エラーは適切にハンドリングされ、UIに表示されます
      const errorCode = error?.code;
      let errorMessage = "ログインに失敗しました";
      
      if (errorCode === "auth/invalid-credential") {
        errorMessage = "メールアドレスまたはパスワードが正しくありません";
        setIsInvalidCredential(true);
      } else if (errorCode === "auth/user-not-found") {
        errorMessage = "このメールアドレスは登録されていません";
        setIsInvalidCredential(false);
      } else if (errorCode === "auth/wrong-password") {
        errorMessage = "パスワードが正しくありません";
        setIsInvalidCredential(true);
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "メールアドレスの形式が正しくありません";
        setIsInvalidCredential(false);
      } else if (errorCode === "auth/user-disabled") {
        errorMessage = "このアカウントは無効化されています";
        setIsInvalidCredential(false);
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage = "ログイン試行回数が多すぎます。しばらく待ってから再度お試しください";
        setIsInvalidCredential(false);
      } else if (error?.message) {
        errorMessage = error.message;
        setIsInvalidCredential(false);
      }
      
      // 開発環境でのみコンソールにログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log("Login error handled:", errorCode, "- Message shown to user:", errorMessage);
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            GarageLogにログイン
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700 mb-2">{error}</p>
            {isInvalidCredential && (
              <p className="text-sm text-red-600">
                パスワードをお忘れの場合は、
                <Link href="/reset-password" className="text-blue-600 hover:text-blue-700 underline font-medium ml-1">
                  こちらからリセット
                </Link>
                してください。
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* ソーシャルログインボタン */}
          <div className="flex justify-center">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white border-2 border-gray-300 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">Google</span>
            </button>
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">またはメールアドレスでログイン</span>
            </div>
          </div>

          {/* メールアドレスログインフォーム */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="example@garagelog.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="パスワードを入力"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ログイン中...
                </>
              ) : (
                <>
                  ログイン
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* 下部リンク */}
          <div className="text-center space-y-2">
            <Link
              href="/reset-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              パスワードをお忘れの方はこちら
            </Link>
            <div>
              <Link
                href="/signup"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                新規登録はこちら
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

