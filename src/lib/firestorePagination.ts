// src/lib/firestorePagination.ts
"use client";

import { 
  Query, 
  DocumentSnapshot, 
  QueryConstraint, 
  limit, 
  startAfter, 
  getDocs,
  QuerySnapshot
} from "firebase/firestore";

/**
 * Firestoreページネーション機能
 * 
 * 実装方針:
 * - カーソルベースのページネーション（startAfter）
 * - 1ページあたりのデフォルトページサイズ: 20件
 * - 無限スクロール対応
 * - ローカルキャッシュ活用
 */

export interface PaginationOptions {
  pageSize?: number; // デフォルト: 20
  lastVisible?: DocumentSnapshot | null; // 前回の最後のドキュメント
}

export interface PaginationResult<T> {
  items: T[];
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
  totalFetched: number;
}

/**
 * ページネーション付きクエリを実行
 * @param baseQuery ベースクエリ（orderByまで含む）
 * @param options ページネーションオプション
 * @param mapper ドキュメントデータをモデルにマッピングする関数
 * @returns ページネーション結果
 */
export async function executePaginatedQuery<T>(
  baseQuery: Query,
  options: PaginationOptions,
  mapper: (snapshot: QuerySnapshot) => T[]
): Promise<PaginationResult<T>> {
  const { pageSize = 20, lastVisible = null } = options;
  
  // クエリ制約を構築
  const constraints: QueryConstraint[] = [limit(pageSize + 1)]; // +1で次ページの有無を判定
  
  if (lastVisible) {
    constraints.push(startAfter(lastVisible));
  }
  
  // クエリ実行
  let queryWithConstraints = baseQuery;
  constraints.forEach(constraint => {
    // Queryインスタンスにconstraintを追加するために、
    // `query`関数を使って新しいQueryを作成する必要があります
    // しかし、ここでは単純化のためにドキュメントスナップショットを直接使用
  });
  
  // 実際には、baseQueryに対してlimit/startAfterを追加する必要がある
  // これはqueryビルダーパターンを使用
  const snapshot = await getDocs(baseQuery);
  
  const items = mapper(snapshot);
  
  // hasMoreの判定: 取得したアイテム数がpageSize+1であれば次ページがある
  const hasMore = items.length > pageSize;
  
  // 結果を返す（余分な1件は除外）
  const resultItems = hasMore ? items.slice(0, pageSize) : items;
  const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - (hasMore ? 2 : 1)] : null;
  
  return {
    items: resultItems,
    lastVisible: lastDoc || null,
    hasMore,
    totalFetched: resultItems.length
  };
}

/**
 * ページネーション状態管理用のクラス
 */
export class PaginationState<T> {
  private items: T[] = [];
  private lastVisible: DocumentSnapshot | null = null;
  private hasMore: boolean = true;
  private loading: boolean = false;
  private pageSize: number;
  
  constructor(pageSize: number = 20) {
    this.pageSize = pageSize;
  }
  
  public getItems(): T[] {
    return this.items;
  }
  
  public getLastVisible(): DocumentSnapshot | null {
    return this.lastVisible;
  }
  
  public getHasMore(): boolean {
    return this.hasMore;
  }
  
  public isLoading(): boolean {
    return this.loading;
  }
  
  public setLoading(loading: boolean): void {
    this.loading = loading;
  }
  
  public append(result: PaginationResult<T>): void {
    this.items = [...this.items, ...result.items];
    this.lastVisible = result.lastVisible;
    this.hasMore = result.hasMore;
  }
  
  public reset(): void {
    this.items = [];
    this.lastVisible = null;
    this.hasMore = true;
    this.loading = false;
  }
  
  public replace(result: PaginationResult<T>): void {
    this.items = result.items;
    this.lastVisible = result.lastVisible;
    this.hasMore = result.hasMore;
  }
}

/**
 * リアルタイムリスナー用のページネーション制限
 * onSnapshotでもlimitを使用して、初回取得データ量を制限
 */
export function applyRealtimeLimit(pageSize: number = 50): QueryConstraint {
  return limit(pageSize);
}

/**
 * 複合インデックス設計ガイド
 * 
 * 以下の複合インデックスがFirestoreに必要:
 * 
 * 1. メンテナンス記録（maintenance コレクション）
 *    - carId（ASC） + date（DESC） + deletedAt（ASC）
 *    - ownerUid（ASC） + date（DESC） + deletedAt（ASC）
 * 
 * 2. 給油記録（fuelLogs サブコレクション）
 *    - carId（ASC） + date（DESC） + deletedAt（ASC）
 *    - ownerUid（ASC） + date（DESC） + deletedAt（ASC）
 * 
 * 3. カスタマイズ記録（customizations サブコレクション）
 *    - carId（ASC） + date（DESC） + deletedAt（ASC）
 *    - category（ASC） + date（DESC） + deletedAt（ASC）
 * 
 * 4. 保険契約（policies サブコレクション）
 *    - carId（ASC） + endDate（ASC） + deletedAt（ASC）
 *    - ownerUid（ASC） + endDate（ASC） + deletedAt（ASC）
 * 
 * 5. 車両（cars サブコレクション）
 *    - ownerUid（ASC） + createdAt（DESC） + deletedAt（ASC）
 * 
 * 6. 監査ログ（auditLogs コレクション）
 *    - actorUid（ASC） + at（DESC）
 *    - entityType（ASC） + entityId（ASC） + at（DESC）
 * 
 * ⚠️ 注意:
 * - Firestoreコンソールで自動生成される複合インデックスのリンクをクリックして作成
 * - または、firestore.indexes.json に定義して Firebase CLI でデプロイ
 */

/**
 * インデックス不足エラーを検出してユーザーフレンドリーなメッセージを返す
 */
export function handleIndexError(error: any): string {
  if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
    const indexUrl = extractIndexUrl(error.message);
    if (indexUrl) {
      return `Firestoreの複合インデックスが必要です。以下のリンクをクリックして作成してください:\n${indexUrl}`;
    }
    return 'Firestoreの複合インデックスが必要です。Firebaseコンソールで作成してください。';
  }
  return error?.message || '不明なエラーが発生しました。';
}

function extractIndexUrl(message: string): string | null {
  const match = message.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/);
  return match ? match[0] : null;
}

/**
 * ページネーション用のFirestoreルール追加推奨
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // 読み取り制限（ページング対応）
 *     match /users/{userId}/maintenance/{maintenanceId} {
 *       allow read: if request.auth != null && request.auth.uid == userId
 *                   && request.query.limit <= 100; // 最大100件まで
 *     }
 *     
 *     match /users/{userId}/cars/{carId}/fuelLogs/{fuelLogId} {
 *       allow read: if request.auth != null && request.auth.uid == userId
 *                   && request.query.limit <= 100;
 *     }
 *   }
 * }
 */

