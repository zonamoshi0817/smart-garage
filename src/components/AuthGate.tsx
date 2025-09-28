"use client";
import { useEffect, useState } from "react";
import { loginWithGoogle, logout, watchAuth } from "@/lib/firebase";
import type { User } from "firebase/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState<boolean>(false); // 型を明示

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    try {
      const unsub = watchAuth((u) => {
        console.log("Auth state changed:", u ? "logged in" : "logged out");
        setUser(u);
        setReady(true);
      });
      
      // 2秒後にタイムアウトして強制的にreadyにする
      timeoutId = setTimeout(() => {
        console.warn("Auth state check timed out, proceeding without authentication");
        setReady(true);
      }, 2000);
      
      return () => {
        unsub(); // cleanup
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Auth initialization failed:", error);
      // エラーの場合もreadyにする
      setReady(true);
    }
  }, []);

  if (!ready) return <div className="p-6">読み込み中…</div>;

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="bg-white rounded-2xl border p-8 text-center">
          <h1 className="text-2xl font-bold">Smart Garage</h1>
          <p className="mt-2 text-gray-600">Googleでログインして始めましょう</p>
          <button
            className="mt-6 rounded-xl bg-blue-600 text-white px-5 py-3 font-medium hover:bg-blue-500"
            onClick={() => loginWithGoogle()}
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed right-4 top-4 z-50">
        <button
          className="rounded-xl border px-4 py-2 text-sm bg-white hover:bg-gray-50"
          onClick={() => logout()}
        >
          ログアウト
        </button>
      </div>
      {children}
    </div>
  );
}
