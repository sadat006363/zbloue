'use client';

import { useState, useEffect, useRef } from 'react';

interface LineExplanation {
  lineNumber: number;
  code: string;
  explanation: string;
}

interface LineByLineExplanationProps {
  code: string;
  language: string;
  explanations: LineExplanation[];
  loading: boolean;
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
  loading,
  hoveredLine,
  onLineHover,
  onCopy,
  onDownload,
  onShare,
}: LineByLineExplanationProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<Record<number, string>>({});
  const explanationRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // ===== هایلایت هر خط با Shiki =====
  useEffect(() => {
    const highlightLines = async () => {
      if (!explanations || explanations.length === 0) return;

      const highlighted: Record<number, string> = {};
      
      for (const item of explanations) {
        try {
          const response = await fetch('/api/highlight-line', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: item.code,
              language: language,
            }),
          });
          
          const data = await response.json();
          if (data.success) {
            highlighted[item.lineNumber] = data.html;
          } else {
            highlighted[item.lineNumber] = `<span class="text-[#abb2bf]">${item.code}</span>`;
          }
        } catch (error) {
          console.error('Highlight error:', error);
          highlighted[item.lineNumber] = `<span class="text-[#abb2bf]">${item.code}</span>`;
        }
      }
      
      setHighlightedLines(highlighted);
    };

    highlightLines();
  }, [explanations, language]);

  // ===== اسکرول به توضیح انتخاب‌شده =====
  useEffect(() => {
    if (hoveredLine !== null && hoveredLine !== undefined && explanationRefs.current[hoveredLine]) {
      explanationRefs.current[hoveredLine]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [hoveredLine]);

  // ===== تابع تشخیص نوع توضیح =====
  const getExplanationStyle = (text: string): { icon: string; color: string; bgColor: string } => {
    const lower = text.toLowerCase();
    
    if (lower.includes('bug') || lower.includes('error') || lower.includes('issue') || lower.includes('problem') || lower.includes('incorrect') || lower.includes('missing')) {
      return { icon: '🐛', color: 'text-[#e53935]', bgColor: 'bg-[#ffebee]' };
    }
    if (lower.includes('fix') || lower.includes('solution') || lower.includes('improve') || lower.includes('refactor') || lower.includes('optimize') || lower.includes('suggest')) {
      return { icon: '🔧', color: 'text-[#f9a825]', bgColor: 'bg-[#fff8e1]' };
    }
    if (lower.includes('good') || lower.includes('works') || lower.includes('correct') || lower.includes('valid') || lower.includes('best') || lower.includes('great')) {
      return { icon: '✅', color: 'text-[#43a047]', bgColor: 'bg-[#e8f5e9]' };
    }
    if (lower.includes('warning') || lower.includes('caution') || lower.includes('careful') || lower.includes('edge') || lower.includes('case')) {
      return { icon: '⚠️', color: 'text-[#ff6f00]', bgColor: 'bg-[#fff3e0]' };
    }
    if (lower.includes('return') || lower.includes('output') || lower.includes('value')) {
      return { icon: '📤', color: 'text-[#4a86f7]', bgColor: 'bg-[#e3f2fd]' };
    }
    if (lower.includes('function') || lower.includes('method') || lower.includes('class') || lower.includes('constructor')) {
      return { icon: '🔵', color: 'text-[#5c6bc0]', bgColor: 'bg-[#e8eaf6]' };
    }
    if (lower.includes('comment') || lower.includes('note')) {
      return { icon: '💬', color: 'text-[#6c7086]', bgColor: 'bg-[#f5f5f5]' };
    }
    return { icon: '📌', color: 'text-[#1a1a2e]', bgColor: 'bg-[#fafbfc]' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4a86f7]/20 border-t-[#4a86f7] rounded-full animate-spin" />
          <p className="text-[#4a4a6a] text-sm">⏳ Generating line-by-line explanation...</p>
        </div>
      </div>
    );
  }

  if (!explanations || explanations.length === 0) {
    return (
      <div className="text-center text-[#4a4a6a] py-8">
        <p className="text-lg">No explanations available.</p>
        <p className="text-sm">Click the <span className="font-semibold text-[#4a86f7]">"Explain"</span> button in the editor toolbar to generate line-by-line explanations.</p>
      </div>
    );
  }

  // ===== تابع کپی متن =====
  const handleCopyAll = () => {
    const text = explanations
      .map((item) => `Line ${item.lineNumber}:\n${item.code}\n→ ${item.explanation}\n`)
      .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopy) onCopy();
    }).catch(() => {
      alert('❌ Failed to copy text.');
    });
  };

  // ===== تابع دانلود فایل =====
  const handleDownload = () => {
    const text = `Zbloue - Line by Line Code Explanation\n`;
    const header = `Language: ${language.toUpperCase()}\n`;
    const divider = '='.repeat(50) + '\n\n';
    const body = explanations
      .map((item) => `Line ${item.lineNumber}:\n${item.code}\n→ ${item.explanation}\n`)
      .join('\n');
    
    const content = text + header + divider + body;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `line-by-line-explanation-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onDownload) onDownload();
  };

  return (
    <div className="space-y-4">
      {/* ===== هدر با دکمه‌ها ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 bg-white z-10 pb-3 border-b border-[#d0d0d8]">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="text-lg font-semibold text-[#1a1a2e]">Line-by-Line Code Explanation</h3>
          <span className="text-xs text-[#6c7086] bg-[#f1f3f5] px-2 py-1 rounded-full">
            {explanations.length} lines
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs bg-[#f1f3f5] hover:bg-[#e8e8f0] text-[#1a1a2e] px-3 py-1.5 rounded-md border border-[#d0d0d8] transition"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-[#43a047]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy All
              </>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs bg-[#f1f3f5] hover:bg-[#e8e8f0] text-[#1a1a2e] px-3 py-1.5 rounded-md border border-[#d0d0d8] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 text-xs bg-[#f1f3f5] hover:bg-[#e8e8f0] text-[#1a1a2e] px-3 py-1.5 rounded-md border border-[#d0d0d8] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>

      {/* ===== لیست توضیحات با هایلایت ===== */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {explanations.map((item) => {
          const style = getExplanationStyle(item.explanation);
          const highlightedHtml = highlightedLines[item.lineNumber] || `<span class="text-[#abb2bf]">${item.code}</span>`;
          const isHovered = hoveredLine === item.lineNumber;
          
          return (
            <div
              key={item.lineNumber}
              ref={(el) => {
                explanationRefs.current[item.lineNumber] = el;
              }}
              className={`${style.bgColor} rounded-lg border border-[#e8e8f0] overflow-hidden transition-all duration-200 ${
                isHovered 
                  ? 'border-[#4a86f7] shadow-lg shadow-[#4a86f7]/20 scale-[1.01] ring-2 ring-[#4a86f7] ring-opacity-50' 
                  : 'hover:border-[#4a86f7]/50'
              }`}
            >
              <div className="flex items-start gap-3 p-3">
                <span className={`text-xs font-mono px-2 py-0.5 rounded min-w-[40px] text-center transition-colors ${
                  isHovered 
                    ? 'bg-[#4a86f7] text-white' 
                    : 'bg-[#e8e8f0] text-[#6c7086]'
                }`}>
                  {item.lineNumber}
                </span>
                <div className="flex-1 min-w-0">
                  {/* ===== کد هایلایت‌شده ===== */}
                  <div className={`text-sm font-mono bg-[#1a1a2e] text-[#abb2bf] p-2 rounded mb-2 overflow-x-auto transition-all duration-200 ${
                    isHovered ? 'ring-2 ring-[#4a86f7] ring-inset' : ''
                  }`}>
                    <pre 
                      className="whitespace-pre-wrap break-all"
                      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    />
                  </div>
                  
                  {/* ===== توضیحات ===== */}
                  <div className={`flex items-start gap-2 transition-all duration-200 ${
                    isHovered ? 'pl-2' : ''
                  }`}>
                    <span className="text-base">{style.icon}</span>
                    <p className={`text-sm ${style.color} leading-relaxed ${
                      isHovered ? 'font-medium' : ''
                    }`}>
                      {item.explanation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}