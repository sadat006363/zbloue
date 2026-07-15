'use client';
import { useState } from 'react';
import { CopyButton, DownloadButton, ShareButtons } from '@/components/common';

interface LineByLineExplanationProps {
  code: string;
  language: string;
  explanations: any[];
  loading?: boolean;
  hoveredLine?: number | null;
  onLineHover?: (lineNumber: number | null) => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  hideHeader?: boolean; // ===== جدید: مخفی کردن هدر و دکمه‌ها =====
}

export default function LineByLineExplanation({
  code,
  language,
  explanations,
  loading = false,
  hoveredLine = null,
  onLineHover,
  onCopy,
  onDownload,
  onShare,
  hideHeader = false, // ===== پیش‌فرض false برای حفظ سازگاری =====
}: LineByLineExplanationProps) {
  // ===== حالت لودینگ =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-[#4a86f7]/20 border-t-[#4a86f7] rounded-full animate-spin" />
        <span className="ml-3 text-[#4a4a6a]">Loading explanations...</span>
      </div>
    );
  }

  // ===== اگر توضیحی وجود نداشته باشد =====
  if (!explanations || explanations.length === 0) {
    return (
      <div className="text-center text-[#4a4a6a] py-8">
        <p className="text-lg">No explanations available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== هدر و دکمه‌ها (در صورت عدم مخفی‌سازی) ===== */}
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#4a86f7]">
            📝 Line-by-Line Code Explanation
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {onCopy && (
              <CopyButton 
                label="Copy All" 
                tooltip="Copy all explanations"
                onCopy={onCopy}
              />
            )}
            {onDownload && (
              <DownloadButton 
                label="Download .md" 
                tooltip="Download as markdown file"
                onDownload={onDownload}
              />
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== نمایش خطوط کد با توضیحات ===== */}
      <div className="bg-[#11111b] rounded-lg border border-[#313244] overflow-hidden">
        {explanations.map((item, index) => {
          const isHovered = hoveredLine === item.lineNumber;
          return (
            <div
              key={index}
              className={`flex border-b border-[#313244] last:border-b-0 transition-colors ${
                isHovered ? 'bg-[#1e1e2e]' : ''
              }`}
              onMouseEnter={() => onLineHover?.(item.lineNumber)}
              onMouseLeave={() => onLineHover?.(null)}
            >
              {/* ===== شماره خط ===== */}
              <div className="w-12 py-2 px-3 text-right text-[#6c7086] text-xs select-none border-r border-[#313244]">
                {item.lineNumber}
              </div>
              {/* ===== کد ===== */}
              <div className="flex-1 py-2 px-3 font-mono text-sm text-[#cdd6f4] whitespace-pre-wrap break-all">
                {item.code}
              </div>
              {/* ===== توضیح ===== */}
              <div className="flex-1 py-2 px-3 text-sm text-[#a6adc8] border-l border-[#313244] whitespace-pre-wrap">
                {item.explanation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}