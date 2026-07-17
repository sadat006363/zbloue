'use client';
import { GenerateResponse } from '@/types';
import { safeString } from '@/lib/utils';
import { useState } from 'react';

interface AnalysisTabProps {
  fullAnalysis: GenerateResponse | null | undefined;
  isAdvanced: boolean;
  quickAnalysisText: string | null;
  snippet: any;
  onCopyFullAnalysis?: () => void;
  onDownloadFullAnalysis?: () => void;
}

// ===== تابع تولید متن کامل تحلیل برای کپی و دانلود =====
const getFullAnalysisText = (analysis: GenerateResponse): string => {
  let content = '';

  content += `📌 Title: ${safeString(analysis.title)}\n\n`;
  
  if (analysis.highLevelSummary) {
    content += `💡 High-Level Summary:\n${safeString(analysis.highLevelSummary)}\n\n`;
  }
  
  if (analysis.codeWalkthrough && analysis.codeWalkthrough.length > 0) {
    content += `🧩 Code Walkthrough:\n`;
    analysis.codeWalkthrough.forEach((item) => {
      content += `  • ${safeString(item.section)}: ${safeString(item.explanation)}\n`;
    });
    content += '\n';
  }
  
  if (analysis.whatWorksWell && analysis.whatWorksWell.length > 0) {
    content += `✅ What Works Well:\n`;
    analysis.whatWorksWell.forEach((item) => {
      content += `  • ${safeString(item)}\n`;
    });
    content += '\n';
  }
  
  if (analysis.bugsAndRiskyCases && analysis.bugsAndRiskyCases.length > 0) {
    content += `🐛 Bugs and Risky Cases:\n`;
    analysis.bugsAndRiskyCases.forEach((item) => {
      content += `  • ${safeString(item.issue)} – Impact: ${safeString(item.impact)}`;
      if (item.example) content += ` (Example: ${safeString(item.example)})`;
      content += '\n';
    });
    content += '\n';
  }
  
  if (analysis.edgeCases && analysis.edgeCases.length > 0) {
    content += `🧪 Edge Cases:\n`;
    analysis.edgeCases.forEach((item) => {
      content += `  • ${safeString(item.case)} – Current: ${safeString(item.currentBehavior)} – Expected: ${safeString(item.expectedBehavior)} – Risk: ${safeString(item.risk)}\n`;
    });
    content += '\n';
  }
  
  if (analysis.performanceAnalysis) {
    content += `⚡ Performance Analysis:\n`;
    if (analysis.performanceAnalysis.timeComplexity) {
      content += `  Time Complexity: ${analysis.performanceAnalysis.timeComplexity.map(t => `${t.target}: ${t.complexity}`).join(', ')}\n`;
    }
    if (analysis.performanceAnalysis.spaceComplexity) {
      content += `  Space Complexity: ${analysis.performanceAnalysis.spaceComplexity.map(t => `${t.target}: ${t.complexity}`).join(', ')}\n`;
    }
    if (analysis.performanceAnalysis.scalabilityNotes) {
      analysis.performanceAnalysis.scalabilityNotes.forEach((note) => {
        content += `  • ${safeString(note)}\n`;
      });
    }
    content += '\n';
  }
  
  if (analysis.securityAnalysis) {
    content += `🔒 Security Analysis:\n`;
    content += `  Severity: ${safeString(analysis.securityAnalysis.severity)}\n`;
    if (analysis.securityAnalysis.issues) {
      analysis.securityAnalysis.issues.forEach((issue) => {
        content += `  • ${safeString(issue)}\n`;
      });
    }
    if (analysis.securityAnalysis.recommendations) {
      content += `  Recommendations:\n`;
      analysis.securityAnalysis.recommendations.forEach((rec) => {
        content += `    • ${safeString(rec)}\n`;
      });
    }
    content += '\n';
  }
  
  if (analysis.productionReadiness) {
    content += `🛡️ Production Readiness:\n`;
    content += `  Ready: ${analysis.productionReadiness.isProductionReady ? '✅ Yes' : '❌ No'}\n`;
    if (analysis.productionReadiness.reasons) {
      analysis.productionReadiness.reasons.forEach((reason) => {
        content += `  • ${safeString(reason)}\n`;
      });
    }
    if (analysis.productionReadiness.requiredChanges) {
      analysis.productionReadiness.requiredChanges.forEach((change) => {
        content += `  • ${safeString(change)}\n`;
      });
    }
    content += '\n';
  }
  
  if (analysis.recommendedImprovements && analysis.recommendedImprovements.length > 0) {
    content += `🔧 Recommended Improvements:\n`;
    analysis.recommendedImprovements.forEach((item) => {
      content += `  [${safeString(item.priority)}] ${safeString(item.improvement)}\n`;
      content += `    Reason: ${safeString(item.reason)}\n`;
    });
    content += '\n';
  }
  
  if (analysis.improvedCode && analysis.improvedCode.available) {
    content += `✨ Improved Code:\n`;
    content += `Notes: ${safeString(analysis.improvedCode.notes)}\n`;
    content += `${safeString(analysis.improvedCode.code)}\n\n`;
  }
  
  if (analysis.suggestedTests && analysis.suggestedTests.length > 0) {
    content += `🧪 Suggested Tests:\n`;
    analysis.suggestedTests.forEach((test) => {
      content += `  • ${safeString(test.name)}\n`;
      content += `    Input: ${safeString(test.input)}\n`;
      content += `    Expected: ${safeString(test.expectedOutput)}\n`;
      content += `    Type: ${safeString(test.type)}\n`;
    });
    content += '\n';
  }
  
  if (analysis.scorecard) {
    content += `📊 Scorecard:\n`;
    const scores = analysis.scorecard;
    content += `  Correctness: ${safeString(scores.correctness)}/10\n`;
    content += `  Readability: ${safeString(scores.readability)}/10\n`;
    content += `  Performance: ${safeString(scores.performance)}/10\n`;
    content += `  Maintainability: ${safeString(scores.maintainability)}/10\n`;
    content += `  Production Readiness: ${safeString(scores.productionReadiness)}/10\n`;
    if (scores.security !== undefined) content += `  Security: ${safeString(scores.security)}/10\n`;
    if (scores.overall) content += `  Overall: ${safeString(scores.overall)}/10\n`;
    content += '\n';
  }
  
  if (analysis.finalVerdict) {
    content += `🏁 Final Verdict:\n`;
    content += `  Summary: ${safeString(analysis.finalVerdict.summary)}\n`;
    content += `  Approved: ${analysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}\n`;
    if (analysis.finalVerdict.nextSteps) {
      content += `  Next Steps: ${safeString(analysis.finalVerdict.nextSteps)}\n`;
    }
  }
  
  return content;
};

// ===== تابع پاکسازی متن از علامت‌های ### =====
const cleanMarkdown = (text: string) => {
  if (!text) return '';
  
  let cleaned = text.replace(/^###\s*/gm, '');
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  return cleaned;
};

// ===== تابع پاکسازی متن برای کپی و دانلود (بدون HTML) =====
const cleanTextForCopy = (text: string) => {
  if (!text) return '';
  
  let cleaned = text.replace(/^###\s*/gm, '');
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
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
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyAdvanced = async () => {
    if (!fullAnalysis) return;
    const text = getFullAnalysisText(fullAnalysis);
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownloadAdvanced = () => {
    if (!fullAnalysis) return;
    const text = getFullAnalysisText(fullAnalysis);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${snippet?.slug || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isAdvanced) {
    if (!fullAnalysis) {
      return <div className="text-[#4a4a6a]">No advanced analysis available.</div>;
    }
    return (
      <div className="space-y-6">
        <div className="flex justify-end items-center gap-3 pb-2 border-b-2 border-[#e8e8f0]">
          <button
            onClick={handleCopyAdvanced}
            className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-2 py-1 rounded-md hover:bg-[#f1f3f5] border border-[#d0d0d8] group relative"
            title="Copy full analysis to clipboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span className="hidden sm:inline">{copySuccess ? '✅ Copied!' : 'Copy All'}</span>
          </button>
          <button
            onClick={handleDownloadAdvanced}
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
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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
          <span className="hidden sm:inline">{copySuccess ? '✅ Copied!' : 'Copy'}</span>
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