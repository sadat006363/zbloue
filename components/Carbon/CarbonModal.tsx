// components/Carbon/CarbonModal.tsx
'use client';

import { useEffect } from 'react';
import { CarbonTab } from './CarbonTab';

interface CarbonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  initialLanguage?: string;
}

export function CarbonModal({
  isOpen,
  onClose,
  initialCode = '',
  initialLanguage = 'javascript',
}: CarbonModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[95vw] h-[90vh] bg-[#0f0f14] rounded-2xl shadow-2xl overflow-hidden border border-[#313244]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-[#1a1a2e] hover:bg-[#313244] text-[#a6adc8] hover:text-white transition-colors border border-[#313244]"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Carbon Editor */}
        <div className="w-full h-full p-4">
          <CarbonTab initialCode={initialCode} initialLanguage={initialLanguage} />
        </div>
      </div>
    </div>
  );
}