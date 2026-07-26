// components/common/Tooltip.tsx

'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({
  children,
  text,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = Math.min(200, window.innerWidth - 20); // 🔥 حداکثر عرض با احترام به margin
      const tooltipHeight = 40;

      let top = 0;
      let left = 0;

      // 🔥 محاسبه موقعیت با در نظر گرفتن لبه‌های صفحه
      const margin = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - margin;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'bottom':
          top = rect.bottom + margin;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - margin;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + margin;
          break;
      }

      // 🔥 اصلاح: اطمینان از اینکه Tooltip از صفحه خارج نشود
      // جلوگیری از خروج از سمت راست
      if (left + tooltipWidth > viewportWidth - margin) {
        left = viewportWidth - tooltipWidth - margin;
      }
      // جلوگیری از خروج از سمت چپ
      if (left < margin) {
        left = margin;
      }
      // جلوگیری از خروج از بالا
      if (top < margin) {
        top = margin;
      }
      // جلوگیری از خروج از پایین
      if (top + tooltipHeight > viewportHeight - margin) {
        top = viewportHeight - tooltipHeight - margin;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && text && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-1.5 text-xs font-medium text-white bg-[#1a1a2e] rounded-md shadow-lg text-center pointer-events-none"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth: Math.min(280, window.innerWidth - 20), // 🔥 حداکثر عرض
            whiteSpace: 'normal', // 🔥 اجازه شکستن خط
            wordBreak: 'break-word', // 🔥 شکستن کلمات طولانی
            transform: 'translateY(0)',
          }}
        >
          {text}
          {/* ===== فلش Tooltip ===== */}
          <div
            className="absolute w-2 h-2 bg-[#1a1a2e] rotate-45"
            style={{
              ...(position === 'top' && { bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }),
              ...(position === 'bottom' && { top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }),
              ...(position === 'left' && { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }),
              ...(position === 'right' && { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }),
            }}
          />
        </div>
      )}
    </div>
  );
}