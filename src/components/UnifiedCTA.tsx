import React, { useState } from 'react';

interface UnifiedCTAProps {
  onMaintenance: () => void;
  onFuel: () => void;
  onCustom?: () => void;
  onNote?: () => void;
  className?: string;
}

export default function UnifiedCTA({ 
  onMaintenance, 
  onFuel, 
  onCustom, 
  onNote,
  className = ""
}: UnifiedCTAProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: 'メンテナンス',
      icon: '🔧',
      onClick: () => {
        onMaintenance();
        setIsOpen(false);
      }
    },
    {
      label: '給油',
      icon: '⛽',
      onClick: () => {
        onFuel();
        setIsOpen(false);
      }
    },
    ...(onCustom ? [{
      label: 'カスタム',
      icon: '📝',
      onClick: () => {
        onCustom();
        setIsOpen(false);
      }
    }] : []),
    ...(onNote ? [{
      label: 'メモ',
      icon: '📄',
      onClick: () => {
        onNote();
        setIsOpen(false);
      }
    }] : [])
  ];

  return (
    <div className={`relative ${className}`}>
      {/* プライマリボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="font-medium">記録を追加</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* メニュー */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 text-gray-700"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

