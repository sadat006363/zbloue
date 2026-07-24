// components/OutputPanel/tabs/AnalysisTab.tsx
'use client';
import {
  LegacyGenerateResponse,
  LegacyCodeWalkthroughItem,
  LegacyBugAndRiskyCase,
  LegacyEdgeCase,
  LegacyPerformanceAnalysis,
  LegacySecurityAnalysis,
  LegacyProductionReadiness,
  LegacyRecommendedImprovement,
  LegacySuggestedTest,
  LegacyScorecard,
} from '@/types';
import { safeString } from '@/lib/utils';
import { useState } from 'react';

interface AnalysisTabProps {
  fullAnalysis: LegacyGenerateResponse | null | undefined;
  isAdvanced: boolean;
  quickAnalysisText: string | null;
  snippet: any;
  onCopyFullAnalysis?: () => void;
  onDownloadFullAnalysis?: () => void;
}

// ===== Clean markdown =====
const cleanMarkdown = (text: string) => {
  if (!text) return '';
  let cleaned = text.replace(/^###\s*/gm, '');
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return cleaned;
};

// ===== Clean text for copy =====
const cleanTextForCopy = (text: string) => {
  if (!text) return '';
  let cleaned = text.replace(/^###\s*/gm, '');
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  cleaned = cleaned.replace(/\*\*/g, '');
  return cleaned;
};

// ===== Safe array helper =====
const safeArray = <T,>(arr: T[] | undefined | null): T[] => {
  return Array.isArray(arr) ? arr : [];
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

  // ===== Generate full analysis text for copy/download =====
  const getAnalysisText = () => {
    if (!fullAnalysis) return '';

    let text = '';

    if (isAdvanced && fullAnalysis) {
      text += `📊 Zbloue Advanced Analysis Report\n`;
      text += `═══════════════════════════════════════\n\n`;
      text += `📌 Title: ${safeString(fullAnalysis.card_title)}\n\n`;
      if (fullAnalysis.key_concept) {
        text += `💡 Key Concept:\n${safeString(fullAnalysis.key_concept)}\n\n`;
      }
      if (fullAnalysis.analysis) {
        text += `📝 Analysis:\n${safeString(fullAnalysis.analysis)}\n\n`;
      }

      // Code Walkthrough
      if (fullAnalysis.codeWalkthrough && fullAnalysis.codeWalkthrough.length > 0) {
        text += `🧩 Code Walkthrough:\n`;
        fullAnalysis.codeWalkthrough.forEach((item: LegacyCodeWalkthroughItem) => {
          text += `  • ${safeString(item.section)}: ${safeString(item.explanation)}\n`;
        });
        text += `\n`;
      }

      // What Works Well
      if (fullAnalysis.whatWorksWell && fullAnalysis.whatWorksWell.length > 0) {
        text += `✅ What Works Well:\n`;
        fullAnalysis.whatWorksWell.forEach((item: string) => {
          text += `  • ${safeString(item)}\n`;
        });
        text += `\n`;
      }

      // Bugs and Risky Cases
      if (fullAnalysis.bugsAndRiskyCases && fullAnalysis.bugsAndRiskyCases.length > 0) {
        text += `🐛 Bugs and Risky Cases:\n`;
        fullAnalysis.bugsAndRiskyCases.forEach((item: LegacyBugAndRiskyCase) => {
          text += `  • ${safeString(item.issue)}\n`;
          text += `    Impact: ${safeString(item.impact)}\n`;
          if (item.example) text += `    Example: ${safeString(item.example)}\n`;
        });
        text += `\n`;
      }

      // Edge Cases
      if (fullAnalysis.edgeCases && fullAnalysis.edgeCases.length > 0) {
        text += `🧪 Edge Cases:\n`;
        fullAnalysis.edgeCases.forEach((item: LegacyEdgeCase) => {
          text += `  • ${safeString(item.case)}\n`;
          text += `    Current: ${safeString(item.currentBehavior)}\n`;
          text += `    Expected: ${safeString(item.expectedBehavior)}\n`;
          text += `    Risk: ${safeString(item.risk)}\n`;
        });
        text += `\n`;
      }

      // Performance Analysis
      if (fullAnalysis.performanceAnalysis) {
        text += `⚡ Performance Analysis:\n`;
        const pa = fullAnalysis.performanceAnalysis;
        if (pa.timeComplexity && pa.timeComplexity.length > 0) {
          text += `  Time Complexity:\n`;
          pa.timeComplexity.forEach((item) => {
            text += `    • ${safeString(item.target)}: ${safeString(item.complexity)} (${safeString(item.explanation)})\n`;
          });
        }
        if (pa.spaceComplexity && pa.spaceComplexity.length > 0) {
          text += `  Space Complexity:\n`;
          pa.spaceComplexity.forEach((item) => {
            text += `    • ${safeString(item.target)}: ${safeString(item.complexity)} (${safeString(item.explanation)})\n`;
          });
        }
        if (pa.scalabilityNotes && pa.scalabilityNotes.length > 0) {
          text += `  Scalability Notes:\n`;
          pa.scalabilityNotes.forEach((item) => {
            text += `    • ${safeString(item)}\n`;
          });
        }
        text += `\n`;
      }

      // Security Analysis
      if (fullAnalysis.securityAnalysis) {
        text += `🔒 Security Analysis:\n`;
        text += `  Severity: ${safeString(fullAnalysis.securityAnalysis.severity)}\n`;
        if (fullAnalysis.securityAnalysis.issues && fullAnalysis.securityAnalysis.issues.length > 0) {
          text += `  Issues:\n`;
          fullAnalysis.securityAnalysis.issues.forEach((issue) => {
            text += `    • ${safeString(issue)}\n`;
          });
        }
        if (fullAnalysis.securityAnalysis.recommendations && fullAnalysis.securityAnalysis.recommendations.length > 0) {
          text += `  Recommendations:\n`;
          fullAnalysis.securityAnalysis.recommendations.forEach((rec) => {
            text += `    • ${safeString(rec)}\n`;
          });
        }
        text += `\n`;
      }

      // Production Readiness
      if (fullAnalysis.productionReadiness) {
        text += `🛡️ Production Readiness:\n`;
        text += `  Ready: ${fullAnalysis.productionReadiness.isProductionReady ? 'Yes' : 'No'}\n`;
        if (fullAnalysis.productionReadiness.reasons && fullAnalysis.productionReadiness.reasons.length > 0) {
          fullAnalysis.productionReadiness.reasons.forEach((reason) => {
            text += `    • ${safeString(reason)}\n`;
          });
        }
        if (fullAnalysis.productionReadiness.requiredChanges && fullAnalysis.productionReadiness.requiredChanges.length > 0) {
          text += `  Required Changes:\n`;
          fullAnalysis.productionReadiness.requiredChanges.forEach((change) => {
            text += `    • ${safeString(change)}\n`;
          });
        }
        text += `\n`;
      }

      // Recommended Improvements
      if (fullAnalysis.recommendedImprovements && fullAnalysis.recommendedImprovements.length > 0) {
        text += `🔧 Recommended Improvements:\n`;
        fullAnalysis.recommendedImprovements.forEach((item: LegacyRecommendedImprovement) => {
          text += `  • [${safeString(item.priority)}] ${safeString(item.improvement)}\n`;
          text += `    Reason: ${safeString(item.reason)}\n`;
        });
        text += `\n`;
      }

      // Improved Code
      if (fullAnalysis.improvedCode && fullAnalysis.improvedCode.available) {
        text += `✨ Improved Code:\n`;
        text += `Notes: ${safeString(fullAnalysis.improvedCode.notes)}\n`;
        text += `${safeString(fullAnalysis.improvedCode.code)}\n\n`;
      }

      // Suggested Tests
      if (fullAnalysis.suggestedTests && fullAnalysis.suggestedTests.length > 0) {
        text += `🧪 Suggested Tests:\n`;
        fullAnalysis.suggestedTests.forEach((test: LegacySuggestedTest) => {
          text += `  • ${safeString(test.name)}\n`;
          if (test.input) text += `    Input: ${safeString(test.input)}\n`;
          if (test.expectedOutput) text += `    Expected: ${safeString(test.expectedOutput)}\n`;
          if (test.type) text += `    Type: ${safeString(test.type)}\n`;
        });
        text += `\n`;
      }

      // Scorecard
      if (fullAnalysis.scorecard) {
        text += `📊 Scorecard:\n`;
        const sc = fullAnalysis.scorecard;
        text += `  Correctness: ${safeString(sc.correctness)}/10\n`;
        text += `  Readability: ${safeString(sc.readability)}/10\n`;
        text += `  Performance: ${safeString(sc.performance)}/10\n`;
        text += `  Maintainability: ${safeString(sc.maintainability)}/10\n`;
        text += `  Production Readiness: ${safeString(sc.productionReadiness)}/10\n`;
        if (sc.security !== undefined) text += `  Security: ${safeString(sc.security)}/10\n`;
        if (sc.overall !== undefined) text += `  Overall: ${safeString(sc.overall)}/10\n`;
        text += `\n`;
      }

      // Final Verdict
      if (fullAnalysis.finalVerdict) {
        text += `🏁 Final Verdict:\n`;
        text += `  Summary: ${safeString(fullAnalysis.finalVerdict.summary)}\n`;
        text += `  Approved: ${fullAnalysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}\n`;
        if (fullAnalysis.finalVerdict.nextSteps) {
          text += `  Next Steps: ${safeString(fullAnalysis.finalVerdict.nextSteps)}\n`;
        }
        text += `\n`;
      }

      // Debug / metadata if available
      if ((fullAnalysis as any).debug_trace) {
        text += `🔍 Debug Trace available (not displayed in text)\n`;
      }
    } else if (fullAnalysis?.analysis) {
      text = fullAnalysis.analysis;
    } else {
      text = 'No analysis available.';
    }

    return text;
  };

  const handleCopy = async () => {
    const text = getAnalysisText();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = () => {
    const text = getAnalysisText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${snippet?.slug || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Advanced mode with full legacy response =====
  if (isAdvanced && fullAnalysis) {
    return (
      <div className="space-y-6">
        {/* ===== Header with Copy/Download ===== */}
        <div className="flex justify-end items-center gap-3 pb-2 border-b-2 border-[#e8e8f0]">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
            title="Copy full analysis"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{copySuccess ? '✅ Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
            title="Download analysis as text file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>
        </div>

        {/* ===== Title and Key Concept ===== */}
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a2e]">{safeString(fullAnalysis.card_title || 'Advanced Analysis')}</h2>
          {fullAnalysis.key_concept && (
            <p className="mt-2 text-[#4a4a6a] bg-blue-50 p-3 rounded-lg border border-blue-200">
              {safeString(fullAnalysis.key_concept)}
            </p>
          )}
          {fullAnalysis.analysis && (
            <div className="mt-3 text-[#4a4a6a] whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
              {safeString(fullAnalysis.analysis)}
            </div>
          )}
        </div>

        {/* ===== Code Walkthrough ===== */}
        {safeArray(fullAnalysis.codeWalkthrough).length > 0 && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">🧩 Code Walkthrough</h3>
            {safeArray(fullAnalysis.codeWalkthrough).map((item: LegacyCodeWalkthroughItem, idx: number) => (
              <div key={idx} className="border-b border-[#d0d0d8] pb-2 last:border-0 last:pb-0">
                <p className="font-medium text-[#1a1a2e]">{safeString(item.section)}</p>
                <p className="text-sm text-[#4a4a6a]">{safeString(item.explanation)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ===== What Works Well ===== */}
        {safeArray(fullAnalysis.whatWorksWell).length > 0 && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#43a047] mb-2">✅ What Works Well</h3>
            <ul className="list-disc list-inside text-sm text-[#4a4a6a]">
              {safeArray(fullAnalysis.whatWorksWell).map((item: string, idx: number) => (
                <li key={idx}>{safeString(item)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ===== Bugs and Risky Cases ===== */}
        {safeArray(fullAnalysis.bugsAndRiskyCases).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[#e53935] mb-3">🐛 Bugs and Risky Cases</h3>
            <div className="space-y-3">
              {safeArray(fullAnalysis.bugsAndRiskyCases).map((item: LegacyBugAndRiskyCase, idx: number) => (
                <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-[#1a1a2e]">{safeString(item.issue)}</p>
                  <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Impact:</span> {safeString(item.impact)}</p>
                  {item.example && <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Example:</span> {safeString(item.example)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Edge Cases ===== */}
        {safeArray(fullAnalysis.edgeCases).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[#f57c00] mb-3">🧪 Edge Cases</h3>
            <div className="space-y-2">
              {safeArray(fullAnalysis.edgeCases).map((item: LegacyEdgeCase, idx: number) => (
                <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-medium text-[#1a1a2e]">{safeString(item.case)}</p>
                  <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Current:</span> {safeString(item.currentBehavior)}</p>
                  <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Expected:</span> {safeString(item.expectedBehavior)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.risk === 'High' ? 'bg-red-100 text-red-700' :
                    item.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    Risk: {safeString(item.risk)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Performance Analysis ===== */}
        {fullAnalysis.performanceAnalysis && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">⚡ Performance Analysis</h3>
            {fullAnalysis.performanceAnalysis.timeComplexity && fullAnalysis.performanceAnalysis.timeComplexity.length > 0 && (
              <div className="mb-2">
                <span className="font-medium text-sm">Time Complexity:</span>
                {fullAnalysis.performanceAnalysis.timeComplexity.map((item, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(item.target)}: {safeString(item.complexity)} ({safeString(item.explanation)})</div>
                ))}
              </div>
            )}
            {fullAnalysis.performanceAnalysis.spaceComplexity && fullAnalysis.performanceAnalysis.spaceComplexity.length > 0 && (
              <div className="mb-2">
                <span className="font-medium text-sm">Space Complexity:</span>
                {fullAnalysis.performanceAnalysis.spaceComplexity.map((item, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(item.target)}: {safeString(item.complexity)} ({safeString(item.explanation)})</div>
                ))}
              </div>
            )}
            {fullAnalysis.performanceAnalysis.scalabilityNotes && fullAnalysis.performanceAnalysis.scalabilityNotes.length > 0 && (
              <div>
                <span className="font-medium text-sm">Scalability Notes:</span>
                {fullAnalysis.performanceAnalysis.scalabilityNotes.map((note, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(note)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Security Analysis ===== */}
        {fullAnalysis.securityAnalysis && (
          <div className={`p-4 rounded-lg border ${
            fullAnalysis.securityAnalysis.severity === 'Critical' ? 'bg-red-50 border-red-300' :
            fullAnalysis.securityAnalysis.severity === 'High' ? 'bg-orange-50 border-orange-300' :
            fullAnalysis.securityAnalysis.severity === 'Medium' ? 'bg-yellow-50 border-yellow-300' :
            'bg-blue-50 border-blue-300'
          }`}>
            <h3 className="font-semibold text-[#1a1a2e]">🔒 Security Analysis</h3>
            <p className="text-sm"><span className="font-medium">Severity:</span> {safeString(fullAnalysis.securityAnalysis.severity)}</p>
            {fullAnalysis.securityAnalysis.issues && fullAnalysis.securityAnalysis.issues.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Issues:</span>
                {fullAnalysis.securityAnalysis.issues.map((issue, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(issue)}</div>
                ))}
              </div>
            )}
            {fullAnalysis.securityAnalysis.recommendations && fullAnalysis.securityAnalysis.recommendations.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Recommendations:</span>
                {fullAnalysis.securityAnalysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(rec)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Production Readiness ===== */}
        {fullAnalysis.productionReadiness && (
          <div className={`p-4 rounded-lg border ${
            fullAnalysis.productionReadiness.isProductionReady ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <h3 className="font-semibold text-[#1a1a2e]">🛡️ Production Readiness</h3>
            <p className="text-sm"><span className="font-medium">Ready:</span> {fullAnalysis.productionReadiness.isProductionReady ? '✅ Yes' : '❌ No'}</p>
            {fullAnalysis.productionReadiness.reasons && fullAnalysis.productionReadiness.reasons.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Reasons:</span>
                {fullAnalysis.productionReadiness.reasons.map((reason, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(reason)}</div>
                ))}
              </div>
            )}
            {fullAnalysis.productionReadiness.requiredChanges && fullAnalysis.productionReadiness.requiredChanges.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Required Changes:</span>
                {fullAnalysis.productionReadiness.requiredChanges.map((change, idx) => (
                  <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(change)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Recommended Improvements ===== */}
        {safeArray(fullAnalysis.recommendedImprovements).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-3">🔧 Recommended Improvements</h3>
            <div className="space-y-2">
              {safeArray(fullAnalysis.recommendedImprovements).map((item: LegacyRecommendedImprovement, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-[#f8f9fa] rounded-lg border border-[#d0d0d8]">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    item.priority === 'High' ? 'bg-red-100 text-red-700' :
                    item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {safeString(item.priority)}
                  </span>
                  <div>
                    <p className="font-medium text-[#1a1a2e]">{safeString(item.improvement)}</p>
                    <p className="text-sm text-[#4a4a6a]">{safeString(item.reason)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Improved Code ===== */}
        {fullAnalysis.improvedCode && fullAnalysis.improvedCode.available && (
          <div className="bg-[#e8f5e9] p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-[#43a047] mb-2">✨ Improved Code</h3>
            <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Notes:</span> {safeString(fullAnalysis.improvedCode.notes)}</p>
            <pre className="mt-2 p-3 bg-[#1a1a2e] text-[#cdd6f4] rounded-md overflow-x-auto text-sm font-mono">
              {safeString(fullAnalysis.improvedCode.code)}
            </pre>
          </div>
        )}

        {/* ===== Suggested Tests ===== */}
        {safeArray(fullAnalysis.suggestedTests).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-3">🧪 Suggested Tests</h3>
            <div className="space-y-2">
              {safeArray(fullAnalysis.suggestedTests).map((test: LegacySuggestedTest, idx: number) => (
                <div key={idx} className="p-3 bg-[#f8f9fa] rounded-lg border border-[#d0d0d8]">
                  <p className="font-medium text-[#1a1a2e]">{safeString(test.name)}</p>
                  {test.input && <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Input:</span> {safeString(test.input)}</p>}
                  {test.expectedOutput && <p className="text-sm text-[#4a4a6a]"><span className="font-medium">Expected:</span> {safeString(test.expectedOutput)}</p>}
                  {test.type && <span className={`text-xs px-2 py-0.5 rounded-full ${
                    test.type === 'Invalid' ? 'bg-red-100 text-red-700' :
                    test.type === 'Edge' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{safeString(test.type)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Scorecard ===== */}
        {fullAnalysis.scorecard && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">📊 Scorecard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(fullAnalysis.scorecard).map(([key, value]) => (
                <div key={key} className="bg-white p-2 rounded text-center border border-[#d0d0d8]">
                  <p className="text-xs text-[#6c7086] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-lg font-bold text-[#1a1a2e]">{typeof value === 'number' ? value : 0}/10</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Final Verdict ===== */}
        {fullAnalysis.finalVerdict && (
          <div className={`p-4 rounded-lg border ${
            fullAnalysis.finalVerdict.approved ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <h3 className="font-semibold text-[#1a1a2e]">🏁 Final Verdict</h3>
            <p className="mt-1 text-sm text-[#4a4a6a]">{safeString(fullAnalysis.finalVerdict.summary)}</p>
            <p className="mt-1 text-sm">
              <span className="font-medium">Approved:</span> {fullAnalysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}
            </p>
            {fullAnalysis.finalVerdict.nextSteps && (
              <p className="mt-1 text-sm text-[#4a4a6a]"><span className="font-medium">Next Steps:</span> {safeString(fullAnalysis.finalVerdict.nextSteps)}</p>
            )}
          </div>
        )}

        {/* ===== Debug info (if available) ===== */}
        {(fullAnalysis as any).debug_trace && process.env.NODE_ENV === 'development' && (
          <details className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <summary className="cursor-pointer text-sm font-medium text-[#1a1a2e]">
              🔍 Debug Trace
            </summary>
            <pre className="mt-2 text-xs text-[#4a4a6a] whitespace-pre-wrap bg-white p-3 rounded border border-[#d0d0d8] max-h-[200px] overflow-y-auto">
              {JSON.stringify((fullAnalysis as any).debug_trace, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // ===== Simple / Medium mode =====
  if (!quickAnalysisText) {
    return <div className="text-[#4a4a6a]">No quick analysis available.</div>;
  }

  const cleanedText = cleanMarkdown(quickAnalysisText);
  const cleanedTextForCopy = cleanTextForCopy(quickAnalysisText);

  const handleCopySimple = async () => {
    try {
      await navigator.clipboard.writeText(cleanedTextForCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownloadSimple = () => {
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
          onClick={handleCopySimple}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>{copySuccess ? '✅ Copied!' : 'Copy'}</span>
        </button>
        <button
          onClick={handleDownloadSimple}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download</span>
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