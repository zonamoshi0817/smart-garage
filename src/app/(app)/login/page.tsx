"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
    if (isLoading) return;
    try {
      setIsLoading(true);
      setError(null);
      await loginWithGoogle();
      router.push("/home");
    } catch (error: any) {
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.toString() || "不明なエラー";
      if (errorCode === "auth/popup-closed-by-user") { setError(null); return; }
      let msg = "Googleでログインに失敗しました";
      if (errorCode === "auth/missing-or-invalid-nonce") msg = "認証処理が重複しました。ページをリロードしてから再度お試しください。";
      else if (errorMessage.includes("popup") || errorMessage.includes("blocked")) msg = "ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。";
      setError(msg);
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
      if (!email || !password) { setError("メールアドレスとパスワードを入力してください"); return; }
      await loginWithEmail(email, password);
      router.push("/home");
    } catch (error: any) {
      const errorCode = error?.code;
      let msg = "ログインに失敗しました";
      if (errorCode === "auth/invalid-credential") { msg = "メールアドレスまたはパスワードが正しくありません"; setIsInvalidCredential(true); }
      else if (errorCode === "auth/user-not-found") msg = "このメールアドレスは登録されていません";
      else if (errorCode === "auth/wrong-password") { msg = "パスワードが正しくありません"; setIsInvalidCredential(true); }
      else if (errorCode === "auth/invalid-email") msg = "メールアドレスの形式が正しくありません";
      else if (errorCode === "auth/user-disabled") msg = "このアカウントは無効化されています";
      else if (errorCode === "auth/too-many-requests") msg = "ログイン試行回数が多すぎます。しばらく待ってから再度お試しください";
      else if (error?.message) msg = error.message;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap');
        .auth-root {
          min-height: 100vh;
          background: #f7f5f0;
          display: flex;
          flex-direction: column;
          font-family: 'Noto Sans JP', sans-serif;
          font-weight: 300;
        }
        .auth-nav {
          padding: 1.25rem 2.5rem;
          border-bottom: 0.5px solid rgba(0,0,0,0.08);
          background: rgba(247,245,240,0.95);
        }
        .auth-logo {
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
          letter-spacing: 0.12em;
          color: #1a1a18;
          text-decoration: none;
        }
        .auth-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border: 0.5px solid rgba(0,0,0,0.1);
          padding: 2.5rem;
        }
        .auth-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3rem;
          letter-spacing: 0.05em;
          color: #1a1a18;
          line-height: 1;
          margin-bottom: 0.5rem;
        }
        .auth-sub {
          font-family: 'Space Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.15em;
          color: #a0a098;
          text-transform: uppercase;
          margin-bottom: 2rem;
        }
        .auth-error {
          background: rgba(192,64,32,0.06);
          border: 0.5px solid rgba(192,64,32,0.3);
          padding: 0.85rem 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.8rem;
          color: #c04020;
          line-height: 1.5;
        }
        .auth-error a { color: #1a1a18; text-decoration: underline; }
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: #f2f0eb;
          border: 0.5px solid rgba(0,0,0,0.12);
          color: #1a1a18;
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          margin-bottom: 1.75rem;
        }
        .google-btn:hover { background: #e8e6e0; border-color: rgba(0,0,0,0.2); }
        .google-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          height: 0.5px;
          background: rgba(0,0,0,0.08);
        }
        .auth-divider span {
          font-family: 'Space Mono', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.12em;
          color: #a0a098;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .auth-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #6a6a60;
          display: block;
          margin-bottom: 0.5rem;
        }
        .auth-input {
          width: 100%;
          background: #f7f5f0;
          border: 0.5px solid rgba(0,0,0,0.12);
          color: #1a1a18;
          padding: 0.75rem 1rem;
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 1.25rem;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: #a0a098; }
        .auth-input:focus { border-color: rgba(0,0,0,0.4); }
        .auth-submit {
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .auth-submit:hover { background: #333330; transform: translateY(-1px); }
        .auth-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .auth-links {
          margin-top: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: center;
        }
        .auth-links a {
          font-family: 'Space Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          color: #6a6a60;
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .auth-links a:hover { color: #1a1a18; }
        .spinner {
          width: 14px; height: 14px;
          border: 1.5px solid rgba(247,245,240,0.3);
          border-top-color: #f7f5f0;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-root">
        <nav className="auth-nav">
          <Link href="/" className="auth-logo">GARAGE_LOG</Link>
        </nav>

        <div className="auth-body">
          <div className="auth-card">
            <h1 className="auth-heading">Login</h1>
            <p className="auth-sub">Vehicle History Platform</p>

            {error && (
              <div className="auth-error">
                {error}
                {isInvalidCredential && (
                  <> — <Link href="/reset-password">パスワードをリセット</Link></>
                )}
              </div>
            )}

            {/* Google */}
            <button onClick={handleGoogleLogin} disabled={isLoading} className="google-btn">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google でログイン
            </button>

            <div className="auth-divider"><span>or</span></div>

            {/* Email form */}
            <form onSubmit={handleEmailLogin}>
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="auth-input" placeholder="example@garagelog.jp"
              />
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="auth-input" placeholder="••••••••"
              />
              <button type="submit" disabled={isLoading} className="auth-submit">
                {isLoading ? <><div className="spinner" /> Logging in...</> : 'ログイン →'}
              </button>
            </form>

            <div className="auth-links">
              <Link href="/reset-password">パスワードをお忘れの方</Link>
              <Link href="/signup">新規登録はこちら</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
