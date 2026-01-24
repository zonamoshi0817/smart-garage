"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle, logout, watchAuth } from "@/lib/firebase";
import { setSentryUser, trackUserAction } from "@/lib/monitoring";
import type { User } from "firebase/auth";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState<boolean>(false); // 型を明示
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    console.log("AuthGate: Initializing authentication...");
    
    try {
      const unsub = watchAuth((u) => {
        console.log("AuthGate: Auth state changed:", u ? "logged in" : "logged out");
        setUser(u);
        setReady(true);
        clearTimeout(timeoutId);
        
        // Sentryにユーザー情報を設定
        setSentryUser(u);
        
        // ユーザーアクションを追跡
        if (u) {
          trackUserAction.login();
        } else {
          trackUserAction.logout();
        }
      });
      
      // 3秒後にタイムアウトして強制的にreadyにする
      timeoutId = setTimeout(() => {
        console.warn("AuthGate: Auth state check timed out, proceeding without authentication");
        setReady(true);
      }, 3000);
      
      return () => {
        console.log("AuthGate: Cleaning up auth listener");
        unsub(); // cleanup
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("AuthGate: Auth initialization failed:", error);
      // エラーの場合もreadyにする
      setReady(true);
    }
  }, []);

  if (!ready) return <div className="p-6">読み込み中…</div>;

  const handleLogin = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      // ログイン成功時はwatchAuthコールバックで自動的にSentryにユーザー設定される
    } catch (err) {
      console.error("Login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* ロゴ */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <Logo size="md" />
        </div>
        
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 text-center">
                ログインして始めましょう
              </h1>
              <p className="mt-4 text-sm text-slate-600 text-center">
                アカウントをお持ちでない方は新規登録、既にお持ちの方はログインしてください。
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={() => router.push('/signup')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-3 font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <UserPlus className="h-5 w-5" />
                新規登録
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-700 px-5 py-3 font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <LogIn className="h-5 w-5" />
                ログイン
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children}
    </div>
  );
}
