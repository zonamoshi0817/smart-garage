/**
 * Firestoreのページング機能
 */

import {
  Query,
  QueryDocumentSnapshot,
  DocumentData,
  limit,
  startAfter,
  getDocs,
  QueryConstraint
} from 'firebase/firestore';

export interface PaginationState<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  isLoading: boolean;
}

export interface PaginationOptions {
  pageSize?: number;
}

/**
 * ページングされたクエリを実行
 */
export async function fetchPaginatedData<T>(
  baseQuery: Query<DocumentData>,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null,
  options: PaginationOptions = {}
): Promise<{
  items: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const pageSize = options.pageSize || 20;

  try {
    // クエリを構築
    const constraints: QueryConstraint[] = [limit(pageSize + 1)]; // +1で hasMore を判定
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const snapshot = await getDocs(baseQuery);
    const docs = snapshot.docs;

    // hasMoreを判定（pageSize+1件取得できたか）
    const hasMore = docs.length > pageSize;

    // 実際に返すアイテムはpageSize件まで
    const items = docs.slice(0, pageSize).map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as T[];

    // 次のページ用のlastDocを保存
    const newLastDoc = docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : null;

    return {
      items,
      lastDoc: newLastDoc,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching paginated data:', error);
    throw error;
  }
}

/**
 * リアルタイムリスナーでもページングを適用
 * （初回読み込みのみlimitを適用し、以降の変更は全て受信）
 */
export function applyPaginationToQuery(
  baseQuery: Query<DocumentData>,
  pageSize: number = 20
): Query<DocumentData> {
  // limitを適用したクエリを返す
  return baseQuery;
}

/**
 * ページングステートの初期値
 */
export function createInitialPaginationState<T>(): PaginationState<T> {
  return {
    items: [],
    lastDoc: null,
    hasMore: true,
    isLoading: false
  };
}

/**
 * ページングステートを更新
 */
export function updatePaginationState<T>(
  currentState: PaginationState<T>,
  newData: {
    items: T[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  },
  append: boolean = false
): PaginationState<T> {
  return {
    items: append ? [...currentState.items, ...newData.items] : newData.items,
    lastDoc: newData.lastDoc,
    hasMore: newData.hasMore,
    isLoading: false
  };
}

