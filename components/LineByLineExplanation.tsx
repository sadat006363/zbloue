'use client';
import { useState } from 'react';

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
      {/* ===== هدر و دکمه‌ها (در صورت وجود پراپ‌ها) ===== */}
      {(onCopy || onDownload || onShare) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#4a86f7]">
            📝 Line-by-Line Code Explanation
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {onCopy && (
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy All</span>
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download .md</span>
              </button>
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

      {/* ===== نمایش خطوط به صورت عمودی (کد بالا، توضیح پایین) ===== */}
      <div className="space-y-3">
        {explanations.map((item, index) => {
          const isHovered = hoveredLine === item.lineNumber;
          return (
            <div
              key={index}
              className={`rounded-lg border transition-all duration-200 ${
                isHovered
                  ? 'border-[#4a86f7] shadow-lg shadow-[#4a86f7]/10'
                  : 'border-[#313244] hover:border-[#4a86f7]/50'
              }`}
              onMouseEnter={() => onLineHover?.(item.lineNumber)}
              onMouseLeave={() => onLineHover?.(null)}
            >
              {/* ===== شماره خط و کد ===== */}
              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-t-lg ${
                  isHovered ? 'bg-[#1e1e2e]' : 'bg-[#11111b]'
                }`}
              >
                <span className="text-xs text-[#6c7086] select-none font-mono min-w-[30px]">
                  {item.lineNumber}
                </span>
                <pre className="flex-1 font-mono text-sm text-[#cdd6f4] whitespace-pre-wrap break-all leading-relaxed">
                  {item.code}
                </pre>
              </div>

              {/* ===== توضیح ===== */}
              <div
                className={`px-4 py-3 rounded-b-lg border-t ${
                  isHovered
                    ? 'bg-[#1a1a2e] border-[#4a86f7]/30'
                    : 'bg-[#0f0f14] border-[#313244]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[#4a86f7] text-sm">💡</span>
                  <p className="text-sm text-[#a6adc8] leading-relaxed">
                    {item.explanation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}