import React from 'react';

interface EmptyStateGuideProps {
  type: 'fuel' | 'maintenance' | 'insurance';
  onAction: () => void;
  className?: string;
}

export default function EmptyStateGuide({ 
  type, 
  onAction,
  className = ""
}: EmptyStateGuideProps) {
  
  const getContent = () => {
    switch (type) {
      case 'fuel':
        return {
          icon: '⛽',
          title: '最初の給油記録を追加しましょう',
          description: '最初の登録はレシート撮影でもOK。金額・給油量を自動抽出（β）',
          buttonText: '今すぐ記録',
          features: [
            '📸 レシート撮影で自動入力',
            '💰 金額・給油量の自動抽出',
            '📊 燃費の自動計算'
          ]
        };
      case 'maintenance':
        return {
          icon: '🔧',
          title: '最初のメンテナンス記録を追加しましょう',
          description: '車のメンテナンス履歴を記録して、適切なタイミングで次の作業を把握できます',
          buttonText: '記録を追加',
          features: [
            '📅 次回メンテナンスの自動予測',
            '🔔 期限前の通知機能',
            '📋 作業内容の詳細記録'
          ]
        };
      case 'insurance':
        return {
          icon: '🛡️',
          title: '保険情報を登録しましょう',
          description: '保険の期限管理と請求履歴を一元管理できます',
          buttonText: '保険を登録',
          features: [
            '⏰ 期限前の自動通知',
            '💰 保険料の管理',
            '📄 請求履歴の記録'
          ]
        };
      default:
        return {
          icon: '📝',
          title: 'データを追加しましょう',
          description: '新しい記録を追加して始めましょう',
          buttonText: '追加',
          features: []
        };
    }
  };

  const content = getContent();

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-gray-400 mb-4">
        <span className="text-6xl">{content.icon}</span>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {content.title}
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {content.description}
      </p>

      {/* 機能紹介 */}
      {content.features.length > 0 && (
        <div className="mb-6 max-w-md mx-auto">
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
            {content.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center space-x-2">
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <button
        onClick={onAction}
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-md"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {content.buttonText}
      </button>

      {/* ヒント */}
      {type === 'fuel' && (
        <div className="mt-4 text-xs text-gray-400">
          💡 レシートを撮影すると、金額と給油量が自動で入力されます
        </div>
      )}
    </div>
  );
}

// 特定の空状態用のコンポーネント（より詳細なガイダンス付き）
interface DetailedEmptyStateProps {
  type: 'first-car' | 'first-maintenance' | 'first-fuel';
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  className?: string;
}

export function DetailedEmptyState({ 
  type, 
  onPrimaryAction, 
  onSecondaryAction,
  className = ""
}: DetailedEmptyStateProps) {
  
  const getContent = () => {
    switch (type) {
      case 'first-car':
        return {
          icon: '🚗',
          title: 'Smart Garage へようこそ！',
          subtitle: 'まずは愛車を登録しましょう',
          description: '車両情報を登録することで、メンテナンスの自動リマインダーや燃費管理などの機能が利用できます。',
          primaryButton: '車両を登録',
          secondaryButton: 'デモを見る',
          steps: [
            '車両の基本情報を入力',
            '写真をアップロード',
            'メンテナンス履歴を設定'
          ]
        };
      case 'first-maintenance':
        return {
          icon: '🔧',
          title: 'メンテナンス履歴を記録しましょう',
          subtitle: '車の健康状態を把握する第一歩',
          description: '定期的なメンテナンス記録により、次回の作業タイミングを自動で予測し、適切な時期にお知らせします。',
          primaryButton: '記録を追加',
          secondaryButton: 'リマインダーを設定',
          steps: [
            '作業内容と日付を記録',
            '費用と作業場所を入力',
            '次回の予定を自動計算'
          ]
        };
      case 'first-fuel':
        return {
          icon: '⛽',
          title: '給油記録を始めましょう',
          subtitle: '燃費管理でお得な運転を',
          description: '給油記録を続けることで、燃費の変化を把握し、効率的な運転パターンを見つけることができます。',
          primaryButton: '給油を記録',
          secondaryButton: 'レシートを撮影',
          steps: [
            '給油量と金額を入力',
            '走行距離を記録',
            '燃費を自動計算'
          ]
        };
      default:
        return {
          icon: '📝',
          title: 'データを追加しましょう',
          subtitle: '',
          description: '新しい記録を追加して始めましょう',
          primaryButton: '追加',
          secondaryButton: undefined,
          steps: []
        };
    }
  };

  const content = getContent();

  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="text-gray-400 mb-6">
        <span className="text-8xl">{content.icon}</span>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {content.title}
      </h2>
      
      {content.subtitle && (
        <h3 className="text-lg font-medium text-gray-600 mb-4">
          {content.subtitle}
        </h3>
      )}
      
      <p className="text-gray-500 mb-8 max-w-lg mx-auto">
        {content.description}
      </p>

      {/* ステップ */}
      {content.steps.length > 0 && (
        <div className="mb-8 max-w-md mx-auto">
          <div className="space-y-3">
            {content.steps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onPrimaryAction}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {content.primaryButton}
        </button>
        
        {content.secondaryButton && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {content.secondaryButton}
          </button>
        )}
      </div>
    </div>
  );
}

