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

// ===== Helper: detect JSON and extract readable text (enhanced) =====
function formatText(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const possibleKeys = [
          'analysis', 'summary', 'explanation', 'text',
          'response', 'output', 'result', 'content', 'message',
          'description', 'details', 'answer', 'review',
          'feedback', 'comment', 'body', 'value'
        ];
        for (const key of possibleKeys) {
          if (parsed[key] && typeof parsed[key] === 'string') {
            return parsed[key];
          }
        }
        const keys = Object.keys(parsed);
        if (keys.length === 1 && typeof parsed[keys[0]] === 'string') {
          return parsed[keys[0]];
        }
        return `<pre class="bg-[#1a1a2e] text-[#cdd6f4] p-4 rounded-md overflow-x-auto text-sm font-mono">${JSON.stringify(parsed, null, 2)}</pre>`;
      }
      return `<pre class="bg-[#1a1a2e] text-[#cdd6f4] p-4 rounded-md overflow-x-auto text-sm font-mono">${JSON.stringify(parsed, null, 2)}</pre>`;
    } catch {
      return text;
    }
  }
  return text;
}

// ===== Clean markdown (with JSON detection) =====
const cleanMarkdown = (text: string) => {
  if (!text) return '';
  const formatted = formatText(text);
  if (formatted.startsWith('<pre')) {
    return formatted;
  }
  let cleaned = formatted.replace(/^###\s*/gm, '');
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return cleaned;
};

// ===== Clean text for copy (with JSON detection) =====
const cleanTextForCopy = (text: string) => {
  if (!text) return '';
  const formatted = formatText(text);
  if (formatted.startsWith('<pre>')) {
    return text;
  }
  let cleaned = formatted.replace(/^###\s*/gm, '');
  cleaned = cleaned.replace(/\n###\s*/g, '\n');
  cleaned = cleaned.replace(/^-\s*/gm, '• ');
  cleaned = cleaned.replace(/\*\*/g, '');
  return cleaned;
};

// ===== Safe array helper =====
const safeArray = <T,>(arr: T[] | undefined | null): T[] => {
  return Array.isArray(arr) ? arr : [];
};

// ===== Severity badge helper =====
function severityBadge(severity: string): string {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    info: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  };
  return map[severity] || map.info;
}

export default function AnalysisTab({
  fullAnalysis,
  isAdvanced,
  quickAnalysisText,
  snippet,
  onCopyFullAnalysis,
  onDownloadFullAnalysis,
}: AnalysisTabProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  // ============================================================
  // 🔥 تشخیص وجود فیلدهای کانونیکال
  // ============================================================
  const hasFindings = fullAnalysis?.findings && Array.isArray(fullAnalysis.findings) && fullAnalysis.findings.length > 0;
  const hasExecutionOverview = fullAnalysis?.executionOverview && typeof fullAnalysis.executionOverview === 'object';
  const hasArchitecturalObservations = fullAnalysis?.architecturalObservations && Array.isArray(fullAnalysis.architecturalObservations) && fullAnalysis.architecturalObservations.length > 0;
  const hasRecommendedActions = fullAnalysis?.recommendedActions && Array.isArray(fullAnalysis.recommendedActions) && fullAnalysis.recommendedActions.length > 0;
  const hasComplexity = fullAnalysis?.complexity && typeof fullAnalysis.complexity === 'object';
  const hasLimitations = fullAnalysis?.limitations && Array.isArray(fullAnalysis.limitations) && fullAnalysis.limitations.length > 0;
  const hasScorecardNew = fullAnalysis?.scorecard && typeof fullAnalysis.scorecard === 'object';
  const hasSuggestedTests = fullAnalysis?.suggestedTests && Array.isArray(fullAnalysis.suggestedTests) && fullAnalysis.suggestedTests.length > 0;

  // ============================================================
  // 🔥 استخراج امتیازات از scorecard_new
  // ============================================================
  const getScoreValue = (scoreItem: any): number | null => {
    if (!scoreItem) return null;
    if (typeof scoreItem === 'number') return scoreItem;
    if (typeof scoreItem === 'object' && scoreItem !== null) {
      if (typeof scoreItem.score === 'number') return scoreItem.score;
    }
    return null;
  };

  const scorecardDisplay = hasScorecardNew ? fullAnalysis.scorecard : null;

  // ============================================================
  // 🔥 تابع کپی و دانلود (ادغام با legacy)
  // ============================================================
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
      if (fullAnalysis.summary) {
        text += `📝 Summary:\n${safeString(fullAnalysis.summary)}\n\n`;
      }

      // Findings
      if (hasFindings) {
        text += `🔍 Findings:\n`;
        fullAnalysis.findings.forEach((f: any) => {
          text += `  • ${safeString(f.title)} [${safeString(f.severity)}] (${safeString(f.confidence)})\n`;
          if (f.evidence && f.evidence.length > 0) {
            f.evidence.forEach((ev: any) => {
              text += `    Lines ${ev.startLine}-${ev.endLine}: ${safeString(ev.code)}\n`;
            });
          }
          if (f.technicalExplanation) {
            text += `    Technical: ${safeString(f.technicalExplanation)}\n`;
          }
          if (f.remediation) {
            text += `    Fix: ${safeString(f.remediation)}\n`;
          }
        });
        text += `\n`;
      }

      // Execution Overview
      if (hasExecutionOverview) {
        const eo = fullAnalysis.executionOverview;
        text += `⚡ Execution Overview:\n`;
        if (eo.entryPoints && eo.entryPoints.length > 0) {
          text += `  Entry Points: ${eo.entryPoints.join(', ')}\n`;
        }
        if (eo.taskSubmissionPoints && eo.taskSubmissionPoints.length > 0) {
          text += `  Task Submission Points: ${eo.taskSubmissionPoints.join(', ')}\n`;
        }
        if (eo.blockingWaitPoints && eo.blockingWaitPoints.length > 0) {
          text += `  Blocking Wait Points: ${eo.blockingWaitPoints.join(', ')}\n`;
        }
        if (eo.sharedResources && eo.sharedResources.length > 0) {
          text += `  Shared Resources: ${eo.sharedResources.join(', ')}\n`;
        }
        if (eo.resourceLifecycle && eo.resourceLifecycle.length > 0) {
          text += `  Resource Lifecycle: ${eo.resourceLifecycle.join(', ')}\n`;
        }
        text += `\n`;
      }

      // Architectural Observations
      if (hasArchitecturalObservations) {
        text += `🏗️ Architectural Observations:\n`;
        fullAnalysis.architecturalObservations.forEach((obs: any) => {
          text += `  • ${safeString(obs.title)}: ${safeString(obs.explanation)}\n`;
        });
        text += `\n`;
      }

      // Recommended Actions
      if (hasRecommendedActions) {
        text += `🔧 Recommended Actions:\n`;
        fullAnalysis.recommendedActions.forEach((action: any) => {
          text += `  • [Priority ${action.priority}] ${safeString(action.title)}\n`;
          text += `    ${safeString(action.action)}\n`;
        });
        text += `\n`;
      }

      // Complexity
      if (hasComplexity) {
        const c = fullAnalysis.complexity;
        text += `📈 Complexity:\n`;
        if (c.applicable) {
          text += `  Expression: ${safeString(c.expression)}\n`;
          text += `  Explanation: ${safeString(c.explanation)}\n`;
          if (c.variables && c.variables.length > 0) {
            text += `  Variables:\n`;
            c.variables.forEach((v: any) => {
              text += `    • ${safeString(v.symbol)}: ${safeString(v.definition)}\n`;
            });
          }
          if (c.assumptions && c.assumptions.length > 0) {
            text += `  Assumptions: ${c.assumptions.join('; ')}\n`;
          }
        } else {
          text += `  Not applicable\n`;
        }
        text += `\n`;
      }

      // Scorecard
      if (hasScorecardNew) {
        const sc = fullAnalysis.scorecard as any;
        if (sc && typeof sc === 'object') {
          text += `📊 Scorecard:\n`;
          const categories = ['correctness', 'concurrencySafety', 'liveness', 'errorHandling', 'resourceManagement', 'maintainability', 'productionReadiness'];
          categories.forEach((cat) => {
            const item = sc[cat];
            if (item) {
              const score = getScoreValue(item);
              const label = cat.replace(/([A-Z])/g, ' $1').trim();
              text += `  ${label}: ${score !== null ? `${score}/100` : 'N/A'}\n`;
            }
          });
          text += `\n`;
        }
      }

      // Verdict
      if (fullAnalysis.verdict) {
        text += `🏁 Verdict:\n`;
        text += `  Status: ${safeString(fullAnalysis.verdict.status)}\n`;
        text += `  Explanation: ${safeString(fullAnalysis.verdict.explanation)}\n`;
        text += `\n`;
      }

      // Limitations
      if (hasLimitations) {
        text += `⚠️ Limitations:\n`;
        fullAnalysis.limitations.forEach((lim: string) => {
          text += `  • ${safeString(lim)}\n`;
        });
        text += `\n`;
      }
    } else if (fullAnalysis?.analysis) {
      text = formatText(fullAnalysis.analysis);
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

  // ============================================================
  // 🔥 نمایش Advanced (با فیلدهای کانونیکال)
  // ============================================================
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

        {/* ===== Title and Summary ===== */}
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a2e]">{safeString(fullAnalysis.card_title || fullAnalysis.title || 'Advanced Analysis')}</h2>
          {fullAnalysis.key_concept && (
            <p className="mt-2 text-[#4a4a6a] bg-blue-50 p-3 rounded-lg border border-blue-200">
              {safeString(fullAnalysis.key_concept)}
            </p>
          )}
          {fullAnalysis.summary && fullAnalysis.summary !== fullAnalysis.key_concept && (
            <p className="mt-2 text-[#4a4a6a] bg-gray-50 p-3 rounded-lg border border-gray-200">
              {safeString(fullAnalysis.summary)}
            </p>
          )}
        </div>

        {/* ===== Findings (کانونیکال) ===== */}
        {hasFindings && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-3">🔍 Findings</h3>
            <div className="space-y-3">
              {fullAnalysis.findings.map((finding: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-md border border-[#d0d0d8]">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#1a1a2e]">{safeString(finding.id)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge(finding.severity)}`}>
                      {safeString(finding.severity)}
                    </span>
                  </div>
                  <p className="text-sm text-[#1a1a2e] font-medium mt-1">{safeString(finding.title)}</p>
                  {finding.technicalExplanation && (
                    <p className="text-sm text-[#4a4a6a] mt-1">{safeString(finding.technicalExplanation)}</p>
                  )}
                  {finding.evidence && finding.evidence.length > 0 && (
                    <div className="mt-2 text-xs bg-[#f1f3f5] p-2 rounded border border-[#d0d0d8]">
                      <span className="text-[#6c7086]">Evidence: lines {finding.evidence.map((e: any) => `${e.startLine}-${e.endLine}`).join(', ')}</span>
                      <pre className="mt-1 text-[#1a1a2e] bg-white p-2 rounded border border-[#d0d0d8] overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                        {safeString(finding.evidence[0].code)}
                      </pre>
                      <p className="text-xs text-[#6c7086] mt-1">{safeString(finding.evidence[0].explanation)}</p>
                    </div>
                  )}
                  {finding.executionPath && finding.executionPath.length > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="text-[#6c7086]">Path: </span>
                      <span className="text-[#1a1a2e]">{finding.executionPath.join(' → ')}</span>
                    </div>
                  )}
                  {finding.triggerConditions && finding.triggerConditions.length > 0 && (
                    <div className="mt-1 text-xs">
                      <span className="text-[#6c7086]">Triggers: </span>
                      <span className="text-[#1a1a2e]">{finding.triggerConditions.join('; ')}</span>
                    </div>
                  )}
                  {finding.remediation && (
                    <div className="mt-2 text-xs text-[#43a047]">
                      <strong>Fix:</strong> {safeString(finding.remediation)}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-[#6c7086]">
                    Confidence: {safeString(finding.confidence)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Execution Overview ===== */}
        {hasExecutionOverview && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">⚡ Execution Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[#6c7086]">Entry Points:</span>
                <ul className="list-disc list-inside text-[#1a1a2e]">
                  {(fullAnalysis.executionOverview.entryPoints ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-[#6c7086]">Task Submission Points:</span>
                <ul className="list-disc list-inside text-[#1a1a2e]">
                  {(fullAnalysis.executionOverview.taskSubmissionPoints ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-[#6c7086]">Blocking Wait Points:</span>
                <ul className="list-disc list-inside text-[#1a1a2e]">
                  {(fullAnalysis.executionOverview.blockingWaitPoints ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-[#6c7086]">Shared Resources:</span>
                <ul className="list-disc list-inside text-[#1a1a2e]">
                  {(fullAnalysis.executionOverview.sharedResources ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div className="md:col-span-2">
                <span className="text-[#6c7086]">Resource Lifecycle:</span>
                <ul className="list-disc list-inside text-[#1a1a2e]">
                  {(fullAnalysis.executionOverview.resourceLifecycle ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ===== Architectural Observations ===== */}
        {hasArchitecturalObservations && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">🏗️ Architectural Observations</h3>
            <div className="space-y-2">
              {fullAnalysis.architecturalObservations.map((obs: any, idx: number) => (
                <div key={idx} className="border-b border-[#d0d0d8] pb-2 last:border-0">
                  <p className="font-medium text-[#1a1a2e]">{safeString(obs.title)}</p>
                  <p className="text-sm text-[#4a4a6a]">{safeString(obs.explanation)}</p>
                  {obs.relatedFindingIds && obs.relatedFindingIds.length > 0 && (
                    <p className="text-xs text-[#6c7086]">Related: {obs.relatedFindingIds.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Recommended Actions ===== */}
        {hasRecommendedActions && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">🔧 Recommended Actions</h3>
            <div className="space-y-2">
              {fullAnalysis.recommendedActions.map((action: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 border-b border-[#d0d0d8] pb-2 last:border-0">
                  <span className="text-xs text-[#6c7086] min-w-[24px]">#{action.priority}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1a1a2e]">{safeString(action.title)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge(action.severity)}`}>
                        {safeString(action.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-[#4a4a6a]">{safeString(action.action)}</p>
                    {action.relatedFindingIds && action.relatedFindingIds.length > 0 && (
                      <p className="text-xs text-[#6c7086]">Related: {action.relatedFindingIds.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Complexity ===== */}
        {hasComplexity && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">📈 Complexity</h3>
            {fullAnalysis.complexity.applicable ? (
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-[#6c7086]">Expression:</span>
                  <span className="text-[#1a1a2e] ml-2">{safeString(fullAnalysis.complexity.expression)}</span>
                </div>
                <div>
                  <span className="text-[#6c7086]">Explanation:</span>
                  <span className="text-[#1a1a2e] ml-2">{safeString(fullAnalysis.complexity.explanation)}</span>
                </div>
                {fullAnalysis.complexity.variables && fullAnalysis.complexity.variables.length > 0 && (
                  <div>
                    <span className="text-[#6c7086]">Variables:</span>
                    <ul className="list-disc list-inside text-[#1a1a2e]">
                      {fullAnalysis.complexity.variables.map((v: any, i: number) => (
                        <li key={i}>{safeString(v.symbol)}: {safeString(v.definition)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullAnalysis.complexity.assumptions && fullAnalysis.complexity.assumptions.length > 0 && (
                  <div>
                    <span className="text-[#6c7086]">Assumptions:</span>
                    <ul className="list-disc list-inside text-[#1a1a2e]">
                      {fullAnalysis.complexity.assumptions.map((a: string, i: number) => <li key={i}>{safeString(a)}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#6c7086]">Not applicable</p>
            )}
          </div>
        )}

        {/* ===== Suggested Tests (با تشخیص خودکار ساختار) ===== */}
        {hasSuggestedTests && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">🧪 Suggested Tests</h3>
            <div className="space-y-2">
              {fullAnalysis.suggestedTests.map((test: any, idx: number) => {
                // تشخیص ساختار داده: اگر test.title و test.steps وجود داشته باشد => جدید (Canonical)
                const isNew = test && typeof test === 'object' && test.title && test.steps && Array.isArray(test.steps);
                return (
                  <div key={idx} className="p-2 border-b border-[#d0d0d8] last:border-0">
                    {isNew ? (
                      // ===== نمایش جدید (Canonical) =====
                      <>
                        <p className="font-medium text-[#1a1a2e]">{safeString(test.title)}</p>
                        {test.purpose && <p className="text-sm text-[#4a4a6a]">Purpose: {safeString(test.purpose)}</p>}
                        {test.setup && test.setup.length > 0 && (
                          <div className="text-sm text-[#4a4a6a] mt-1">
                            <span className="font-medium">Setup:</span>
                            <ul className="list-disc list-inside ml-2">
                              {test.setup.map((step: string, i: number) => <li key={i}>{safeString(step)}</li>)}
                            </ul>
                          </div>
                        )}
                        {test.steps && test.steps.length > 0 && (
                          <div className="text-sm text-[#4a4a6a] mt-1">
                            <span className="font-medium">Steps:</span>
                            <ul className="list-disc list-inside ml-2">
                              {test.steps.map((step: string, i: number) => <li key={i}>{safeString(step)}</li>)}
                            </ul>
                          </div>
                        )}
                        {test.expectedResult && (
                          <div className="text-sm text-[#4a4a6a] mt-1">
                            <span className="font-medium">Expected:</span> {safeString(test.expectedResult)}
                          </div>
                        )}
                        {test.relatedFindingIds && test.relatedFindingIds.length > 0 && (
                          <div className="text-xs text-[#6c7086] mt-1">
                            Related: {test.relatedFindingIds.join(', ')}
                          </div>
                        )}
                      </>
                    ) : (
                      // ===== نمایش قدیمی (Legacy) =====
                      <>
                        <p className="font-medium text-[#1a1a2e]">{safeString(test.name)}</p>
                        {test.input && <p className="text-sm text-[#4a4a6a]">Input: {safeString(test.input)}</p>}
                        {test.expectedOutput && <p className="text-sm text-[#4a4a6a]">Expected: {safeString(test.expectedOutput)}</p>}
                        {test.type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            test.type === 'Invalid' ? 'bg-red-100 text-red-700' :
                            test.type === 'Edge' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {safeString(test.type)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Legacy sections (for backward compatibility) ===== */}
        {safeArray(fullAnalysis.codeWalkthrough).length > 0 && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">🧩 Code Walkthrough</h3>
            {safeArray(fullAnalysis.codeWalkthrough).map((item: LegacyCodeWalkthroughItem, idx: number) => (
              <div key={idx} className="border-b border-[#d0d0d8] pb-2 last:border-0">
                <p className="font-medium text-[#1a1a2e]">{safeString(item.section)}</p>
                <p className="text-sm text-[#4a4a6a]">{safeString(item.explanation)}</p>
              </div>
            ))}
          </div>
        )}

        {safeArray(fullAnalysis.whatWorksWell).length > 0 && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#43a047] mb-2">✅ What Works Well</h3>
            <ul className="list-disc list-inside text-sm text-[#4a4a6a]">
              {safeArray(fullAnalysis.whatWorksWell).map((item: string, idx: number) => <li key={idx}>{safeString(item)}</li>)}
            </ul>
          </div>
        )}

        {safeArray(fullAnalysis.bugsAndRiskyCases).length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-[#e53935]">🐛 Bugs and Risky Cases</h3>
            {safeArray(fullAnalysis.bugsAndRiskyCases).map((item: LegacyBugAndRiskyCase, idx: number) => (
              <div key={idx} className="border-b border-red-100 pb-2 last:border-0">
                <p className="font-semibold text-[#1a1a2e]">{safeString(item.issue)}</p>
                <p className="text-sm text-[#4a4a6a]">Impact: {safeString(item.impact)}</p>
                {item.example && <p className="text-sm text-[#4a4a6a]">Example: {safeString(item.example)}</p>}
              </div>
            ))}
          </div>
        )}

        {safeArray(fullAnalysis.edgeCases).length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-[#f57c00]">🧪 Edge Cases</h3>
            {safeArray(fullAnalysis.edgeCases).map((item: LegacyEdgeCase, idx: number) => (
              <div key={idx} className="border-b border-yellow-100 pb-2 last:border-0">
                <p className="font-medium text-[#1a1a2e]">{safeString(item.case)}</p>
                <p className="text-sm text-[#4a4a6a]">Current: {safeString(item.currentBehavior)}</p>
                <p className="text-sm text-[#4a4a6a]">Expected: {safeString(item.expectedBehavior)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.risk === 'High' ? 'bg-red-100 text-red-700' : item.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  Risk: {safeString(item.risk)}
                </span>
              </div>
            ))}
          </div>
        )}

        {fullAnalysis.performanceAnalysis && !hasComplexity && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">⚡ Performance Analysis</h3>
            {(() => {
              const pa = fullAnalysis.performanceAnalysis;
              let content = '';
              if (pa.timeComplexity && pa.timeComplexity.length > 0) {
                content += 'Time Complexity:\n';
                pa.timeComplexity.forEach((item: any) => {
                  content += `  • ${safeString(item.target)}: ${safeString(item.complexity)} (${safeString(item.explanation)})\n`;
                });
              }
              if (pa.spaceComplexity && pa.spaceComplexity.length > 0) {
                content += 'Space Complexity:\n';
                pa.spaceComplexity.forEach((item: any) => {
                  content += `  • ${safeString(item.target)}: ${safeString(item.complexity)} (${safeString(item.explanation)})\n`;
                });
              }
              if (pa.scalabilityNotes && pa.scalabilityNotes.length > 0) {
                content += 'Scalability Notes:\n';
                pa.scalabilityNotes.forEach((item: string) => {
                  content += `  • ${safeString(item)}\n`;
                });
              }
              return <pre className="text-sm text-[#4a4a6a] whitespace-pre-wrap">{content}</pre>;
            })()}
          </div>
        )}

        {fullAnalysis.securityAnalysis && (
          <div className={`p-4 rounded-lg border ${fullAnalysis.securityAnalysis.severity === 'Critical' ? 'bg-red-50 border-red-300' : fullAnalysis.securityAnalysis.severity === 'High' ? 'bg-orange-50 border-orange-300' : fullAnalysis.securityAnalysis.severity === 'Medium' ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-300'}`}>
            <h3 className="font-semibold text-[#1a1a2e]">🔒 Security Analysis</h3>
            <p className="text-sm">Severity: {safeString(fullAnalysis.securityAnalysis.severity)}</p>
            {fullAnalysis.securityAnalysis.issues && fullAnalysis.securityAnalysis.issues.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Issues:</span>
                {fullAnalysis.securityAnalysis.issues.map((issue: string, idx: number) => <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(issue)}</div>)}
              </div>
            )}
            {fullAnalysis.securityAnalysis.recommendations && fullAnalysis.securityAnalysis.recommendations.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Recommendations:</span>
                {fullAnalysis.securityAnalysis.recommendations.map((rec: string, idx: number) => <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(rec)}</div>)}
              </div>
            )}
          </div>
        )}

        {fullAnalysis.productionReadiness && (
          <div className={`p-4 rounded-lg border ${fullAnalysis.productionReadiness.isProductionReady ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <h3 className="font-semibold text-[#1a1a2e]">🛡️ Production Readiness</h3>
            <p className="text-sm">Ready: {fullAnalysis.productionReadiness.isProductionReady ? '✅ Yes' : '❌ No'}</p>
            {fullAnalysis.productionReadiness.reasons && fullAnalysis.productionReadiness.reasons.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Reasons:</span>
                {fullAnalysis.productionReadiness.reasons.map((reason: string, idx: number) => <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(reason)}</div>)}
              </div>
            )}
            {fullAnalysis.productionReadiness.requiredChanges && fullAnalysis.productionReadiness.requiredChanges.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-sm">Required Changes:</span>
                {fullAnalysis.productionReadiness.requiredChanges.map((change: string, idx: number) => <div key={idx} className="text-sm text-[#4a4a6a] ml-4">• {safeString(change)}</div>)}
              </div>
            )}
          </div>
        )}

        {safeArray(fullAnalysis.recommendedImprovements).length > 0 && !hasRecommendedActions && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">🔧 Recommended Improvements</h3>
            {safeArray(fullAnalysis.recommendedImprovements).map((item: LegacyRecommendedImprovement, idx: number) => (
              <div key={idx} className="flex items-start gap-2 p-2 border-b border-[#d0d0d8] last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.priority === 'High' ? 'bg-red-100 text-red-700' : item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {safeString(item.priority)}
                </span>
                <div>
                  <p className="font-medium text-[#1a1a2e]">{safeString(item.improvement)}</p>
                  <p className="text-sm text-[#4a4a6a]">{safeString(item.reason)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {fullAnalysis.improvedCode && fullAnalysis.improvedCode.available && (
          <div className="bg-[#e8f5e9] p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-[#43a047] mb-2">✨ Improved Code</h3>
            <p className="text-sm text-[#4a4a6a]">Notes: {safeString(fullAnalysis.improvedCode.notes)}</p>
            <pre className="mt-2 p-3 bg-[#1a1a2e] text-[#cdd6f4] rounded-md overflow-x-auto text-sm font-mono">
              {safeString(fullAnalysis.improvedCode.code)}
            </pre>
          </div>
        )}

        {/* ===== Scorecard (با پشتیبانی از scorecard_new) ===== */}
        {hasScorecardNew && scorecardDisplay && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#4a86f7] mb-2">📊 Scorecard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(scorecardDisplay).map(([key, value]: [string, any]) => {
                const score = getScoreValue(value);
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                const isApplicable = value?.applicable !== false;
                return (
                  <div key={key} className="bg-white p-2 rounded text-center border border-[#d0d0d8]">
                    <p className="text-xs text-[#6c7086] capitalize">{label}</p>
                    <p className="text-lg font-bold text-[#1a1a2e]">
                      {isApplicable && score !== null ? `${score}/100` : 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Verdict ===== */}
        {fullAnalysis.verdict && (
          <div className={`p-4 rounded-lg border ${fullAnalysis.verdict.status === 'approved' || fullAnalysis.verdict.status === 'approved-with-suggestions' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <h3 className="font-semibold text-[#1a1a2e]">🏁 Verdict</h3>
            <p className="mt-1 text-sm text-[#4a4a6a]">
              <span className="font-medium">Status:</span> {safeString(fullAnalysis.verdict.status)}
            </p>
            <p className="mt-1 text-sm text-[#4a4a6a]">{safeString(fullAnalysis.verdict.explanation)}</p>
          </div>
        )}

        {/* ===== Limitations ===== */}
        {hasLimitations && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <h3 className="font-semibold text-[#e53935] mb-2">⚠️ Limitations</h3>
            <ul className="list-disc list-inside text-sm text-[#4a4a6a]">
              {fullAnalysis.limitations.map((lim: string, idx: number) => <li key={idx}>{safeString(lim)}</li>)}
            </ul>
          </div>
        )}

        {/* ===== Debug info (if available) ===== */}
        {(fullAnalysis as any).debug_trace && process.env.NODE_ENV === 'development' && (
          <details className="bg-[#f8f9fa] p-4 rounded-lg border border-[#d0d0d8]">
            <summary className="cursor-pointer text-sm font-medium text-[#1a1a2e]">🔍 Debug Trace</summary>
            <pre className="mt-2 text-xs text-[#4a4a6a] whitespace-pre-wrap bg-white p-3 rounded border border-[#d0d0d8] max-h-[200px] overflow-y-auto">
              {JSON.stringify((fullAnalysis as any).debug_trace, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // ============================================================
  // 🔥 Simple / Medium mode
  // ============================================================
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