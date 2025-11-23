// src/components/common/ErrorBoundary.tsx
"use client";

import React, { Component, ReactNode } from "react";
import { captureError } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorMessage: string;
}

/**
 * エラーバウンダリーコンポーネント
 * React内でキャッチされないエラーを捕捉し、フォールバックUIを表示
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    // Errorオブジェクト、Eventオブジェクト、その他の型に対応
    let errorObj: Error | null = null;
    let errorMessage = '不明なエラーが発生しました';
    
    if (error instanceof Error) {
      errorObj = error;
      errorMessage = error.message || error.toString();
    } else if (error && typeof error === 'object') {
      // Eventオブジェクトやその他のオブジェクトの場合
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }
    
    console.error('ErrorBoundary caught error:', error);
    
    return { 
      hasError: true, 
      error: errorObj,
      errorMessage 
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Errorオブジェクトの場合のみSentryに送信
    if (error instanceof Error) {
      captureError(error, {
        errorInfo: errorInfo,
        componentStack: errorInfo.componentStack,
      });
    } else {
      // Eventオブジェクトやその他の型の場合もログに記録
      console.error("Non-Error object caught:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIがあればそれを表示
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">😵</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              エラーが発生しました
            </h1>
            <p className="text-gray-600 mb-6">
              申し訳ございません。予期しないエラーが発生しました。
            </p>
            
            {process.env.NODE_ENV === "development" && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm font-mono text-red-800 break-all">
                  {this.state.error ? this.state.error.toString() : this.state.errorMessage}
                </p>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                ページを再読み込み
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="px-6 py-3 bg-gray-200 text-gray-900 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary };
