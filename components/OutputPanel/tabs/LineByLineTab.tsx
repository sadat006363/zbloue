'use client';
import { CopyButton } from '@/components/common';
import LineByLineExplanation from '../../LineByLineExplanation';

interface LineByLineTabProps {
  snippet: any;
  lineExplanations: any[];
  isExplaining: boolean;
  hoveredLine: number | null | undefined;
  onLineHover?: (lineNumber: number | null) => void;
  showToast: (message: string) => void;
  appUrl: string;
}

export default function LineByLineTab({
  snippet,
  lineExplanations,
  isExplaining,
  hoveredLine,
  onLineHover,
  showToast,
  appUrl,
}: LineByLineTabProps) {
  if (!snippet && !isExplaining) {
    return (
      <div className="text-center text-[#4a4a6a] py-8">
        <p className="text-lg">📝 Generate a line-by-line explanation</p>
        <p className="text-sm">First, generate an analysis of your code.</p>
      </div>
    );
  }

  if (isExplaining) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4a86f7]/20 border-t-[#4a86f7] rounded-full animate-spin" />
          <p className="text-[#4a4a6a] text-sm">⏳ Generating line-by-line explanation...</p>
        </div>
      </div>
    );
  }

  if (snippet && lineExplanations && lineExplanations.length > 0) {
    return (
      <>
        <div className="flex justify-end items-center gap-2 flex-wrap">
          <CopyButton 
            text={lineExplanations.map((item: any) => 
              `Line ${item.lineNumber}:\n${item.code}\nExplanation: ${item.explanation}\n---`
            ).join('\n')} 
            label="Copy All" 
            tooltip="Copy all line explanations"
            onCopy={() => showToast('✅ Explanations copied!')}
          />
          <button
            onClick={() => {
              const url = `${appUrl}/snippet/${snippet?.slug}?tab=line-by-line`;
              window.open(url, '_blank');
              showToast('🔗 Opening line-by-line page...');
            }}
            className="bg-[#4a86f7] hover:bg-[#3b6fd4] text-white px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>🔗 Open Explanation Page</span>
          </button>
        </div>
        <LineByLineExplanation
          code={snippet.raw_code || ''}
          language={snippet.language || ''}
          explanations={lineExplanations}
          loading={false}
          hoveredLine={hoveredLine ?? null}
          onLineHover={onLineHover}
          onCopy={() => showToast('✅ Explanations copied!')}
          onDownload={() => showToast('✅ File downloaded!')}
          onShare={() => {
            const url = `${appUrl}/snippet/${snippet.slug}`;
            navigator.clipboard.writeText(url).then(() => {
              showToast('✅ Link copied! Share it anywhere!');
            }).catch(() => {
              showToast('❌ Failed to copy link');
            });
          }}
        />
      </>
    );
  }

  return (
    <div className="text-center text-[#4a4a6a] py-8">
      <p className="text-lg">📝 No explanations available</p>
      <p className="text-sm">Click the <span className="font-semibold text-[#4a86f7]">"Explain"</span> button in the editor toolbar to generate line-by-line explanations.</p>
    </div>
  );
}