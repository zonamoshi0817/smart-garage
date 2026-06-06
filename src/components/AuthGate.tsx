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
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap');
          .gate-root {
            min-height: 100vh;
            background: #f7f5f0;
            display: flex;
            flex-direction: column;
            font-family: 'Noto Sans JP', sans-serif;
            font-weight: 300;
          }
          .gate-nav {
            padding: 1.25rem 2.5rem;
            border-bottom: 0.5px solid rgba(0,0,0,0.08);
          }
          .gate-logo {
            font-family: 'Space Mono', monospace;
            font-size: 0.85rem;
            letter-spacing: 0.12em;
            color: #1a1a18;
            text-decoration: none;
          }
          .gate-body {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
          }
          .gate-card {
            width: 100%;
            max-width: 400px;
            background: #ffffff;
            border: 0.5px solid rgba(0,0,0,0.1);
            padding: 2.5rem;
          }
          .gate-heading {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 3rem;
            letter-spacing: 0.05em;
            color: #1a1a18;
            line-height: 1;
            margin-bottom: 0.5rem;
          }
          .gate-sub {
            font-family: 'Space Mono', monospace;
            font-size: 0.62rem;
            letter-spacing: 0.15em;
            color: #a0a098;
            text-transform: uppercase;
            margin-bottom: 2rem;
          }
          .gate-error {
            background: rgba(192,64,32,0.06);
            border: 0.5px solid rgba(192,64,32,0.3);
            padding: 0.85rem 1rem;
            margin-bottom: 1.5rem;
            font-size: 0.8rem;
            color: #c04020;
          }
          .gate-btn-primary {
            width: 100%;
            padding: 0.85rem;
            background: #1a1a18;
            color: #f7f5f0;
            border: none;
            font-family: 'Space Mono', monospace;
            font-size: 0.75rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            cursor: pointer;
            transition: background 0.2s, transform 0.15s;
            margin-bottom: 0.75rem;
            display: block;
            text-align: center;
            text-decoration: none;
          }
          .gate-btn-primary:hover { background: #333330; transform: translateY(-1px); }
          .gate-btn-ghost {
            width: 100%;
            padding: 0.85rem;
            background: transparent;
            color: #6a6a60;
            border: 0.5px solid rgba(0,0,0,0.12);
            font-family: 'Space Mono', monospace;
            font-size: 0.75rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            cursor: pointer;
            transition: border-color 0.2s, color 0.2s;
            display: block;
            text-align: center;
            text-decoration: none;
          }
          .gate-btn-ghost:hover { border-color: rgba(0,0,0,0.3); color: #1a1a18; }
        `}</style>
        <div className="gate-root">
          <nav className="gate-nav">
            <a href="/" className="gate-logo">GARAGE_LOG</a>
          </nav>
          <div className="gate-body">
            <div className="gate-card">
              <h1 className="gate-heading">Welcome</h1>
              <p className="gate-sub">Vehicle History Platform</p>
              {error && <div className="gate-error">{error}</div>}
              <a href="/signup" className="gate-btn-primary">新規登録 →</a>
              <a href="/login" className="gate-btn-ghost">ログイン →</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div>
      {children}
    </div>
  );
}
