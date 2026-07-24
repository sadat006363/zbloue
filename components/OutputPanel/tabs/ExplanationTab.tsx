// components/OutputPanel/tabs/ExplanationTab.tsx

'use client';

import { safeString } from '@/lib/utils';
import { useState, useMemo } from 'react';
import logger from '@/lib/logger';

// ============================================================
// Types
// ============================================================

interface Evidence {
  startLine: number;
  endLine: number;
  code: string;
  explanation: string;
}

interface Finding {
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

interface Complexity {
  time: string;
  space: string;
  resourceGrowth?: string;
  assumptions?: string[];
  // Canonical shape
  applicable?: boolean;
  expression?: string;
  explanation?: string;
  variables?: Array<{ symbol: string; definition: string }>;
}

interface Verdict {
  status: string;
  explanation: string;
}

interface FullAnalysis {
  title?: string;
  summary?: string;
  highLevelSummary?: string;
  findings?: unknown;
  complexity?: unknown;
  verdict?: unknown;
  limitations?: string[];
  card_title?: string;
  key_concept?: string;
  analysis?: string;
  debug_analysis?: string;
  optimization?: string;
  [key: string]: unknown;
}

// ============================================================
// Component Props
// ============================================================

interface ExplanationTabProps {
  snippet: any;
  isAdvanced: boolean;
  quickAnalysisText: string | null;
  analysisText: string;
  debugAnalysis: string;
  optimization: string;
  keyConcept: string;
  cardTitle: string;
  fullAnalysis?: FullAnalysis | null;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * تشخیص اینکه آیا fullAnalysis ساختار Canonical دارد یا Legacy
 */
function isCanonicalAnalysis(analysis: FullAnalysis | null | undefined): boolean {
  if (!analysis) return false;
  return !!(analysis.findings || analysis.complexity || analysis.verdict);
}

/**
 * استخراج عنوان از fullAnalysis
 */
function getTitle(analysis: FullAnalysis | null | undefined, fallback: string): string {
  if (!analysis) return fallback;
  return safeString(analysis.title || analysis.card_title || fallback);
}

/**
 * استخراج خلاصه از fullAnalysis
 */
function getSummary(analysis: FullAnalysis | null | undefined): string | null {
  if (!analysis) return null;
  return safeString(analysis.summary || analysis.highLevelSummary || null);
}

/**
 * 🔥 نرمالایز کردن Findings (پذیرش any به جای unknown)
 */
function normalizeFindings(findings: unknown): Finding[] {
  if (!Array.isArray(findings)) return [];
  return findings.filter((f): f is Finding => {
    if (!f || typeof f !== 'object') return false;
    const obj = f as Record<string, unknown>;
    return typeof obj.id === 'string' && typeof obj.title === 'string';
  });
}

/**
 * نرمالایز کردن Complexity
 */
function normalizeComplexity(complexity: unknown): Complexity | null {
  if (!complexity || typeof complexity !== 'object') return null;
  const c = complexity as Record<string, unknown>;

  if ('time' in c && typeof c.time === 'string') {
    return {
      time: c.time,
      space: typeof c.space === 'string' ? c.space : 'unknown',
      resourceGrowth: typeof c.resourceGrowth === 'string' ? c.resourceGrowth : undefined,
      assumptions: Array.isArray(c.assumptions) ? (c.assumptions as string[]) : undefined,
    };
  }

  if ('applicable' in c && c.applicable === true) {
    return {
      time: typeof c.expression === 'string' ? c.expression : 'unknown',
      space: 'unknown',
      resourceGrowth: typeof c.explanation === 'string' ? c.explanation : undefined,
      assumptions: Array.isArray(c.assumptions) ? (c.assumptions as string[]) : undefined,
    };
  }

  return null;
}

/**
 * نرمالایز کردن Verdict
 */
function normalizeVerdict(verdict: unknown): Verdict | null {
  if (!verdict || typeof verdict !== 'object') return null;
  const v = verdict as Record<string, unknown>;
  if (typeof v.status === 'string' && typeof v.explanation === 'string') {
    return { status: v.status, explanation: v.explanation };
  }
  return null;
}

// ============================================================
// Main Component
// ============================================================

export default function ExplanationTab({
  snippet,
  isAdvanced,
  quickAnalysisText,
  analysisText,
  debugAnalysis,
  optimization,
  keyConcept,
  cardTitle,
  fullAnalysis,
}: ExplanationTabProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const isCanonical = useMemo(() => isCanonicalAnalysis(fullAnalysis), [fullAnalysis]);

  const normalizedFindings = useMemo(() => {
    if (!fullAnalysis) return [];
    return normalizeFindings(fullAnalysis.findings);
  }, [fullAnalysis]);

  const normalizedComplexity = useMemo(() => {
    if (!fullAnalysis) return null;
    return normalizeComplexity(fullAnalysis.complexity);
  }, [fullAnalysis]);

  const normalizedVerdict = useMemo(() => {
    if (!fullAnalysis) return null;
    return normalizeVerdict(fullAnalysis.verdict);
  }, [fullAnalysis]);

  const title = useMemo(() => getTitle(fullAnalysis, cardTitle), [fullAnalysis, cardTitle]);
  const summary = useMemo(() => getSummary(fullAnalysis), [fullAnalysis]);

  if (process.env.NODE_ENV === 'development') {
    logger.debug('[ExplanationTab] fullAnalysis:', fullAnalysis);
    logger.debug('[ExplanationTab] isAdvanced:', isAdvanced);
    logger.debug('[ExplanationTab] quickAnalysisText:', quickAnalysisText);
    logger.debug('[ExplanationTab] isCanonical:', isCanonical);
    logger.debug('[ExplanationTab] normalizedFindings:', normalizedFindings.length);
  }

  // ============================================================
  // Get Full Content for Copy/Download
  // ============================================================

  const getFullContent = (): string => {
    let content = '';

    if (isAdvanced && fullAnalysis) {
      content += `📌 ${safeString(title)}\n\n`;

      if (summary) {
        content += `💡 Summary:\n${summary}\n\n`;
      }

      if (normalizedFindings.length > 0) {
        content += `🔍 Findings:\n`;
        normalizedFindings.forEach((f) => {
          content += `  • ${safeString(f.title)} [${safeString(f.severity)}] (${safeString(f.confidence)})\n`;
          content += `    ${safeString(f.consequence)}\n`;
          if (f.remediation) content += `    Fix: ${safeString(f.remediation)}\n`;
        });
        content += '\n';
      }

      if (normalizedComplexity) {
        content += `⚡ Complexity: Time ${safeString(normalizedComplexity.time)} | Space ${safeString(normalizedComplexity.space)}\n`;
        if (normalizedComplexity.resourceGrowth) {
          content += `   Resource Growth: ${safeString(normalizedComplexity.resourceGrowth)}\n`;
        }
        content += '\n';
      }

      if (normalizedVerdict) {
        content += `🏁 Verdict: ${safeString(normalizedVerdict.status)} - ${safeString(normalizedVerdict.explanation)}\n\n`;
      }

      if (fullAnalysis.limitations && fullAnalysis.limitations.length > 0) {
        content += `⚠️ Limitations:\n`;
        fullAnalysis.limitations.forEach((lim: string) => {
          content += `  • ${safeString(lim)}\n`;
        });
        content += '\n';
      }
    } else if (isAdvanced) {
      content += `📌 ${safeString(cardTitle)}\n\n`;
      content += `💡 Key Concept:\n${safeString(keyConcept)}\n\n`;
      content += `🔍 What This Code Does:\n${safeString(analysisText)}\n\n`;
      if (debugAnalysis && debugAnalysis !== '-') {
        content += `🐛 Debug Analysis:\n${safeString(debugAnalysis)}\n\n`;
      }
      if (optimization && optimization !== '-') {
        content += `⚡ Optimization:\n${safeString(optimization)}\n\n`;
      }
    } else {
      content += `📌 ${safeString(cardTitle)}\n\n`;
      content += `📝 Summary:\n${safeString(keyConcept)}\n\n`;
      if (debugAnalysis && debugAnalysis !== '-') {
        content += `🐛 Debug Analysis:\n${safeString(debugAnalysis)}\n\n`;
      }
    }

    return content;
  };

  const fullContent = getFullContent();

  // ============================================================
  // Handlers
  // ============================================================

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(fullContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = (): void => {
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explanation-${snippet?.slug || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // Render Helpers
  // ============================================================

  const cleanDuplicateIcons = (text: string): string => {
    if (!text) return '';
    const iconPattern = /^[📝🐛⚡💡🔍🔧✅🧪🔒💼🖼️📊📌⭐🔬🚨🛡️✨📈🧩🏗️🔧🧪⚠️🏁]\s*/;
    return text.replace(iconPattern, '');
  };

  const formatText = (text: string): string => {
    if (!text) return '';
    let formatted = text.replace(/^###\s*/gm, '');
    const lines = formatted.split('\n');
    const cleanedLines = lines.map((line) => cleanDuplicateIcons(line));
    formatted = cleanedLines.join('\n');
    formatted = formatted.replace(/^-\s*/gm, '• ');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted;
  };

  const renderSection = (title: string, content: string) => {
    if (!content || content === '-') return null;

    const iconMap: Record<string, string> = {
      summary: '📝',
      'key concept': '💡',
      'what this code does': '🔍',
      'debug analysis': '🐛',
      optimization: '⚡',
      'high-level summary': '💡',
      findings: '🔍',
      verdict: '🏁',
      complexity: '⚡',
      limitations: '⚠️',
    };

    const lowerTitle = title.toLowerCase();
    let icon = '📌';
    for (const [key, value] of Object.entries(iconMap)) {
      if (lowerTitle.includes(key)) {
        icon = value;
        break;
      }
    }

    const cleanTitle = cleanDuplicateIcons(title);
    const formattedContent = formatText(content);

    return (
      <div className="mb-4">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2 mb-2">
          <span>{icon}</span> {cleanTitle}
        </h3>
        <div
          className="text-[#1a1a2e] leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
      </div>
    );
  };

  const parseQuickAnalysis = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const sections: { title: string; content: string }[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('###') || trimmed.match(/^[📝🐛⚡💡🔍🔧✅🧪🔒💼🖼️📊📌⭐🔬🚨🛡️✨📈🧩🏗️🔧🧪⚠️🏁]\s/)) {
        if (currentTitle && currentContent.length > 0) {
          sections.push({ title: currentTitle, content: currentContent.join('\n') });
        }
        currentTitle = trimmed
          .replace(/^###\s*/, '')
          .replace(/^[📝🐛⚡💡🔍🔧✅🧪🔒💼🖼️📊📌⭐🔬🚨🛡️✨📈🧩🏗️🔧🧪⚠️🏁]\s*/, '')
          .trim();
        currentContent = [];
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }

    if (currentTitle && currentContent.length > 0) {
      sections.push({ title: currentTitle, content: currentContent.join('\n') });
    }

    return sections.length > 0 ? sections : null;
  };

  const renderFindings = (findings: Finding[]) => {
    if (!findings || findings.length === 0) return null;
    return (
      <div className="mt-4 space-y-3">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2">🔍 Findings</h3>
        {findings.map((f, idx) => (
          <div key={idx} className="bg-[#f8f9fa] p-3 rounded-lg border border-[#d0d0d8]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[#1a1a2e]">{safeString(f.title)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                f.severity === 'critical' ? 'bg-red-100 text-red-700' :
                f.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                f.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {safeString(f.severity)}
              </span>
              <span className="text-xs text-[#6c7086]">({safeString(f.confidence)})</span>
            </div>
            {f.evidence && f.evidence.length > 0 && (
              <div className="mt-1 text-xs text-[#6c7086]">
                Lines: {f.evidence.map((e) => `${e.startLine}-${e.endLine}`).join(', ')}
              </div>
            )}
            <p className="text-sm text-[#4a4a6a] mt-1">{safeString(f.consequence)}</p>
            {f.remediation && (
              <p className="text-sm text-[#43a047] mt-1">💡 {safeString(f.remediation)}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderComplexity = (complexity: Complexity | null) => {
    if (!complexity) return null;
    return (
      <div className="mt-4 bg-[#f8f9fa] p-3 rounded-lg border border-[#d0d0d8]">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2">⚡ Complexity</h3>
        <div className="text-sm text-[#4a4a6a] space-y-1">
          <div><span className="font-medium">Time:</span> {safeString(complexity.time)}</div>
          <div><span className="font-medium">Space:</span> {safeString(complexity.space)}</div>
          {complexity.resourceGrowth && (
            <div><span className="font-medium">Resource Growth:</span> {safeString(complexity.resourceGrowth)}</div>
          )}
          {complexity.assumptions && complexity.assumptions.length > 0 && (
            <div><span className="font-medium">Assumptions:</span> {complexity.assumptions.join('; ')}</div>
          )}
        </div>
      </div>
    );
  };

  const renderVerdict = (verdict: Verdict | null) => {
    if (!verdict) return null;
    const statusColors: Record<string, string> = {
      'not-production-ready': 'bg-red-100 text-red-700',
      'requires-major-changes': 'bg-orange-100 text-orange-700',
      'requires-changes': 'bg-orange-100 text-orange-700',
      'requires-minor-changes': 'bg-yellow-100 text-yellow-700',
      'approved-with-suggestions': 'bg-green-100 text-green-700',
      'approved': 'bg-green-100 text-green-700',
      'production-ready-with-monitoring': 'bg-green-100 text-green-700',
    };
    return (
      <div className="mt-4 bg-[#f8f9fa] p-3 rounded-lg border border-[#d0d0d8]">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2">🏁 Verdict</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[verdict.status] || 'bg-gray-100 text-gray-700'}`}>
            {safeString(verdict.status)}
          </span>
        </div>
        <p className="text-sm text-[#4a4a6a] mt-1">{safeString(verdict.explanation)}</p>
      </div>
    );
  };

  const renderLimitations = (limitations: string[] | undefined) => {
    if (!limitations || limitations.length === 0) return null;
    return (
      <div className="mt-4 bg-[#f8f9fa] p-3 rounded-lg border border-[#d0d0d8]">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2">⚠️ Limitations</h3>
        <ul className="list-disc list-inside text-sm text-[#4a4a6a] mt-1">
          {limitations.map((item, idx) => (
            <li key={idx}>{safeString(item)}</li>
          ))}
        </ul>
      </div>
    );
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-4">
      {/* Header with Copy/Download */}
      <div className="flex justify-end items-center gap-3 pb-2 border-b-2 border-[#e8e8f0]">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
          title="Copy all explanation content"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>{copySuccess ? '✅ Copied!' : 'Copy All'}</span>
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
          title="Download explanation as text file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download</span>
        </button>
      </div>

      {/* Advanced + Canonical */}
      {isAdvanced && fullAnalysis && isCanonical ? (
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(title)}
          </h2>

          {summary && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-[#1a1a2e] text-sm leading-relaxed">{summary}</p>
            </div>
          )}

          {renderFindings(normalizedFindings)}
          {renderComplexity(normalizedComplexity)}
          {renderVerdict(normalizedVerdict)}
          {renderLimitations(fullAnalysis.limitations)}
        </div>
      ) : isAdvanced ? (
        // Advanced + Legacy (fallback)
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(cardTitle)}
          </h2>
          {renderSection('💡 Key Concept', keyConcept)}
          {renderSection('🔍 What This Code Does', analysisText)}
          {debugAnalysis && debugAnalysis !== '-' && renderSection('🐛 Debug Analysis', debugAnalysis)}
          {optimization && optimization !== '-' && renderSection('⚡ Optimization', optimization)}
        </div>
      ) : (
        // Simple / Medium
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(cardTitle)}
          </h2>
          {(() => {
            const sections = parseQuickAnalysis(keyConcept);
            if (sections && sections.length > 0) {
              return sections.map((section, idx) => (
                <div key={idx}>{renderSection(section.title, section.content)}</div>
              ));
            }
            return renderSection('📝 Summary', keyConcept);
          })()}
          {debugAnalysis && debugAnalysis !== '-' && renderSection('🐛 Debug Analysis', debugAnalysis)}
        </div>
      )}
    </div>
  );
}