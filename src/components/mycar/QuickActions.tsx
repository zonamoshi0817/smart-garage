'use client';

import { useState, useRef } from 'react';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  isPremium?: boolean;
  isLocked?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  isPremium: boolean;
  onLockedClick: (actionId: string) => void;
}

export default function QuickActions({ actions, isPremium, onLockedClick }: QuickActionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 200;
    const newScrollLeft = direction === 'left' 
      ? scrollRef.current.scrollLeft - scrollAmount
      : scrollRef.current.scrollLeft + scrollAmount;
    
    scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* 左スクロールボタン */}
      {showLeftScroll && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 左側フェード（スクロール可能を示す） */}
      {showLeftScroll && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none z-0" />
      )}

      {/* アクションボタン（横スクロール） */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2.5 sm:gap-3 lg:gap-4 overflow-x-auto scrollbar-hide py-2 px-1 relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {actions.map((action) => {
          const isLocked = action.isPremium && !isPremium;
          
          return (
            <button
              key={action.id}
              onClick={() => {
                if (isLocked || action.isLocked) {
                  onLockedClick(action.id);
                } else {
                  action.onClick();
                }
              }}
              className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-white to-gray-50 rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 sm:gap-2 border border-gray-200 hover:border-indigo-400 group active:scale-95"
            >
              {/* ロックアイコン */}
              {(isLocked || action.isLocked) && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
              
              {/* アイコン */}
              <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-200">{action.icon}</span>
              
              {/* ラベル */}
              <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center px-1.5 sm:px-2 leading-tight group-hover:text-indigo-600 transition-colors">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 右側フェード（スクロール可能を示す） */}
      {showRightScroll && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-0" />
      )}

      {/* 右スクロールボタン */}
      {showRightScroll && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          title="他の操作を見る"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

