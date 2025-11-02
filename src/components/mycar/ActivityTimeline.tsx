'use client';

import { MaintenanceRecord, FuelLog, Customization, InsurancePolicy } from '@/types';
import { useState } from 'react';
import { toDate } from './utils';

interface TimelineItem {
  id: string;
  type: 'fuel' | 'maintenance' | 'customization' | 'insurance';
  date: Date;
  icon: string;
  title: string;
  description: string;
  cost?: number;
  onViewDetails: () => void;
  onDuplicate?: () => void;
}

interface ActivityTimelineProps {
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  insurancePolicies: InsurancePolicy[];
  onViewDetails: (type: string, id: string) => void;
  onDuplicate: (type: string, id: string) => void;
}

export default function ActivityTimeline({
  maintenanceRecords,
  fuelLogs,
  customizations,
  insurancePolicies,
  onViewDetails,
  onDuplicate
}: ActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  
  // すべてのアクティビティを統合してソート
  const getTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];
    
    // 給油ログを追加
    fuelLogs.forEach(log => {
      const date = toDate(log.date);
      if (date) {
        items.push({
          id: log.id!,
          type: 'fuel',
          date,
          icon: '⛽',
          title: '給油記録',
          description: `${log.quantity / 1000}L / ${log.totalCostJpy.toLocaleString()}円`,
          cost: log.totalCostJpy,
          onViewDetails: () => onViewDetails('fuel', log.id!),
          onDuplicate: () => onDuplicate('fuel', log.id!)
        });
      }
    });
    
    // メンテナンス記録を追加
    maintenanceRecords.forEach(record => {
      const date = toDate(record.date);
      if (date) {
        items.push({
          id: record.id!,
          type: 'maintenance',
          date,
          icon: '🔧',
          title: record.title,
          description: record.description || `${record.mileage?.toLocaleString()} km時点`,
          cost: record.cost,
          onViewDetails: () => onViewDetails('maintenance', record.id!),
          onDuplicate: () => onDuplicate('maintenance', record.id!)
        });
      }
    });
    
    // カスタマイズを追加
    customizations.forEach(custom => {
      const date = toDate(custom.date);
      if (date) {
        const totalCost = (custom.partsCostJpy || 0) + (custom.laborCostJpy || 0) + (custom.otherCostJpy || 0);
        items.push({
          id: custom.id!,
          type: 'customization',
          date,
          icon: '✨',
          title: custom.title,
          description: custom.brand ? `${custom.brand} ${custom.modelCode || ''}` : 'カスタム',
          cost: totalCost,
          onViewDetails: () => onViewDetails('customization', custom.id!),
          onDuplicate: () => onDuplicate('customization', custom.id!)
        });
      }
    });
    
    // 保険を追加（契約開始日のみ）
    insurancePolicies.forEach(policy => {
      const date = toDate(policy.startDate);
      if (date) {
        items.push({
          id: policy.id!,
          type: 'insurance',
          date,
          icon: '🛡️',
          title: '保険契約',
          description: `${policy.provider} / ${policy.premiumAmount.toLocaleString()}円`,
          cost: policy.premiumAmount,
          onViewDetails: () => onViewDetails('insurance', policy.id!)
        });
      }
    });
    
    // 日付でソート（新しい順）
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  };
  
  const allItems = getTimelineItems();
  
  // 今日から30日以内のアイテムのみフィルタ
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentItems = showAll 
    ? allItems 
    : allItems.filter(item => item.date >= thirtyDaysAgo).slice(0, 10);
  
  // 相対日付表示
  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  const getTypeColor = (type: TimelineItem['type']) => {
    switch (type) {
      case 'fuel':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'maintenance':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'customization':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'insurance':
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  if (recentItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📅</span>
          <span>直近の活動</span>
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>まだ活動記録がありません</p>
          <p className="text-sm mt-2">給油やメンテナンスを記録してみましょう</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📅</span>
        <span>直近の活動</span>
        <span className="text-sm font-normal text-gray-500">（過去30日）</span>
      </h2>
      
      <div className="space-y-2">
        {recentItems.map((item, index) => (
          <div
            key={`${item.type}-${item.id}-${index}`}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${getTypeColor(item.type)}`}
          >
            {/* アイコン */}
            <div className="flex-shrink-0 text-2xl">
              {item.icon}
            </div>
            
            {/* 情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{item.title}</span>
                <span className="text-xs text-gray-500">{formatRelativeDate(item.date)}</span>
              </div>
              <div className="text-xs text-gray-600 truncate">{item.description}</div>
              {item.cost !== undefined && (
                <div className="text-xs font-medium mt-1">
                  ¥{item.cost.toLocaleString()}
                </div>
              )}
            </div>
            
            {/* アクションボタン */}
            <div className="flex-shrink-0 flex gap-2">
              <button
                onClick={item.onViewDetails}
                className="px-3 py-1 text-xs font-medium bg-white bg-opacity-50 hover:bg-opacity-100 rounded-md transition-all"
                title="明細を見る"
              >
                詳細
              </button>
              {item.onDuplicate && (
                <button
                  onClick={item.onDuplicate}
                  className="px-3 py-1 text-xs font-medium bg-white bg-opacity-50 hover:bg-opacity-100 rounded-md transition-all"
                  title="同じ作業を複製"
                >
                  複製
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!showAll && allItems.length > recentItems.length && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          さらに表示 ({allItems.length - recentItems.length}件)
        </button>
      )}
    </div>
  );
}

