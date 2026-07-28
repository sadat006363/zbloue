// components/snippet/SnippetStatusBar.tsx
'use client';

import { useMemo } from 'react';
import type { Snippet } from '@/types';

interface SnippetStatusBarProps {
  snippet: Snippet;
}

interface StatusItem {
  label: string;
  icon: string;
  available: boolean;
  sectionId: string;
}

export default function SnippetStatusBar({ snippet }: SnippetStatusBarProps) {
  const hasLineExplanations = useMemo(() => {
    return Array.isArray(snippet.line_explanations) && snippet.line_explanations.length > 0;
  }, [snippet.line_explanations]);

  const hasFullAnalysis = useMemo(() => {
    const audit = snippet.audit_result;
    if (!audit) return false;
    return !!(
      audit.findings?.length > 0 ||
      audit.scorecard ||
      audit.verdict ||
      audit.executionOverview ||
      audit.architecturalObservations?.length > 0 ||
      audit.recommendedActions?.length > 0
    );
  }, [snippet.audit_result]);

  const hasValidScorecard = useMemo(() => {
    const sc = snippet.audit_result?.scorecard;
    if (!sc || typeof sc !== 'object') return false;
    return Object.values(sc).some((item: any) => 
      item?.applicable === true && typeof item?.score === 'number' && item.score > 0
    );
  }, [snippet.audit_result]);

  const statusItems: StatusItem[] = useMemo(() => {
    return [
      { label: 'Code', icon: '📄', available: !!snippet.raw_code, sectionId: 'snippet-code' },
      { label: 'Analysis', icon: '📝', available: !!(snippet.key_concept || snippet.what_this_code_does), sectionId: 'snippet-analysis' },
      { label: 'Debug', icon: '🐛', available: !!(snippet.audit_result?.findings?.length > 0), sectionId: 'snippet-debug' },
      { label: 'Full Analysis', icon: '📊', available: hasFullAnalysis, sectionId: 'snippet-full-analysis' },
      { label: 'Scorecard', icon: '📊', available: hasValidScorecard, sectionId: 'snippet-full-analysis' },
      { label: 'Line-by-Line', icon: '📝', available: hasLineExplanations, sectionId: 'snippet-line-by-line' },
      { label: 'Prompt', icon: '💡', available: !!snippet.generated_prompt, sectionId: 'snippet-prompt' },
      { label: 'LinkedIn', icon: '🔗', available: !!snippet.linkedin_post, sectionId: 'snippet-linkedin' },
    ];
  }, [
    snippet.raw_code,
    snippet.key_concept,
    snippet.what_this_code_does,
    hasFullAnalysis,
    hasValidScorecard,
    hasLineExplanations,
    snippet.generated_prompt,
    snippet.linkedin_post,
    snippet.audit_result,
  ]);

  const availableCount = statusItems.filter((item) => item.available).length;

  return (
    <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-[#1a1a2e] rounded-lg border border-[#313244] mb-3">
      <div className="flex items-center gap-2 text-sm text-[#a6adc8]">
        <span>📌 Status</span>
        <span className="text-xs text-[#6c7086]">({availableCount}/{statusItems.length})</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusItems.map((item) => (
          <a
            key={item.sectionId}
            href={`#${item.sectionId}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition ${
              item.available
                ? 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'
                : 'bg-[#1a1a2e] text-[#6c7086] cursor-not-allowed opacity-50'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.available && <span className="text-[#a6e3a1]">✅</span>}
          </a>
        ))}
      </div>
    </div>
  );
}