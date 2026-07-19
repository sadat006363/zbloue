'use client';
import { safeString } from '@/lib/utils';
import { useState } from 'react';

interface ExplanationTabProps {
  snippet: any;
  isAdvanced: boolean;
  quickAnalysisText: string | null;
  analysisText: string;
  debugAnalysis: string;
  optimization: string;
  keyConcept: string;
  cardTitle: string;
  fullAnalysis?: any; // NEW: for new Advanced output
}

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

  // ===== Get content for copy/download =====
  const getFullContent = () => {
    let content = '';

    if (isAdvanced && fullAnalysis) {
      // NEW: Use structured data from advanced analysis
      content += `📌 ${safeString(fullAnalysis.title || cardTitle)}\n\n`;
      if (fullAnalysis.summary || fullAnalysis.highLevelSummary) {
        content += `💡 Summary:\n${safeString(fullAnalysis.summary || fullAnalysis.highLevelSummary)}\n\n`;
      }
      if (fullAnalysis.findings && fullAnalysis.findings.length > 0) {
        content += `🔍 Findings:\n`;
        fullAnalysis.findings.forEach((f: any) => {
          content += `  • ${safeString(f.title)} [${safeString(f.severity)}] (${safeString(f.confidence)})\n`;
          content += `    ${safeString(f.consequence)}\n`;
        });
        content += '\n';
      }
      if (fullAnalysis.complexity) {
        content += `⚡ Complexity: Time ${safeString(fullAnalysis.complexity.time)} | Space ${safeString(fullAnalysis.complexity.space)}\n\n`;
      }
      if (fullAnalysis.verdict) {
        content += `🏁 Verdict: ${safeString(fullAnalysis.verdict.status)} - ${safeString(fullAnalysis.verdict.explanation)}\n\n`;
      }
    } else if (isAdvanced) {
      // Legacy Advanced
      content += `📌 ${safeString(cardTitle)}\n\n`;
      content += `💡 Key Concept:\n${safeString(keyConcept)}\n\n`;
      content += `🔍 What This Code Does:\n${safeString(analysisText)}\n\n`;
      content += `🐛 Debug Analysis:\n${safeString(debugAnalysis)}\n\n`;
      content += `⚡ Optimization:\n${safeString(optimization)}\n\n`;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explanation-${snippet?.slug || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Clean duplicate icons =====
  const cleanDuplicateIcons = (text: string) => {
    if (!text) return '';
    const iconPattern = /^[📝🐛⚡💡🔍🔧📊✅🧪🔒💼🖼️📖📌⭐🔬🛡️🏁✨🚨🛡️🧩]\s*/;
    return text.replace(iconPattern, '');
  };

  // ===== Format text =====
  const formatText = (text: string) => {
    if (!text) return '';
    let formatted = text.replace(/^###\s*/gm, '');
    const lines = formatted.split('\n');
    const cleanedLines = lines.map((line) => cleanDuplicateIcons(line));
    formatted = cleanedLines.join('\n');
    formatted = formatted.replace(/^-\s*/gm, '• ');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted;
  };

  // ===== Render section =====
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

  // ===== Parse quick analysis =====
  const parseQuickAnalysis = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const sections: { title: string; content: string }[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('###') || trimmed.match(/^[📝🐛⚡💡🔍🔧📊✅🧪🔒💼🖼️📖📌⭐🔬🛡️🏁✨🚨🛡️🧩]\s/)) {
        if (currentTitle && currentContent.length > 0) {
          sections.push({ title: currentTitle, content: currentContent.join('\n') });
        }
        currentTitle = trimmed
          .replace(/^###\s*/, '')
          .replace(/^[📝🐛⚡💡🔍🔧📊✅🧪🔒💼🖼️📖📌⭐🔬🛡️🏁✨🚨🛡️🧩]\s*/, '')
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

  // ===== Render findings for new advanced output =====
  const renderFindings = (findings: any[]) => {
    if (!findings || findings.length === 0) return null;
    return (
      <div className="mt-4 space-y-3">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2">🔍 Findings</h3>
        {findings.map((f: any, idx: number) => (
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
                Lines: {f.evidence.map((e: any) => `${e.startLine}-${e.endLine}`).join(', ')}
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

  // ===== Render complexity for new advanced output =====
  const renderComplexity = (complexity: any) => {
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
        </div>
      </div>
    );
  };

  // ===== Render verdict for new advanced output =====
  const renderVerdict = (verdict: any) => {
    if (!verdict) return null;
    const statusColors: Record<string, string> = {
      'not-production-ready': 'bg-red-100 text-red-700',
      'requires-major-changes': 'bg-orange-100 text-orange-700',
      'requires-minor-changes': 'bg-yellow-100 text-yellow-700',
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

  return (
    <div className="space-y-4">
      {/* ===== Copy & Download Buttons ===== */}
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

      {isAdvanced && fullAnalysis ? (
        // ===== NEW Advanced Analysis Output =====
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(fullAnalysis.title || cardTitle)}
          </h2>

          {fullAnalysis.summary || fullAnalysis.highLevelSummary ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-[#1a1a2e] text-sm leading-relaxed">
                {safeString(fullAnalysis.summary || fullAnalysis.highLevelSummary)}
              </p>
            </div>
          ) : null}

          {renderFindings(fullAnalysis.findings)}
          {renderComplexity(fullAnalysis.complexity)}
          {renderVerdict(fullAnalysis.verdict)}

          {fullAnalysis.limitations && fullAnalysis.limitations.length > 0 && (
            <div className="mt-4 bg-[#f8f9fa] p-3 rounded-lg border border-[#d0d0d8]">
              <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2">⚠️ Limitations</h3>
              <ul className="list-disc list-inside text-sm text-[#4a4a6a] mt-1">
                {fullAnalysis.limitations.map((item: string, idx: number) => (
                  <li key={idx}>{safeString(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : isAdvanced ? (
        // ===== Legacy Advanced =====
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(cardTitle)}
          </h2>
          {renderSection('💡 Key Concept', keyConcept)}
          {renderSection('🔍 What This Code Does', analysisText)}
          {renderSection('🐛 Debug Analysis', debugAnalysis)}
          {renderSection('⚡ Optimization', optimization)}
        </div>
      ) : (
        // ===== Simple / Medium =====
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