// components/snippet/SnippetAnalysis.tsx
'use client';

import { adaptCanonicalToLegacy } from '@/lib/snippetAdapter';

interface SnippetAnalysisProps {
  keyConcept?: string;
  whatItDoes?: string;
  fullAnalysis?: string; // متن تحلیل (برای حالت Simple/Medium)
  auditResult?: any; // audit_result کامل (برای حالت Advanced)
}

export default function SnippetAnalysis({
  keyConcept,
  whatItDoes,
  fullAnalysis,
  auditResult,
}: SnippetAnalysisProps) {
  // 🔥 اولویت ۱: اگر auditResult وجود دارد، از آن استفاده کن
  if (auditResult && typeof auditResult === 'object') {
    const legacy = adaptCanonicalToLegacy(auditResult);

    // اگر analysis موجود است، آن را نمایش بده
    if (auditResult.analysis && auditResult.analysis.trim().length > 0) {
      return (
        <div className="mt-6">
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244] space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[#89b4fa]">📖 Analysis</h3>
              <div className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap leading-relaxed">
                {auditResult.analysis}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // اگر analysis خالی بود، از خلاصه استفاده کن
    if (legacy.key_concept || legacy.what_this_code_does) {
      return (
        <div className="mt-6">
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244] space-y-3">
            {legacy.key_concept && (
              <div>
                <h3 className="text-sm font-semibold text-[#89b4fa]">💡 Key Concept</h3>
                <p className="text-sm text-[#cdd6f4] mt-1">{legacy.key_concept}</p>
              </div>
            )}
            {legacy.what_this_code_does && (
              <div className={legacy.key_concept ? 'pt-3 border-t border-[#313244]' : ''}>
                <h3 className="text-sm font-semibold text-[#89b4fa]">📖 What This Code Does</h3>
                <p className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap">{legacy.what_this_code_does}</p>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // 🔥 اولویت ۲: اگر fullAnalysis وجود دارد (Simple/Medium با متن کامل)
  const hasFullAnalysis = fullAnalysis && fullAnalysis.trim().length > 0;
  if (hasFullAnalysis) {
    return (
      <div className="mt-6">
        <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244] space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[#89b4fa]">📖 Analysis</h3>
            <div className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap leading-relaxed">
              {fullAnalysis}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 اولویت ۳: از فیلدهای Legacy استفاده کن (برای backward compatibility)
  if (!keyConcept && !whatItDoes) {
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