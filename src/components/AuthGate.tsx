"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle, logout, watchAuth } from "@/lib/firebase";
import { setSentryUser, trackUserAction } from "@/lib/monitoring";
import type { User } from "firebase/auth";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";

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
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-400">garage log</h1>
          <p className="mt-2 text-gray-600">ログインして始めましょう</p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push('/signup')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-3 font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              <UserPlus className="h-5 w-5" />
              新規登録
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-gray-700 px-5 py-3 font-semibold border-2 border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <LogIn className="h-5 w-5" />
              ログイン
            </button>
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
