// components/snippet/SnippetStatusBar.tsx

'use client';

import { Snippet } from '@/types';
import { useState } from 'react';

interface SnippetStatusBarProps {
  snippet: Snippet | null;
}

interface StatusItem {
  id: string;
  label: string;
  icon: string;
  available: boolean;
  sectionId: string; // برای اسکرول به بخش مربوطه
}

export default function SnippetStatusBar({ snippet }: SnippetStatusBarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!snippet) return null;

  // ============================================================
  // 🔍 بررسی وضعیت هر کامپوننت
  // ============================================================

  const items: StatusItem[] = [
    {
      id: 'code',
      label: 'Source Code',
      icon: '💻',
      available: !!snippet.raw_code,
      sectionId: 'snippet-code',
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: '📖',
      available: !!(snippet.key_concept || snippet.what_this_code_does),
      sectionId: 'snippet-analysis',
    },
    {
      id: 'debug',
      label: 'Debug & Optimization',
      icon: '🐛',
      available: !!(snippet.debug_analysis && snippet.debug_analysis !== '-') || 
                  !!(snippet.optimization && snippet.optimization !== '-'),
      sectionId: 'snippet-debug',
    },
    {
      id: 'full-analysis',
      label: 'Full Analysis',
      icon: '📊',
      available: !!(
        snippet.findings?.length ||
        snippet.code_walkthrough?.length ||
        snippet.scorecard ||
        snippet.verdict
      ),
      sectionId: 'snippet-full-analysis',
    },
    {
      id: 'line-by-line',
      label: 'Line-by-Line',
      icon: '📝',
      available: !!(snippet.line_explanations && snippet.line_explanations.length > 0),
      sectionId: 'snippet-line-by-line',
    },
    {
      id: 'prompt',
      label: 'Prompt',
      icon: '🤖',
      available: !!snippet.generated_prompt,
      sectionId: 'snippet-prompt',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn Post',
      icon: '💼',
      available: !!snippet.linkedin_post,
      sectionId: 'snippet-linkedin',
    },
  ];

  // ============================================================
  // 📊 آمار کلی
  // ============================================================

  const totalItems = items.length;
  const availableItems = items.filter((item) => item.available).length;
  const percentage = Math.round((availableItems / totalItems) * 100);

  // ============================================================
  // 🖱️ اسکرول به بخش مربوطه
  // ============================================================

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ============================================================
  // 🎨 رندر
  // ============================================================

  return (
    <div className="relative w-full mb-6">
      {/* ===== نوار پیشرفت (Progress Bar) ===== */}
      <div className="w-full h-1.5 bg-[#313244] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-[#4a86f7] to-[#a6e3a1] rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* ===== نوار وضعیت ===== */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#11111b] rounded-xl border border-[#313244] shadow-lg">
        {/* عنوان */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#313244]">
          <span className="text-xs font-medium text-[#a6adc8]">Status</span>
          <span className="text-xs text-[#6c7086]">
            {availableItems}/{totalItems}
          </span>
          <span className="text-xs font-medium text-[#89b4fa]">{percentage}%</span>
        </div>

        {/* آیتم‌ها */}
        <div className="flex flex-wrap items-center gap-1.5">
          {items.map((item) => {
            const isHovered = hoveredId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.sectionId)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-200
                  ${item.available 
                    ? 'bg-[#1e1e2e] hover:bg-[#2a2a3e] border border-[#313244]' 
                    : 'bg-[#1a1a1a] opacity-50 border border-[#252535] cursor-not-allowed'
                  }
                  ${isHovered && item.available ? 'scale-105 shadow-lg shadow-[#4a86f7]/10' : ''}
                `}
                disabled={!item.available}
                title={item.available ? `Click to scroll to ${item.label}` : `${item.label} not available`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="text-[#a6adc8] hidden sm:inline">{item.label}</span>
                
                {/* دایره وضعیت */}
                <span 
                  className={`
                    w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300
                    ${item.available 
                      ? 'bg-[#a6e3a1] shadow-[0_0_8px_rgba(166,227,161,0.5)]' 
                      : 'bg-[#f38ba8] shadow-[0_0_8px_rgba(243,139,168,0.3)]'
                    }
                  `}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Tooltip شناور ===== */}
      {hoveredId && (
        <div 
          className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1e1e2e] rounded-lg border border-[#313244] shadow-xl text-xs text-[#a6adc8] max-w-[280px] z-50 pointer-events-none"
          style={{
            transform: 'translateY(0)',
          }}
        >
          {items.find((i) => i.id === hoveredId)?.label}
          <span className="block text-[#6c7086] mt-0.5">
            {items.find((i) => i.id === hoveredId)?.available 
              ? '✅ Available — click to jump' 
              : '❌ Not available in this analysis'}
          </span>
        </div>
      )}
    </div>
  );
}