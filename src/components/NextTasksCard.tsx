import React from 'react';

interface NextTasksCardProps {
  reminders: any[];
  onTaskClick?: (reminder: any) => void;
  className?: string;
}

export default function NextTasksCard({ 
  reminders, 
  onTaskClick,
  className = ""
}: NextTasksCardProps) {
  // 優先度順にソートして上位3件を表示
  const upcomingTasks = reminders
    .filter(reminder => !reminder.isDone)
    .sort((a, b) => {
      // 優先度: 超過 > 期限接近 > 余裕
      const aPriority = getReminderPriority(a);
      const bPriority = getReminderPriority(b);
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // 高い優先度を先に
      }
      
      // 同じ優先度なら期限が近い順
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);

  if (upcomingTasks.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">次にやること</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500">すべて完了しています！</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">次にやること</h3>
      
      <div className="space-y-4">
        {upcomingTasks.map((reminder) => {
          const daysUntil = getDaysUntilDue(reminder.dueDate);
          const kmUntil = getKmUntilDue(reminder);
          const priority = getReminderPriority(reminder);
          
          return (
            <TaskItem
              key={reminder.id}
              reminder={reminder}
              daysUntil={daysUntil}
              kmUntil={kmUntil}
              priority={priority}
              onClick={() => onTaskClick?.(reminder)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TaskItemProps {
  reminder: any;
  daysUntil: number;
  kmUntil: number | null;
  priority: number;
  onClick: () => void;
}

function TaskItem({ reminder, daysUntil, kmUntil, priority, onClick }: TaskItemProps) {
  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'text-red-600 bg-red-50 border-red-200'; // 超過
    if (priority >= 2) return 'text-amber-600 bg-amber-50 border-amber-200'; // 期限接近
    return 'text-blue-600 bg-blue-50 border-blue-200'; // 余裕
  };

  const getProgressBarColor = (priority: number) => {
    if (priority >= 3) return 'bg-red-500'; // 超過
    if (priority >= 2) return 'bg-amber-500'; // 期限接近
    return 'bg-blue-500'; // 余裕
  };

  const getProgressPercentage = () => {
    if (!reminder.intervalDays && !reminder.intervalKm) return 100;
    
    // 日数ベースの進捗
    if (reminder.intervalDays && daysUntil > 0) {
      const totalDays = reminder.intervalDays;
      const remainingDays = Math.max(0, daysUntil);
      return Math.max(0, Math.min(100, ((totalDays - remainingDays) / totalDays) * 100));
    }
    
    // 距離ベースの進捗
    if (reminder.intervalKm && kmUntil && kmUntil > 0) {
      const totalKm = reminder.intervalKm;
      const remainingKm = Math.max(0, kmUntil);
      return Math.max(0, Math.min(100, ((totalKm - remainingKm) / totalKm) * 100));
    }
    
    return 100;
  };

  const formatRemaining = () => {
    const parts = [];
    
    if (kmUntil !== null && kmUntil !== undefined) {
      parts.push(`残り${kmUntil.toLocaleString()}km`);
    }
    
    if (daysUntil > 0) {
      parts.push(`残り${daysUntil}日`);
    } else if (daysUntil === 0) {
      parts.push('今日期限');
    } else {
      parts.push(`${Math.abs(daysUntil)}日超過`);
    }
    
    return parts.join(' / ');
  };

  const priorityColor = getPriorityColor(priority);
  const progressColor = getProgressBarColor(priority);
  const progressPercentage = getProgressPercentage();

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${priorityColor}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900">{reminder.title}</h4>
        <span className="text-xs px-2 py-1 rounded-full bg-white/80 text-gray-600">
          {formatRemaining()}
        </span>
      </div>
      
      {/* 進捗バー */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* 詳細情報 */}
      <div className="text-sm text-gray-600">
        {reminder.description && (
          <p className="mb-1">{reminder.description}</p>
        )}
        {reminder.carId && (
          <p className="text-xs opacity-75">車両ID: {reminder.carId}</p>
        )}
      </div>
    </div>
  );
}

// ヘルパー関数（reminders.tsからインポートされる想定）
function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getKmUntilDue(reminder: any): number | null {
  // この実装は実際のビジネスロジックに依存します
  // 仮の実装として null を返します
  return null;
}

function getReminderPriority(reminder: any): number {
  const daysUntil = getDaysUntilDue(reminder.dueDate);
  
  if (daysUntil < 0) return 3; // 超過
  if (daysUntil <= 7) return 2; // 期限接近（1週間以内）
  return 1; // 余裕
}
