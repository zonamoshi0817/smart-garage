import React, { useState, useEffect } from 'react';

// アニメーション付きカウンター
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className = "",
  prefix = "",
  suffix = ""
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // イージング関数（easeOutCubic）
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(value * easeOutCubic);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

// パルスアニメーション（期限接近用）
interface PulseAnimationProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export function PulseAnimation({
  children,
  active = false,
  className = ""
}: PulseAnimationProps) {
  return (
    <div className={`transition-all duration-300 ${active ? 'animate-pulse' : ''} ${className}`}>
      {children}
    </div>
  );
}

// バウンスアニメーション（完了時）
interface BounceAnimationProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

export function BounceAnimation({
  children,
  trigger = false,
  className = ""
}: BounceAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className={`transition-transform duration-300 ${isAnimating ? 'animate-bounce' : ''} ${className}`}>
      {children}
    </div>
  );
}

// フェードインアニメーション
interface FadeInAnimationProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeInAnimation({
  children,
  delay = 0,
  className = ""
}: FadeInAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  );
}

// スライドインアニメーション
interface SlideInAnimationProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  className?: string;
}

export function SlideInAnimation({
  children,
  direction = 'up',
  delay = 0,
  className = ""
}: SlideInAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransformClasses = () => {
    if (!isVisible) {
      switch (direction) {
        case 'left': return 'transform -translate-x-full';
        case 'right': return 'transform translate-x-full';
        case 'up': return 'transform translate-y-full';
        case 'down': return 'transform -translate-y-full';
        default: return 'transform translate-y-full';
      }
    }
    return 'transform translate-0';
  };

  return (
    <div className={`transition-transform duration-500 ease-out ${getTransformClasses()} ${className}`}>
      {children}
    </div>
  );
}

// ホバーエフェクト
interface HoverEffectProps {
  children: React.ReactNode;
  effect?: 'lift' | 'glow' | 'scale' | 'rotate';
  className?: string;
}

export function HoverEffect({
  children,
  effect = 'lift',
  className = ""
}: HoverEffectProps) {
  const getEffectClasses = () => {
    switch (effect) {
      case 'lift':
        return 'hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200';
      case 'glow':
        return 'hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200';
      case 'scale':
        return 'hover:transform hover:scale-105 transition-all duration-200';
      case 'rotate':
        return 'hover:transform hover:rotate-1 transition-all duration-200';
      default:
        return 'hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200';
    }
  };

  return (
    <div className={`${getEffectClasses()} ${className}`}>
      {children}
    </div>
  );
}

// プログレスバーアニメーション
interface AnimatedProgressBarProps {
  percentage: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  height?: 'sm' | 'md' | 'lg';
  className?: string;
  showPercentage?: boolean;
}

export function AnimatedProgressBar({
  percentage,
  color = 'blue',
  height = 'md',
  className = "",
  showPercentage = false
}: AnimatedProgressBarProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const getColorClasses = () => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getHeightClasses = () => {
    switch (height) {
      case 'sm': return 'h-1';
      case 'lg': return 'h-3';
      default: return 'h-2';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${getHeightClasses()}`}>
        <div
          className={`${getColorClasses()} ${getHeightClasses()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-600 mt-1 text-right">
          {Math.round(displayPercentage)}%
        </div>
      )}
    </div>
  );
}

// トースト通知
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  className = ""
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeClasses = () => {
    switch (type) {
      case 'success': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`${getTypeClasses()} px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-right`}>
        <span>{getIcon()}</span>
        <span className="font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="ml-2 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ローディングドット
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingDots({
  size = 'md',
  color = 'bg-blue-500',
  className = ""
}: LoadingDotsProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-2 h-2';
      case 'lg': return 'w-4 h-4';
      default: return 'w-3 h-3';
    }
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${getSizeClasses()} ${color} rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
}

// スケールアニメーション（クリック時）
interface ScaleAnimationProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ScaleAnimation({
  children,
  onClick,
  className = "",
  disabled = false
}: ScaleAnimationProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  return (
    <div
      className={`transition-transform duration-100 ${
        isPressed ? 'scale-95' : 'scale-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

// カスタムCSSアニメーション（tailwind.config.jsに追加が必要）
export const customAnimations = {
  'slide-in-right': {
    '0%': {
      transform: 'translateX(100%)',
      opacity: '0'
    },
    '100%': {
      transform: 'translateX(0)',
      opacity: '1'
    }
  }
};

