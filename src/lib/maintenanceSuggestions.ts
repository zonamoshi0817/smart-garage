// src/lib/maintenanceSuggestions.ts
"use client";

import { Car, MaintenanceRecord } from '@/types';
import { Timestamp } from 'firebase/firestore';

/**
 * メンテナンスサイクル定義
 */
export interface MaintenanceCycle {
  km?: number;      // 距離インターバル（km）
  months?: number;  // 時間インターバル（月）
}

/**
 * メンテナンスアイテム定義
 */
export interface MaintenanceItemConfig {
  id: string;
  title: string;
  icon: string;
  cycle: MaintenanceCycle;
  searchKeywords: string[];  // 履歴から該当するメンテを探すキーワード
  templateId: string;        // テンプレートID
}

/**
 * ベースラインメンテナンススケジュール
 * オイル 5,000km/6ヶ月、エレメント 10,000km/12ヶ月、タイロテ 10,000km/12ヶ月、
 * ブレーキフルード 24ヶ月、エアフィルター 30,000km/24ヶ月、ワイパー 12ヶ月
 */
export const MAINTENANCE_ITEMS: MaintenanceItemConfig[] = [
  {
    id: 'oil',
    title: 'エンジンオイル交換',
    icon: '🛢️',
    cycle: { km: 5000, months: 6 },
    searchKeywords: ['オイル', 'oil'],
    templateId: 'oil'
  },
  {
    id: 'oil-filter',
    title: 'オイルフィルター交換',
    icon: '🔧',
    cycle: { km: 10000, months: 12 },
    searchKeywords: ['オイルフィルター', 'エレメント', 'filter', 'element'],
    templateId: 'oil-filter'
  },
  {
    id: 'tire-rotation',
    title: 'タイヤローテーション',
    icon: '🔄',
    cycle: { km: 10000, months: 12 },
    searchKeywords: ['タイヤ', 'ローテ', 'tire', 'rotation'],
    templateId: 'tire-rotation'
  },
  {
    id: 'brake-fluid',
    title: 'ブレーキフルード交換',
    icon: '🛑',
    cycle: { months: 24 },
    searchKeywords: ['ブレーキフルード', 'ブレーキオイル', 'brake fluid'],
    templateId: 'brake-fluid'
  },
  {
    id: 'air-filter',
    title: 'エアフィルター交換',
    icon: '💨',
    cycle: { km: 30000, months: 24 },
    searchKeywords: ['エアフィルター', 'エアクリーナー', 'air filter', 'air cleaner'],
    templateId: 'air-filter'
  },
  {
    id: 'wiper',
    title: 'ワイパーゴム交換',
    icon: '🌧️',
    cycle: { months: 12 },
    searchKeywords: ['ワイパー', 'wiper'],
    templateId: 'wiper'
  }
];

/**
 * データモードの判定結果
 */
export type DataMode = 'high' | 'medium' | 'low';

/**
 * 期限情報
 */
export interface DueInfo {
  remainKm: number;      // 残り距離（km）、データなしはInfinity
  remainDays: number;    // 残り日数
  daysToDue: number;     // 期限までの日数（距離と時間の近い方）
  isOverdue: boolean;    // 期限超過フラグ
  dueDate: Date;         // 期限日（時間ベース）
  dueKm: number;         // 期限走行距離（距離ベース）、データなしはInfinity
}

/**
 * メンテナンス提案
 */
export interface MaintenanceSuggestion {
  id: string;
  title: string;
  icon: string;
  templateId: string;
  dueInfo: DueInfo;
  score: number;          // 緊急度スコア（0-100）
  status: 'critical' | 'soon' | 'upcoming' | 'ok';
  confidence: DataMode;   // 信頼度（high/medium/low）
  message: string;        // ユーザー向けメッセージ
}

/**
 * Timestampをミリ秒に変換するヘルパー
 */
function toMillis(timestamp: Timestamp | Date | number | undefined | null): number {
  if (!timestamp) return Date.now();
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return timestamp.toMillis();
  }
  return Date.now();
}

/**
 * 月を加算
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 日数の差分を計算
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 値を範囲内にクランプ
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 車の開始日を取得（履歴なしのフォールバック用）
 */
function getCarStartDate(car: Car): Date {
  // 初回登録年月がある場合
  if (car.firstRegYm) {
    const [year, month] = car.firstRegYm.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }
  // 年式がある場合
  if (car.year) {
    return new Date(car.year, 0, 1);
  }
  // createdAtがある場合
  if (car.createdAt) {
    return new Date(toMillis(car.createdAt));
  }
  // フォールバック
  return new Date();
}

/**
 * 最終メンテナンス記録を取得
 */
function getLastMaintenance(
  records: MaintenanceRecord[],
  keywords: string[]
): MaintenanceRecord | null {
  const filtered = records.filter(record => 
    keywords.some(keyword => 
      record.title.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  
  if (filtered.length === 0) return null;
  
  // 日付でソート（降順）
  const sorted = filtered.sort((a, b) => toMillis(b.date) - toMillis(a.date));
  return sorted[0];
}

/**
 * 次回期限を計算
 */
export function calculateNextDue({
  lastOdo,
  lastDate,
  cycle,
  currentOdo,
  avgKmPerMonth,
  fallbackStartDate
}: {
  lastOdo?: number;
  lastDate?: Date;
  cycle: MaintenanceCycle;
  currentOdo?: number;
  avgKmPerMonth?: number;
  fallbackStartDate: Date;
}): DueInfo {
  const startDate = lastDate ?? fallbackStartDate;
  const today = new Date();

  // 距離側の計算
  let remainKm = Infinity;
  let dueKm = Infinity;
  
  if (cycle.km && lastOdo !== undefined && currentOdo !== undefined && currentOdo >= lastOdo) {
    dueKm = lastOdo + cycle.km;
    remainKm = dueKm - currentOdo;
  } else if (cycle.km && currentOdo !== undefined && lastOdo === undefined) {
    // 履歴なし、ODOあり：走行距離をサイクルで割った余りから計算
    const cyclesCompleted = Math.floor(currentOdo / cycle.km);
    dueKm = (cyclesCompleted + 1) * cycle.km;
    remainKm = dueKm - currentOdo;
  }

  // 時間側の計算
  const dueDate = cycle.months ? addMonths(startDate, cycle.months) : new Date(9999, 11, 31);
  const remainDays = daysBetween(today, dueDate);

  // 残り日数の推定（距離側を日換算）
  let kmToDays = Infinity;
  if (remainKm !== Infinity && avgKmPerMonth && avgKmPerMonth > 0) {
    kmToDays = Math.round((remainKm / avgKmPerMonth) * 30);
  }

  // 期限決定（近い方）
  const daysToDue = Math.min(remainDays, kmToDays);
  const isOverdue = daysToDue < 0 || remainKm < 0;

  return {
    remainKm: remainKm === Infinity ? Infinity : Math.max(0, remainKm),
    remainDays: Math.max(0, remainDays),
    daysToDue,
    isOverdue,
    dueDate,
    dueKm
  };
}

/**
 * 緊急度スコアを計算（0-100）
 */
export function calculateUrgencyScore(dueInfo: DueInfo, cycle: MaintenanceCycle): number {
  const { remainKm, remainDays, isOverdue } = dueInfo;

  // 距離の消化率
  let kmRatio = 0;
  if (cycle.km && remainKm !== Infinity) {
    kmRatio = clamp(1 - remainKm / cycle.km, 0, 1);
  }

  // 時間の消化率
  let timeRatio = 0;
  if (cycle.months) {
    const totalDays = cycle.months * 30;
    timeRatio = clamp(1 - remainDays / totalDays, 0, 1);
  }

  // 早い方に寄せる
  const progress = Math.max(kmRatio, timeRatio);

  // 期限超過ボーナス
  const overPenalty = isOverdue ? 0.25 : 0;

  return Math.round((progress + overPenalty) * 100);
}

/**
 * ステータスバッジを決定
 */
export function determineStatus(
  dueInfo: DueInfo,
  score: number
): 'critical' | 'soon' | 'upcoming' | 'ok' {
  const { isOverdue, remainKm, remainDays } = dueInfo;

  // 🔴 緊急：期限超過 or 残り≤500km / ≤30日
  if (isOverdue || remainKm <= 500 || remainDays <= 30) {
    return 'critical';
  }

  // 🟠 まもなく：スコア≥85%
  if (score >= 85) {
    return 'soon';
  }

  // 🟡 近日：スコア≥70%
  if (score >= 70) {
    return 'upcoming';
  }

  // 🟢 余裕あり
  return 'ok';
}

/**
 * データモード（信頼度）を判定
 */
export function determineDataMode(
  hasHistory: boolean,
  hasOdo: boolean
): DataMode {
  if (hasHistory && hasOdo) return 'high';
  if (hasHistory) return 'medium';
  return 'low';
}

/**
 * ユーザー向けメッセージを生成
 */
export function generateMessage(
  dueInfo: DueInfo,
  status: 'critical' | 'soon' | 'upcoming' | 'ok',
  confidence: DataMode
): string {
  const { remainKm, remainDays, isOverdue } = dueInfo;

  let message = '';

  if (isOverdue) {
    message = '期限超過です。できるだけ早く実施してください。';
  } else if (status === 'critical') {
    if (remainKm !== Infinity && remainKm <= 500) {
      message = `あと約${Math.round(remainKm)}kmです。`;
    } else if (remainDays <= 30) {
      message = `あと約${remainDays}日です。`;
    }
  } else if (status === 'soon') {
    if (remainKm !== Infinity && remainDays !== Infinity) {
      message = `あと約${Math.round(remainKm)}km / ${remainDays}日`;
    } else if (remainKm !== Infinity) {
      message = `あと約${Math.round(remainKm)}km`;
    } else {
      message = `あと約${remainDays}日`;
    }
  } else {
    if (remainKm !== Infinity && remainDays !== Infinity) {
      message = `あと約${Math.round(remainKm)}km / ${remainDays}日`;
    } else if (remainKm !== Infinity) {
      message = `あと約${Math.round(remainKm)}km`;
    } else {
      message = `あと約${remainDays}日`;
    }
  }

  // 信頼度の注記
  if (confidence === 'low') {
    message += ' （推定：履歴なし）';
  } else if (confidence === 'medium') {
    message += ' （推定：ODO未登録）';
  }

  return message;
}

/**
 * メンテナンス提案を生成
 */
export function generateMaintenanceSuggestions(
  car: Car,
  maintenanceRecords: MaintenanceRecord[]
): MaintenanceSuggestion[] {
  const suggestions: MaintenanceSuggestion[] = [];
  const currentOdo = car.odoKm;
  const avgKmPerMonth = car.avgKmPerMonth;
  const fallbackStartDate = getCarStartDate(car);

  for (const item of MAINTENANCE_ITEMS) {
    // 最終メンテナンス記録を取得
    const lastMaintenance = getLastMaintenance(maintenanceRecords, item.searchKeywords);
    
    const lastOdo = lastMaintenance?.mileage;
    const lastDate = lastMaintenance ? new Date(toMillis(lastMaintenance.date)) : undefined;

    // データモード判定
    const hasHistory = !!lastMaintenance;
    const hasOdo = currentOdo !== undefined && currentOdo > 0;
    const confidence = determineDataMode(hasHistory, hasOdo);

    // 期限計算
    const dueInfo = calculateNextDue({
      lastOdo,
      lastDate,
      cycle: item.cycle,
      currentOdo,
      avgKmPerMonth,
      fallbackStartDate
    });

    // スコア計算
    const score = calculateUrgencyScore(dueInfo, item.cycle);

    // ステータス判定
    const status = determineStatus(dueInfo, score);

    // メッセージ生成
    const message = generateMessage(dueInfo, status, confidence);

    // 提案を追加（すべての項目を表示）
    // 履歴がある項目は必ず表示、履歴がない項目は除外
    if (hasHistory || status !== 'ok') {
      suggestions.push({
        id: item.id,
        title: item.title,
        icon: item.icon,
        templateId: item.templateId,
        dueInfo,
        score,
        status,
        confidence,
        message
      });
    }
  }

  // スコアの高い順にソート
  return suggestions.sort((a, b) => b.score - a.score);
}

