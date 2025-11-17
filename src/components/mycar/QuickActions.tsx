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

      {/* アクションボタン（横スクロール） */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2.5 sm:gap-3 lg:gap-4 overflow-x-auto scrollbar-hide py-2 px-1"
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
              className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center gap-1.5 sm:gap-2 border border-gray-100 hover:border-indigo-300 group"
            >
              {/* ロックアイコン */}
              {(isLocked || action.isLocked) && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-gray-900 bg-opacity-75 rounded-full flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs">🔒</span>
                </div>
              )}
              
              {/* アイコン */}
              <span className="text-2xl sm:text-3xl">{action.icon}</span>
              
              {/* ラベル */}
              <span className="text-[10px] sm:text-xs font-medium text-gray-700 text-center px-1.5 sm:px-2 leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 右スクロールボタン */}
      {showRightScroll && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

