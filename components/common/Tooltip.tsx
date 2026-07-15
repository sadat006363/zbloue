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
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 200;
      const tooltipHeight = 40;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 8;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + 8;
          break;
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
          className="fixed z-50 px-3 py-1.5 text-xs font-medium text-white bg-[#1a1a2e] rounded-md shadow-lg whitespace-nowrap max-w-[200px] text-center pointer-events-none"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
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