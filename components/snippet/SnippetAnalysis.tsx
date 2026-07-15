'use client';

interface SnippetAnalysisProps {
  keyConcept: string;
  whatItDoes: string;
}

export default function SnippetAnalysis({ keyConcept, whatItDoes }: SnippetAnalysisProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#313244]">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[#89b4fa] flex items-center gap-2">
          💡 Key Concept
        </h3>
        <p className="text-[#a6adc8] text-sm leading-relaxed whitespace-pre-wrap">
          {keyConcept || 'No key concept provided.'}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[#89b4fa] flex items-center gap-2">
          🔍 What This Code Does
        </h3>
        <p className="text-[#a6adc8] text-sm leading-relaxed whitespace-pre-wrap">
          {whatItDoes || 'No description available.'}
        </p>
      </div>
    </div>
  );
}