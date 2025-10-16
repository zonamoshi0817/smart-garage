import React from 'react';

// 基本的なスケルトンコンポーネント
export function SkeletonBox({ 
  className = "",
  height = "h-4",
  width = "w-full"
}: {
  className?: string;
  height?: string;
  width?: string;
}) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${height} ${width} ${className}`} />
  );
}

// 車両カードのスケルトン
export function CarCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <SkeletonBox height="h-6" width="w-3/4" className="mb-2" />
          <SkeletonBox height="h-4" width="w-1/2" className="mb-1" />
          <SkeletonBox height="h-4" width="w-1/3" />
        </div>
        <div className="flex space-x-2">
          <SkeletonBox height="h-5" width="w-5" className="rounded" />
          <SkeletonBox height="h-5" width="w-5" className="rounded" />
        </div>
      </div>
      
      {/* 画像スケルトン */}
      <SkeletonBox height="h-32" width="w-full" className="rounded-lg mb-4" />
      
      {/* 情報スケルトン */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonBox height="h-4" width="w-20" />
          <SkeletonBox height="h-4" width="w-16" />
        </div>
        <div className="flex justify-between">
          <SkeletonBox height="h-4" width="w-16" />
          <SkeletonBox height="h-4" width="w-24" />
        </div>
        <div className="flex justify-between">
          <SkeletonBox height="h-4" width="w-20" />
          <SkeletonBox height="h-4" width="w-12" />
        </div>
      </div>
    </div>
  );
}

// 次のやることカードのスケルトン
export function NextTasksSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <SkeletonBox height="h-6" width="w-32" className="mb-4" />
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <SkeletonBox height="h-5" width="w-40" />
              <SkeletonBox height="h-4" width="w-24" className="rounded-full" />
            </div>
            
            {/* 進捗バー */}
            <SkeletonBox height="h-2" width="w-full" className="rounded-full mb-2" />
            
            <div className="space-y-1">
              <SkeletonBox height="h-3" width="w-3/4" />
              <SkeletonBox height="h-3" width="w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 履歴アイテムのスケルトン
export function HistoryItemSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        {/* アイコン */}
        <SkeletonBox height="h-10" width="w-10" className="rounded-lg" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <SkeletonBox height="h-5" width="w-48" />
            <SkeletonBox height="h-4" width="w-4" className="rounded" />
          </div>
          
          <div className="flex items-center space-x-4 mb-2">
            <SkeletonBox height="h-3" width="w-16" />
            <SkeletonBox height="h-3" width="w-20" />
            <SkeletonBox height="h-3" width="w-16" />
          </div>
          
          <div className="flex items-center space-x-3">
            <SkeletonBox height="h-4" width="w-20" className="rounded-full" />
            <SkeletonBox height="h-3" width="w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 給油ログカードのスケルトン
export function FuelLogCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBox height="h-6" width="w-32" />
        <SkeletonBox height="h-8" width="w-20" className="rounded" />
      </div>
      
      {/* チャートエリア */}
      <SkeletonBox height="h-48" width="w-full" className="rounded mb-4" />
      
      {/* 統計情報 */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <SkeletonBox height="h-8" width="w-16" className="mx-auto mb-1" />
            <SkeletonBox height="h-4" width="w-20" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ステータスカードのスケルトン
export function StatusCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBox height="h-5" width="w-24" />
        <SkeletonBox height="h-6" width="w-6" className="rounded-full" />
      </div>
      
      <SkeletonBox height="h-8" width="w-32" className="mb-2" />
      <SkeletonBox height="h-4" width="w-20" />
    </div>
  );
}

// リストのスケルトン
export function ListSkeleton({ 
  items = 5,
  className = ""
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <SkeletonBox height="h-8" width="w-8" className="rounded-full" />
            <div className="flex-1">
              <SkeletonBox height="h-5" width="w-3/4" className="mb-2" />
              <SkeletonBox height="h-4" width="w-1/2" />
            </div>
            <SkeletonBox height="h-6" width="w-16" className="rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// テーブルのスケルトン
export function TableSkeleton({ 
  rows = 5,
  columns = 4,
  className = ""
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`bg-white shadow overflow-hidden sm:rounded-md ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBox key={i} height="h-4" width="w-20" />
          ))}
        </div>
      </div>
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-200">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBox key={colIndex} height="h-4" width="w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// グラフのスケルトン
export function ChartSkeleton({ 
  height = "h-64",
  className = ""
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonBox height="h-6" width="w-32" />
        <div className="flex space-x-2">
          <SkeletonBox height="h-6" width="w-16" className="rounded" />
          <SkeletonBox height="h-6" width="w-16" className="rounded" />
        </div>
      </div>
      
      <SkeletonBox height={height} width="w-full" className="rounded" />
    </div>
  );
}

