// components/snippet/SnippetFullAnalysis.tsx

'use client';

import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import logger from '@/lib/logger';
import {
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

export interface Evidence {
  startLine: number;
  endLine: number;
  code: string;
  explanation: string;
}

export interface Finding {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'definite' | 'likely' | 'conditional';
  evidence: Evidence[];
  executionPath: string[];
  triggerConditions: string[];
  consequence: string;
  technicalExplanation: string;
  remediation: string;
  relatedSymbols: string[];
  testToReproduce: {
    title: string;
    setup: string[];
    steps: string[];
    expectedResult: string;
  } | null;
}

export interface ScorecardLegacy {
  correctness: number;
  readability: number;
  performance: number;
  maintainability: number;
  productionReadiness: number;
  security?: number;
  overall?: number;
}

export type ScoreItemValue = number | { score: number; reason: string; relatedFindingIds: string[] };

export interface ScorecardNew {
  correctness: ScoreItemValue;
  concurrencySafety: ScoreItemValue;
  liveness: ScoreItemValue;
  errorHandling: ScoreItemValue;
  resourceManagement: ScoreItemValue;
  maintainability: ScoreItemValue;
  productionReadiness: ScoreItemValue;
}

export interface VerdictNew {
  status: 'not-production-ready' | 'requires-major-changes' | 'requires-minor-changes' | 'production-ready-with-monitoring';
  explanation: string;
}

export interface UnifiedTest {
  title: string;
  purpose: string;
  setup: string[];
  steps: string[];
  expectedResult: string;
  _legacy?: {
    name?: string;
    input?: string;
    expectedOutput?: string;
    type?: 'Normal' | 'Edge' | 'Invalid';
  };
}

export interface SnippetFullAnalysisProps {
  snippet: any;
}

const languageExtensions: Record<string, Extension> = {
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  python: python(),
  java: java(),
  rust: rust(),
  go: go(),
  html: html(),
  css: css(),
  json: json(),
  cpp: cpp(),
  php: php(),
};

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-[#6c7086]">Not available</span>;
  }

  if (typeof value === 'string') {
    return <p className="whitespace-pre-wrap text-[#cdd6f4]">{value}</p>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-[#cdd6f4]">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-[#6c7086]">No items</span>;
    }

    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      return (
        <ul className="space-y-2 text-[#cdd6f4]">
          {value.map((item: any, idx: number) => (
            <li key={idx} className="border-b border-[#313244] pb-2 last:border-0">
              {Object.entries(item).map(([k, v]: [string, any]) => {
                const display = typeof v === 'string' ? v : JSON.stringify(v);
                return (
                  <div key={k} className="text-sm">
                    <span className="text-[#6c7086]">{k}:</span>{' '}
                    <span className="text-[#cdd6f4]">{display}</span>
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="list-disc list-inside space-y-1 text-[#cdd6f4]">
        {value.map((item: any, idx: number) => (
          <li key={idx}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="text-sm text-[#cdd6f4] space-y-1">
        {Object.entries(value).map(([key, val]: [string, any]) => {
          const display = typeof val === 'string' ? val : JSON.stringify(val);
          return (
            <div key={key}>
              <span className="text-[#6c7086]">{key}:</span> {display}
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="text-[#cdd6f4]">{String(value)}</span>;
}

function normalizeTests(
  testsNew: any[] | undefined,
  testsLegacy: any[] | undefined
): UnifiedTest[] {
  if (testsNew && testsNew.length > 0) {
    return testsNew.map((t: any) => ({
      title: t.title || 'Test',
      purpose: t.purpose || '',
      setup: t.setup || [],
      steps: t.steps || [],
      expectedResult: t.expectedResult || '',
      _legacy: undefined,
    }));
  }

  if (testsLegacy && testsLegacy.length > 0) {
    return testsLegacy.map((t: any) => ({
      title: t.name || 'Test',
      purpose: t.input || '',
      setup: [],
      steps: [],
      expectedResult: t.expectedOutput || '',
      _legacy: {
        name: t.name,
        input: t.input,
        expectedOutput: t.expectedOutput,
        type: t.type,
      },
    }));
  }

  return [];
}

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

export default function SnippetFullAnalysis({ snippet }: SnippetFullAnalysisProps) {
  const { scorecardDisplay, scorecardIsNew, scorecardMax } = useMemo(() => {
    let display = null;
    let isNew = false;

    if (snippet?.audit_result?.scorecard) {
      display = snippet.audit_result.scorecard;
      isNew = true;
    } else if (snippet?.scorecard_new) {
      display = snippet.scorecard_new;
      isNew = true;
    } else if (snippet?.scorecard) {
      display = snippet.scorecard;
      isNew = false;
    }

    let max = 10;

    if (display && typeof display === 'object') {
      const allScores: number[] = [];
      for (const key of Object.keys(display)) {
        const item = (display as any)[key];
        if (item && typeof item === 'object' && typeof item.score === 'number') {
          allScores.push(item.score);
        } else if (typeof item === 'number') {
          allScores.push(item);
        }
      }

      if (allScores.length > 0) {
        const maxScore = Math.max(...allScores);
        max = maxScore > 10 ? 100 : 10;
      }
    }

    return { scorecardDisplay: display, scorecardIsNew: isNew, scorecardMax: max };
  }, [snippet]);

  const suggestedTests = useMemo(
    () => normalizeTests(
      snippet?.audit_result?.suggestedTests || snippet?.suggested_tests_new,
      snippet?.suggested_tests
    ),
    [snippet]
  );

  const verdictDisplay = useMemo(() => {
    if (snippet?.audit_result?.verdict) return snippet.audit_result.verdict;
    if (snippet?.verdict) return snippet.verdict;
    if (snippet?.final_verdict_summary) {
      return {
        status: snippet.final_verdict_approved ? 'production-ready-with-monitoring' : 'requires-major-changes',
        explanation: snippet.final_verdict_summary + (snippet.final_verdict_next_steps ? ` Next steps: ${snippet.final_verdict_next_steps}` : ''),
      };
    }
    return null;
  }, [snippet]);

  const hasFindings = useMemo(
    () => !!(snippet?.audit_result?.findings?.length || snippet?.findings?.length),
    [snippet]
  );

  const showLegacyBugEdge = !hasFindings;

  const hasContent = useMemo(() => {
    const result = !!(snippet?.card_title ||
      snippet?.key_concept ||
      snippet?.code_walkthrough ||
      snippet?.what_works_well ||
      (!hasFindings && (snippet?.bugs_and_risky_cases || snippet?.edge_cases)) ||
      snippet?.performance_analysis ||
      snippet?.security_analysis ||
      snippet?.production_readiness ||
      snippet?.recommended_improvements ||
      snippet?.improved_code ||
      snippet?.suggested_tests ||
      snippet?.scorecard ||
      snippet?.final_verdict_summary ||
      hasFindings ||
      snippet?.execution_overview ||
      snippet?.architectural_observations ||
      snippet?.recommended_actions ||
      snippet?.suggested_tests_new ||
      snippet?.complexity ||
      snippet?.scorecard_new ||
      snippet?.verdict ||
      snippet?.limitations ||
      snippet?.audit_result);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('[SnippetFullAnalysis] hasContent:', result);
    }

    return result;
  }, [snippet, hasFindings]);

  if (!hasContent) {
    return (
      <div className="mt-8 pt-6 border-t border-[#313244]">
        <div className="bg-[#11111b] p-6 rounded-lg border border-[#313244] text-center">
          <p className="text-[#a6adc8] text-sm">
            📊 Full report has not been generated for this snippet yet.
          </p>
          <p className="text-[#6c7086] text-xs mt-2">
            Generate a full analysis to see detailed insights including code walkthrough,
            performance analysis, security review, and more.
          </p>
        </div>
      </div>
    );
  }

  const language = snippet.language || 'javascript';
  const langExtension = languageExtensions[language] || javascript();

  const findings = snippet?.audit_result?.findings || snippet?.findings || [];
  const executionOverview = snippet?.audit_result?.executionOverview || snippet?.execution_overview || null;
  const architecturalObservations = snippet?.audit_result?.architecturalObservations || snippet?.architectural_observations || [];
  const recommendedActions = snippet?.audit_result?.recommendedActions || snippet?.recommended_actions || [];
  const complexity = snippet?.audit_result?.complexity || snippet?.complexity || null;
  const limitations = snippet?.audit_result?.limitations || snippet?.limitations || [];
  const improvedCode = snippet?.audit_result?.improvedCode || snippet?.improved_code || null;
  const linkedinPost = snippet?.audit_result?.linkedinPost || snippet?.linkedin_post || null;

  return (
    <div className="mt-8 pt-6 border-t border-[#313244]">
      <h2 className="text-2xl font-bold text-white mb-4">📊 Full Analysis</h2>

      <div className="space-y-4 text-[#cdd6f4]">
        {snippet.card_title && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">📌 Title</h3>
            <p className="text-[#cdd6f4]">{snippet.card_title}</p>
          </div>
        )}

        {snippet.key_concept && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">💡 High-Level Summary</h3>
            <p className="text-[#cdd6f4] whitespace-pre-wrap">{snippet.key_concept}</p>
          </div>
        )}

        {snippet.code_walkthrough && snippet.code_walkthrough.length > 0 && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🧩 Code Walkthrough</h3>
            <div className="space-y-2 mt-2">
              {snippet.code_walkthrough.map((item: LegacyCodeWalkthroughItem, idx: number) => (
                <div key={idx} className="border-b border-[#313244] pb-2 last:border-0">
                  <p className="font-medium text-[#89b4fa]">{item.section}</p>
                  <p className="text-sm text-[#cdd6f4]">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {snippet.what_works_well && snippet.what_works_well.length > 0 && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#a6e3a1]">✅ What Works Well</h3>
            <ul className="list-disc list-inside space-y-1 text-[#cdd6f4]">
              {snippet.what_works_well.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}

        {showLegacyBugEdge && (
          <>
            {snippet.bugs_and_risky_cases && snippet.bugs_and_risky_cases.length > 0 && (
              <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
                <h3 className="text-lg font-semibold text-[#f38ba8]">🐛 Bugs and Risky Cases</h3>
                {snippet.bugs_and_risky_cases.map((item: LegacyBugAndRiskyCase, idx: number) => (
                  <div key={idx} className="mt-2 border-b border-[#313244] pb-2 last:border-0">
                    <p className="font-medium text-[#f38ba8]">{item.issue}</p>
                    <p className="text-sm text-[#cdd6f4]">Impact: {item.impact}</p>
                    {item.example && <p className="text-sm text-[#6c7086]">Example: {item.example}</p>}
                  </div>
                ))}
              </div>
            )}

            {snippet.edge_cases && snippet.edge_cases.length > 0 && (
              <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
                <h3 className="text-lg font-semibold text-[#89b4fa]">🧪 Edge Cases</h3>
                {snippet.edge_cases.map((item: LegacyEdgeCase, idx: number) => (
                  <div key={idx} className="mt-2 border-b border-[#313244] pb-2 last:border-0">
                    <p className="font-medium text-[#89b4fa]">{item.case}</p>
                    <p className="text-sm text-[#cdd6f4]">Current: {item.currentBehavior}</p>
                    <p className="text-sm text-[#cdd6f4]">Expected: {item.expectedBehavior}</p>
                    <p className="text-sm text-[#6c7086]">Risk: {item.risk}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {hasFindings && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🔍 Findings</h3>
            <div className="space-y-4 mt-2">
              {findings.map((finding: any, idx: number) => (
                <div key={finding.id || idx} className="bg-[#1e1e2e] p-3 rounded-md border border-[#313244]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[#89b4fa]">{finding.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium mt-1">{finding.title}</p>
                  <p className="text-sm text-[#a6adc8] mt-1">{finding.technicalExplanation || finding.consequence}</p>

                  {finding.evidence && finding.evidence.length > 0 && (
                    <div className="mt-2 text-xs text-[#6c7086]">
                      <span>Evidence: lines {finding.evidence.map((e: any) => `${e.startLine}-${e.endLine}`).join(', ')}</span>
                      <pre className="mt-1 text-[#cdd6f4] bg-[#11111b] p-2 rounded border border-[#313244] overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                        {finding.evidence[0].code}
                      </pre>
                      <p className="text-xs text-[#6c7086] mt-1">{finding.evidence[0].explanation}</p>
                    </div>
                  )}

                  {finding.executionPath && finding.executionPath.length > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="text-[#6c7086]">Path: </span>
                      <span className="text-[#cdd6f4]">{finding.executionPath.join(' → ')}</span>
                    </div>
                  )}

                  {finding.triggerConditions && finding.triggerConditions.length > 0 && (
                    <div className="mt-1 text-xs">
                      <span className="text-[#6c7086]">Triggers: </span>
                      <span className="text-[#cdd6f4]">{finding.triggerConditions.join('; ')}</span>
                    </div>
                  )}

                  {finding.remediation && (
                    <div className="mt-2 text-xs text-[#a6e3a1]">
                      <strong>Fix:</strong> {finding.remediation}
                    </div>
                  )}

                  <div className="mt-1 text-xs text-[#6c7086]">
                    Confidence: {finding.confidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {executionOverview && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">⚡ Execution Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className="text-[#6c7086]">Entry Points:</span>
                <ul className="list-disc list-inside text-[#cdd6f4]">
                  {(executionOverview.entryPoints ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-[#6c7086]">Task Submission Points:</span>
                <ul className="list-disc list-inside text-[#cdd6f4]">
                  {(executionOverview.taskSubmissionPoints ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-[#6c7086]">Blocking Wait Points:</span>
                <ul className="list-disc list-inside text-[#cdd6f4]">
                  {(executionOverview.blockingWaitPoints ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-[#6c7086]">Shared Resources:</span>
                <ul className="list-disc list-inside text-[#cdd6f4]">
                  {(executionOverview.sharedResources ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div className="md:col-span-2">
                <span className="text-[#6c7086]">Resource Lifecycle:</span>
                <ul className="list-disc list-inside text-[#cdd6f4]">
                  {(executionOverview.resourceLifecycle ?? []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {architecturalObservations.length > 0 && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🏗️ Architectural Observations</h3>
            <div className="space-y-2 mt-2">
              {architecturalObservations.map((obs: any, idx: number) => (
                <div key={idx} className="border-b border-[#313244] pb-2 last:border-0">
                  <p className="font-medium text-[#89b4fa]">{obs.title}</p>
                  <p className="text-sm text-[#cdd6f4]">{obs.explanation}</p>
                  {obs.relatedFindingIds && obs.relatedFindingIds.length > 0 && (
                    <p className="text-xs text-[#6c7086]">Related findings: {obs.relatedFindingIds.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendedActions.length > 0 && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#a6e3a1]">🔧 Recommended Actions</h3>
            <div className="space-y-2 mt-2">
              {recommendedActions.map((action: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 border-b border-[#313244] pb-2 last:border-0">
                  <span className="text-xs text-[#6c7086] min-w-[24px]">#{action.priority}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#a6e3a1]">{action.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge(action.severity)}`}>
                        {action.severity}
                      </span>
                    </div>
                    <p className="text-sm text-[#cdd6f4]">{action.action}</p>
                    {action.relatedFindingIds && action.relatedFindingIds.length > 0 && (
                      <p className="text-xs text-[#6c7086]">Related: {action.relatedFindingIds.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {complexity && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">📈 Complexity</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              {complexity.applicable ? (
                <>
                  <div className="col-span-2">
                    <span className="text-[#6c7086]">Expression:</span>
                    <span className="text-[#cdd6f4] ml-2">{complexity.expression || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#6c7086]">Explanation:</span>
                    <span className="text-[#cdd6f4] ml-2">{complexity.explanation || 'N/A'}</span>
                  </div>
                  {complexity.variables && complexity.variables.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-[#6c7086]">Variables:</span>
                      <ul className="list-disc list-inside text-[#cdd6f4]">
                        {complexity.variables.map((v: any, i: number) => (
                          <li key={i}>{v.symbol}: {v.definition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {complexity.assumptions && complexity.assumptions.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-[#6c7086]">Assumptions:</span>
                      <ul className="list-disc list-inside text-[#cdd6f4]">
                        {complexity.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-2 text-[#6c7086]">Not applicable</div>
              )}
            </div>
          </div>
        )}

        {snippet.performance_analysis && !complexity && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">⚡ Performance Analysis</h3>
            {renderValue(snippet.performance_analysis)}
          </div>
        )}

        {snippet.security_analysis && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#f38ba8]">🔒 Security Analysis</h3>
            {renderValue(snippet.security_analysis)}
          </div>
        )}

        {snippet.production_readiness && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🛡️ Production Readiness</h3>
            {renderValue(snippet.production_readiness)}
          </div>
        )}

        {snippet.recommended_improvements && snippet.recommended_improvements.length > 0 && !recommendedActions.length && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#a6e3a1]">🔧 Recommended Improvements</h3>
            <ul className="list-disc list-inside space-y-1 text-[#cdd6f4]">
              {snippet.recommended_improvements.map((item: any, idx: number) => (
                <li key={idx}>
                  <span className="font-medium text-[#a6e3a1]">{item.improvement}</span>
                  <span className="text-xs text-[#6c7086] ml-2">({item.priority})</span>
                  <p className="text-sm text-[#cdd6f4] ml-4">{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvedCode && improvedCode.available && improvedCode.code && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">✨ Improved Code</h3>
            <div className="mt-2 border border-[#313244] rounded-lg overflow-hidden">
              <CodeMirror
                value={improvedCode.code}
                height="auto"
                theme="dark"
                extensions={[langExtension, EditorView.lineWrapping]}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: false,
                  foldGutter: true,
                  autocompletion: false,
                  tabSize: 2,
                }}
                readOnly={true}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {suggestedTests.length > 0 && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🧪 Suggested Tests</h3>
            <div className="space-y-2 mt-2">
              {suggestedTests.map((test: any, idx: number) => (
                <div key={idx} className="border-b border-[#313244] pb-2 last:border-0">
                  <p className="font-medium text-[#89b4fa]">{test.title}</p>
                  {test.purpose && <p className="text-sm text-[#cdd6f4]">{test.purpose}</p>}
                  {test.setup && test.setup.length > 0 && (
                    <div className="text-xs text-[#6c7086] mt-1">
                      Setup: {test.setup.join('; ')}
                    </div>
                  )}
                  {test.steps && test.steps.length > 0 && (
                    <div className="text-xs text-[#6c7086] mt-1">
                      Steps: {test.steps.join('; ')}
                    </div>
                  )}
                  {test.expectedResult && (
                    <div className="text-xs text-[#a6e3a1] mt-1">
                      Expected: {test.expectedResult}
                    </div>
                  )}
                  {test._legacy && test._legacy.type && (
                    <div className="text-xs text-[#6c7086] mt-1">
                      Type: {test._legacy.type}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {scorecardDisplay && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">
              📊 Scorecard {scorecardIsNew && scorecardMax === 100 ? '(New)' : ''}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {Object.entries(scorecardDisplay).map(([key, value]: [string, any]) => {
                let num = 0;
                if (typeof value === 'number') {
                  num = value;
                } else if (value && typeof value === 'object' && typeof (value as any).score === 'number') {
                  num = (value as any).score;
                }

                return (
                  <div key={key} className="bg-[#1e1e2e] p-2 rounded-md text-center border border-[#313244]">
                    <p className="text-xs text-[#6c7086] capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="text-lg font-bold text-white">
                      {num}/{scorecardMax}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {verdictDisplay && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🏁 Verdict</h3>
            <div className="mt-2 space-y-1">
              <p className="text-sm">
                <span className="text-[#6c7086]">Status:</span>{' '}
                <span className={`font-medium ${
                  verdictDisplay.status === 'production-ready-with-monitoring' ? 'text-[#a6e3a1]' :
                  verdictDisplay.status === 'requires-minor-changes' ? 'text-[#f9e2af]' :
                  verdictDisplay.status === 'requires-major-changes' ? 'text-[#f38ba8]' :
                  'text-[#f38ba8]'
                }`}>
                  {verdictDisplay.status}
                </span>
              </p>
              {verdictDisplay.explanation && (
                <p className="text-sm text-[#a6adc8]">{verdictDisplay.explanation}</p>
              )}
            </div>
          </div>
        )}

        {limitations.length > 0 && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#f38ba8]">⚠️ Limitations</h3>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-[#a6adc8]">
              {limitations.map((lim: string, idx: number) => <li key={idx}>{lim}</li>)}
            </ul>
          </div>
        )}

        {linkedinPost && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">💼 LinkedIn Post</h3>
            <p className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap">{linkedinPost}</p>
          </div>
        )}
      </div>
    </div>
  );
}