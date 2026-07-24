// components/snippet/SnippetLineByLine.tsx
'use client';

import { useMemo } from 'react';
import { type LineExplanation } from '@/types';

interface SnippetLineByLineProps {
  lineExplanations: LineExplanation[] | null | undefined;
}

export default function SnippetLineByLine({ lineExplanations }: SnippetLineByLineProps) {
  const safeExplanations = useMemo(() => {
    if (!lineExplanations || !Array.isArray(lineExplanations)) {
      return [];
    }
    return lineExplanations.filter((item) => item && typeof item === 'object' && 'lineNumber' in item);
  }, [lineExplanations]);

  if (safeExplanations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
        <h3 className="text-sm font-semibold text-[#89b4fa] mb-3">📝 Line-by-Line Explanation</h3>
        <div className="space-y-3">
          {safeExplanations.map((item) => (
            <div key={item.lineNumber} className="border-b border-[#313244] pb-2 last:border-0">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-[#6c7086] font-mono min-w-[40px]">{item.lineNumber}</span>
                <div className="flex-1">
                  {item.code && (
                    <pre className="text-[#cdd6f4] font-mono text-xs whitespace-pre-wrap break-all">
                      {item.code}
                    </pre>
                  )}
                  <p className="text-[#a6adc8] text-sm mt-1">{item.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}