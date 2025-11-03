// src/lib/adTracking.ts
"use client";

/**
 * 広告トラッキング（個人特定情報と分離）
 * プライバシーに配慮した匿名トラッキング
 */

interface AdImpressionEvent {
  adSlot: string;
  timestamp: number;
  sessionId: string;
  // 個人情報は含まない
}

interface AdClickEvent extends AdImpressionEvent {
  destinationUrl: string;
}

// セッションID（ブラウザセッションごとにユニーク、個人特定不可）
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    // ランダムなセッションIDを生成（個人特定情報なし）
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

/**
 * 広告インプレッション（表示）をトラッキング
 */
export function trackAdImpression(adSlot: string) {
  const event: AdImpressionEvent = {
    adSlot,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === "development") {
    console.log("Ad Impression:", event);
  }

  // 本番環境では匿名化された分析サービスに送信
  // 例: Google Analytics (匿名化IP有効)、Plausible、Fathomなど
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "ad_impression", {
      event_category: "advertising",
      event_label: adSlot,
      non_interaction: true,
    });
  }
}

/**
 * 広告クリックをトラッキング
 */
export function trackAdClick(adSlot: string, destinationUrl: string) {
  const event: AdClickEvent = {
    adSlot,
    destinationUrl,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === "development") {
    console.log("Ad Click:", event);
  }

  // 本番環境では匿名化された分析サービスに送信
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "ad_click", {
      event_category: "advertising",
      event_label: adSlot,
      value: destinationUrl,
    });
  }
}

/**
 * 広告表示頻度を制限するためのローカルストレージ管理
 */
export class AdFrequencyManager {
  private static readonly STORAGE_KEY = "ad_frequency";
  private static readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24時間

  /**
   * 広告表示回数を記録
   */
  static recordImpression(adSlot: string) {
    const data = this.getData();
    const now = Date.now();

    if (!data[adSlot]) {
      data[adSlot] = { count: 0, lastShown: now };
    }

    data[adSlot].count++;
    data[adSlot].lastShown = now;

    this.saveData(data);
  }

  /**
   * 広告を表示すべきか判定
   */
  static shouldShowAd(adSlot: string, maxPerDay: number = 10): boolean {
    const data = this.getData();
    const now = Date.now();

    if (!data[adSlot]) {
      return true;
    }

    // 24時間経過していればリセット
    if (now - data[adSlot].lastShown > this.MAX_AGE_MS) {
      delete data[adSlot];
      this.saveData(data);
      return true;
    }

    // 最大表示回数を超えていないか確認
    return data[adSlot].count < maxPerDay;
  }

  /**
   * データを取得
   */
  private static getData(): Record<string, { count: number; lastShown: number }> {
    if (typeof window === "undefined") return {};

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * データを保存
   */
  private static saveData(data: Record<string, { count: number; lastShown: number }>) {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save ad frequency data:", error);
    }
  }

  /**
   * データをクリア
   */
  static clearData() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// グローバル型定義（Google Analytics用）
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, any>
    ) => void;
  }
}

