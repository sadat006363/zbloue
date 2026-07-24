// components/snippet/SnippetAnalysis.tsx
'use client';

interface SnippetAnalysisProps {
  keyConcept?: string;
  whatItDoes?: string;
}

export default function SnippetAnalysis({ keyConcept, whatItDoes }: SnippetAnalysisProps) {
  const hasContent = keyConcept || whatItDoes;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244] space-y-3">
        {keyConcept && (
          <div>
            <h3 className="text-sm font-semibold text-[#89b4fa]">💡 Key Concept</h3>
            <p className="text-sm text-[#cdd6f4] mt-1">{keyConcept}</p>
          </div>
        )}

        {whatItDoes && (
          <div className={keyConcept ? 'pt-3 border-t border-[#313244]' : ''}>
            <h3 className="text-sm font-semibold text-[#89b4fa]">📖 What This Code Does</h3>
            <p className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap">{whatItDoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}