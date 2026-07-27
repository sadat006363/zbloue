// components/snippet/SnippetAnalysis.tsx
'use client';

interface SnippetAnalysisProps {
  keyConcept?: string;
  whatItDoes?: string;
  fullAnalysis?: string; // 🔥 اضافه شد
}

export default function SnippetAnalysis({ keyConcept, whatItDoes, fullAnalysis }: SnippetAnalysisProps) {
  // اگر fullAnalysis وجود دارد، آن را نمایش بده (اولویت با fullAnalysis است)
  const hasFullAnalysis = fullAnalysis && fullAnalysis.trim().length > 0;
  const displayText = hasFullAnalysis ? fullAnalysis : (whatItDoes || keyConcept);

  if (!displayText) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244] space-y-3">
        {hasFullAnalysis ? (
          // 🔥 نمایش تحلیل کامل (برای Simple/Medium با متن کامل)
          <div>
            <h3 className="text-sm font-semibold text-[#89b4fa]">📖 Analysis</h3>
            <div className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap leading-relaxed">
              {fullAnalysis}
            </div>
          </div>
        ) : (
          // حالت قبلی (برای مواقعی که fullAnalysis موجود نیست)
          <>
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
          </>
        )}
      </div>
    </div>
  );
}