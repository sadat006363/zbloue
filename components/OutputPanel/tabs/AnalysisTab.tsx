'use client';
import { GenerateResponse } from '@/types';
import { safeString } from '@/lib/utils';

interface AnalysisTabProps {
  fullAnalysis: GenerateResponse | null | undefined;
  isAdvanced: boolean;
  quickAnalysisText: string | null;
  snippet: any;
  onCopyFullAnalysis?: () => void;
  onDownloadFullAnalysis?: () => void;
}

// ===== تابع پاکسازی متن از علامت‌های ### =====
const cleanMarkdown = (text: string) => {
  if (!text) return '';
  
  // حذف ### از ابتدای خطوط
  let cleaned = text.replace(/^###\s*/gm, '');
  
  // حذف ### که با خط جدید جدا شده‌اند
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  
  // تبدیل - به •
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  
  // تبدیل ** به <strong>
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  return cleaned;
};

// ===== تابع پاکسازی متن برای کپی و دانلود (بدون HTML) =====
const cleanTextForCopy = (text: string) => {
  if (!text) return '';
  
  // حذف ### از ابتدای خطوط
  let cleaned = text.replace(/^###\s*/gm, '');
  
  // حذف ### که با خط جدید جدا شده‌اند
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  
  // تبدیل - به •
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  
  // حذف ** برای متن ساده
  cleaned = cleaned.replace(/\*\*/g, '');
  
  return cleaned;
};

export default function AnalysisTab({ 
  fullAnalysis, 
  isAdvanced, 
  quickAnalysisText,
  snippet,
  onCopyFullAnalysis,
  onDownloadFullAnalysis,
}: AnalysisTabProps) {
  if (isAdvanced) {
    if (!fullAnalysis) {
      return <div className="text-[#4a4a6a]">No advanced analysis available.</div>;
    }
    return (
      <div className="space-y-6">
        <div className="flex justify-end items-center gap-3 pb-2 border-b-2 border-[#e8e8f0]">
          <button
            onClick={onCopyFullAnalysis}
            className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-2 py-1 rounded-md hover:bg-[#f1f3f5] border border-[#d0d0d8] group relative"
            title="Copy full analysis to clipboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span className="hidden sm:inline">Copy All</span>
          </button>
          <button
            onClick={onDownloadFullAnalysis}
            className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-2 py-1 rounded-md hover:bg-[#f1f3f5] border border-[#d0d0d8] group relative"
            title="Download analysis as text file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>

        <h2 className="text-xl font-bold">{safeString(fullAnalysis.title)}</h2>
        {fullAnalysis.highLevelSummary && (
          <div><h3 className="font-semibold text-[#4a86f7]">💡 High-Level Summary</h3><p>{safeString(fullAnalysis.highLevelSummary)}</p></div>
        )}
        {fullAnalysis.codeWalkthrough && fullAnalysis.codeWalkthrough.length > 0 && (
          <div><h3 className="font-semibold text-[#4a86f7]">🧩 Code Walkthrough</h3><ul className="space-y-1">{fullAnalysis.codeWalkthrough.map((item, i) => <li key={i}><strong>{safeString(item.section)}</strong>: {safeString(item.explanation)}</li>)}</ul></div>
        )}
        {fullAnalysis.whatWorksWell && fullAnalysis.whatWorksWell.length > 0 && (
          <div><h3 className="font-semibold text-[#43a047]">✅ What Works Well</h3><ul className="list-disc list-inside">{fullAnalysis.whatWorksWell.map((item, i) => <li key={i}>{safeString(item)}</li>)}</ul></div>
        )}
        {fullAnalysis.bugsAndRiskyCases && fullAnalysis.bugsAndRiskyCases.length > 0 && (
          <div><h3 className="font-semibold text-[#e53935]">🐛 Bugs and Risky Cases</h3><ul>{fullAnalysis.bugsAndRiskyCases.map((item, i) => <li key={i}><strong>{safeString(item.issue)}</strong> – Impact: {safeString(item.impact)}{item.example && ` (Example: ${safeString(item.example)})`}</li>)}</ul></div>
        )}
        {fullAnalysis.edgeCases && fullAnalysis.edgeCases.length > 0 && (
          <div><h3 className="font-semibold text-[#4a86f7]">🧪 Edge Cases</h3><ul>{fullAnalysis.edgeCases.map((item, i) => <li key={i}><strong>{safeString(item.case)}</strong> – Current: {safeString(item.currentBehavior)} – Expected: {safeString(item.expectedBehavior)} – Risk: {safeString(item.risk)}</li>)}</ul></div>
        )}
        {fullAnalysis.performanceAnalysis && (
          <div><h3 className="font-semibold text-[#4a86f7]">⚡ Performance Analysis</h3>
            <div><span className="font-medium">Time:</span> {fullAnalysis.performanceAnalysis.timeComplexity.map(t => `${t.target}: ${t.complexity}`).join(', ')}</div>
            <div><span className="font-medium">Space:</span> {fullAnalysis.performanceAnalysis.spaceComplexity.map(t => `${t.target}: ${t.complexity}`).join(', ')}</div>
            {fullAnalysis.performanceAnalysis.scalabilityNotes && <ul className="list-disc list-inside">{fullAnalysis.performanceAnalysis.scalabilityNotes.map((note,i) => <li key={i}>{safeString(note)}</li>)}</ul>}
          </div>
        )}
        {fullAnalysis.securityAnalysis && (
          <div><h3 className="font-semibold text-[#e53935]">🔒 Security Analysis</h3>
            <p>Severity: {fullAnalysis.securityAnalysis.severity}</p>
            {fullAnalysis.securityAnalysis.issues && <ul className="list-disc list-inside">{fullAnalysis.securityAnalysis.issues.map((issue,i) => <li key={i}>{safeString(issue)}</li>)}</ul>}
            {fullAnalysis.securityAnalysis.recommendations && <div><span className="font-medium">Recommendations:</span><ul className="list-disc list-inside">{fullAnalysis.securityAnalysis.recommendations.map((rec,i) => <li key={i}>{safeString(rec)}</li>)}</ul></div>}
          </div>
        )}
        {fullAnalysis.scorecard && (
          <div><h3 className="font-semibold text-[#4a86f7]">📊 Scorecard</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{Object.entries(fullAnalysis.scorecard).map(([key, value]) => <div key={key} className="bg-[#f1f3f5] p-2 rounded-md text-center"><p className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</p><p className="text-lg font-bold">{safeString(value)}/10</p></div>)}</div>
          </div>
        )}
        {fullAnalysis.finalVerdict && (
          <div className="bg-[#f1f3f5] p-4 rounded-lg border-2 border-[#d0d0d8]"><h3 className="font-semibold text-[#4a86f7]">🏁 Final Verdict</h3><p><strong>Summary:</strong> {safeString(fullAnalysis.finalVerdict.summary)}</p><p><strong>Approved:</strong> {fullAnalysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}</p>{fullAnalysis.finalVerdict.nextSteps && <p>💡 Next Steps: {safeString(fullAnalysis.finalVerdict.nextSteps)}</p>}</div>
        )}
      </div>
    );
  }

  // ===== حالت Simple/Medium =====
  if (!quickAnalysisText) {
    return <div className="text-[#4a4a6a]">No quick analysis available.</div>;
  }

  const cleanedText = cleanMarkdown(quickAnalysisText);
  const cleanedTextForCopy = cleanTextForCopy(quickAnalysisText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanedTextForCopy);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([cleanedTextForCopy], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${snippet?.slug || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-3 pb-2 border-b-2 border-[#e8e8f0]">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-2 py-1 rounded-md hover:bg-[#f1f3f5] border border-[#d0d0d8] group relative"
          title="Copy analysis to clipboard"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span className="hidden sm:inline">Copy</span>
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-2 py-1 rounded-md hover:bg-[#f1f3f5] border border-[#d0d0d8] group relative"
          title="Download analysis as text file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-[#1a1a2e]">📊 Quick Analysis</h2>
        <div 
          className="bg-[#fafbfc] p-4 rounded-md border-2 border-[#d0d0d8] whitespace-pre-wrap leading-relaxed text-sm"
          dangerouslySetInnerHTML={{ __html: cleanedText }}
        />
      </div>
    </div>
  );
}