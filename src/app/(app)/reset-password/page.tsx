"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { resetPassword } from "@/lib/firebase";
import Link from "next/link";
import Logo from "@/components/common/Logo";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      
      if (!email) {
        setError("メールアドレスを入力してください");
        return;
      }

      await resetPassword(email);
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errorCode = error?.code;
      let errorMessage = "パスワードリセットメールの送信に失敗しました";
      
      if (errorCode === "auth/user-not-found") {
        errorMessage = "このメールアドレスは登録されていません";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "メールアドレスの形式が正しくありません";
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage = "リクエストが多すぎます。しばらく待ってから再度お試しください";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ロゴ */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <Logo size="md" />
      </div>
      
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-center">
              パスワードをリセット
            </h1>
            <p className="mt-4 text-sm text-gray-600 text-center">
              登録されているメールアドレスを入力してください。
              <br />
              パスワードリセット用のリンクを送信します。
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isSuccess ? (
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    メールを送信しました
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    {email} にパスワードリセット用のリンクを送信しました。
                    <br />
                    メール内のリンクをクリックして、新しいパスワードを設定してください。
                  </p>
                  <p className="text-xs text-green-600 mb-4">
                    ※ メールが届かない場合は、迷惑メールフォルダもご確認ください。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm"
                    >
                      ログインページに戻る
                    </Link>
                    <button
                      onClick={() => {
                        setEmail("");
                        setIsSuccess(false);
                        setError(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-green-700 font-semibold border-2 border-green-300 hover:bg-green-50 transition-colors text-sm"
                    >
                      別のメールアドレスで送信
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    送信中...
                  </>
                ) : (
                  <>
                    パスワードリセットメールを送信
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 下部リンク */}
          <div className="text-center space-y-2">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ログインページに戻る
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
