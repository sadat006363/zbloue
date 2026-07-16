'use client';
import { useState, useRef, useEffect } from 'react';
import { CopyButton, DownloadButton } from '@/components/common';
import { safeString } from '@/lib/utils';

interface AllOutputsTabProps {
  snippet: any;
  fullAnalysis: any;
  lineExplanations: any[];
  generatedPrompt: string;
  isAdvanced: boolean;
  showToast: (message: string) => void;
  appUrl: string;
}

export default function AllOutputsTab({
  snippet,
  fullAnalysis,
  lineExplanations,
  generatedPrompt,
  isAdvanced,
  showToast,
  appUrl,
}: AllOutputsTabProps) {
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowShareDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===== تابع جمع‌آوری تمام محتوا برای کپی و دانلود =====
  const getAllContent = () => {
    let content = '📊 Zbloue - Complete Analysis Report\n';
    content += `═══════════════════════════════════════\n\n`;
    content += `📌 Title: ${safeString(snippet.card_title)}\n\n`;
    content += `💡 Key Concept:\n${safeString(snippet.key_concept)}\n\n`;
    content += `🔍 What This Code Does:\n${safeString(snippet.what_this_code_does)}\n\n`;

    if (snippet.debug_analysis && snippet.debug_analysis !== '-') {
      content += `🐛 Debug Analysis:\n${safeString(snippet.debug_analysis)}\n\n`;
    }
    if (snippet.optimization && snippet.optimization !== '-') {
      content += `⚡ Optimization:\n${safeString(snippet.optimization)}\n\n`;
    }

    if (isAdvanced && fullAnalysis) {
      content += `📊 Advanced Analysis\n`;
      content += `─────────────────────────────────────\n\n`;
      if (fullAnalysis.highLevelSummary) {
        content += `💡 High-Level Summary:\n${safeString(fullAnalysis.highLevelSummary)}\n\n`;
      }
      if (fullAnalysis.codeWalkthrough) {
        content += `🧩 Code Walkthrough:\n`;
        fullAnalysis.codeWalkthrough.forEach((item: any) => {
          content += `  • ${safeString(item.section)}: ${safeString(item.explanation)}\n`;
        });
        content += `\n`;
      }
      if (fullAnalysis.whatWorksWell) {
        content += `✅ What Works Well:\n`;
        fullAnalysis.whatWorksWell.forEach((item: string) => {
          content += `  • ${safeString(item)}\n`;
        });
        content += `\n`;
      }
      if (fullAnalysis.bugsAndRiskyCases) {
        content += `🐛 Bugs and Risky Cases:\n`;
        fullAnalysis.bugsAndRiskyCases.forEach((item: any) => {
          content += `  • ${safeString(item.issue)} (Impact: ${safeString(item.impact)})\n`;
        });
        content += `\n`;
      }
      if (fullAnalysis.edgeCases) {
        content += `🧪 Edge Cases:\n`;
        fullAnalysis.edgeCases.forEach((item: any) => {
          content += `  • ${safeString(item.case)}: ${safeString(item.currentBehavior)} → Expected: ${safeString(item.expectedBehavior)}\n`;
        });
        content += `\n`;
      }
      if (fullAnalysis.performanceAnalysis) {
        content += `⚡ Performance Analysis:\n`;
        if (fullAnalysis.performanceAnalysis.timeComplexity) {
          content += `  Time: ${fullAnalysis.performanceAnalysis.timeComplexity.map((t: any) => `${t.target}: ${t.complexity}`).join(', ')}\n`;
        }
        if (fullAnalysis.performanceAnalysis.spaceComplexity) {
          content += `  Space: ${fullAnalysis.performanceAnalysis.spaceComplexity.map((t: any) => `${t.target}: ${t.complexity}`).join(', ')}\n`;
        }
        content += `\n`;
      }
      if (fullAnalysis.securityAnalysis) {
        content += `🔒 Security Analysis:\n`;
        content += `  Severity: ${safeString(fullAnalysis.securityAnalysis.severity)}\n`;
        if (fullAnalysis.securityAnalysis.issues) {
          fullAnalysis.securityAnalysis.issues.forEach((issue: string) => {
            content += `  • ${safeString(issue)}\n`;
          });
        }
        content += `\n`;
      }
      if (fullAnalysis.scorecard) {
        content += `📊 Scorecard:\n`;
        const scores = fullAnalysis.scorecard;
        Object.entries(scores).forEach(([key, value]) => {
          content += `  ${key.replace(/([A-Z])/g, ' $1')}: ${safeString(value)}/10\n`;
        });
        content += `\n`;
      }
      if (fullAnalysis.finalVerdict) {
        content += `🏁 Final Verdict:\n`;
        content += `  ${safeString(fullAnalysis.finalVerdict.summary)}\n`;
        content += `  Approved: ${fullAnalysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}\n`;
        if (fullAnalysis.finalVerdict.nextSteps) {
          content += `  Next Steps: ${safeString(fullAnalysis.finalVerdict.nextSteps)}\n`;
        }
        content += `\n`;
      }
      if (fullAnalysis.improvedCode?.available && fullAnalysis.improvedCode?.code) {
        content += `✨ Improved Code:\n`;
        content += `${safeString(fullAnalysis.improvedCode.code)}\n\n`;
      }
    }

    if (lineExplanations && lineExplanations.length > 0) {
      content += `📝 Line-by-Line Explanations\n`;
      content += `─────────────────────────────────────\n\n`;
      lineExplanations.forEach((item: any) => {
        content += `Line ${item.lineNumber}: ${item.code}\n`;
        content += `  💡 ${item.explanation}\n\n`;
      });
    }

    if (generatedPrompt) {
      content += `📝 Generated Prompt\n`;
      content += `─────────────────────────────────────\n\n`;
      content += `${generatedPrompt}\n\n`;
    }

    if (snippet.linkedin_post) {
      content += `💼 LinkedIn Post\n`;
      content += `─────────────────────────────────────\n\n`;
      content += `${safeString(snippet.linkedin_post)}\n\n`;
    }

    content += `═══════════════════════════════════════\n`;
    content += `Generated by Zbloue - AI Code Analysis\n`;
    content += `🔗 ${appUrl}/snippet/${snippet.slug}\n`;

    return content;
  };

  // ===== تابع اشتراک‌گذاری =====
  const handleShare = (platform: string) => {
    setShowShareDropdown(false);
    const url = `${appUrl}/snippet/${snippet?.slug}`;
    const title = snippet?.card_title || 'Check out this code analysis on Zbloue!';
    const fullText = `${title} - Analyze your code with AI and share it with the world! #Zbloue #CodeReview #AI #Developer`;

    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText + ' ' + url)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
    }
  };

  const allContent = getAllContent();

  return (
    <div className="space-y-6">
      {/* ===== Header با توضیحات ===== */}
      <div className="bg-gradient-to-r from-[#4a86f7]/10 to-[#a855f7]/10 p-4 rounded-xl border border-[#4a86f7]/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
              📊 Complete Analysis Report
            </h2>
            <p className="text-sm text-[#4a4a6a] mt-1">
              This page contains <strong>all outputs</strong> from the code analysis, including:
              explanation, LinkedIn post, code card, advanced analysis, line-by-line explanations, and generated prompt.
              <br />
              <span className="text-xs text-[#6c7086]">
                💡 Share this link with others to give them access to the complete analysis.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CopyButton
              text={allContent}
              label="Copy All"
              tooltip="Copy all analysis content"
              onCopy={() => showToast('✅ All content copied!')}
            />
            <DownloadButton
              content={allContent}
              filename={`zbloue-analysis-${snippet?.slug || Date.now()}`}
              extension="md"
              label="Download .md"
              tooltip="Download complete report as markdown"
              onDownload={() => showToast('✅ Report downloaded!')}
            />

            {/* ===== دکمه Share ===== */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition border ${
                  showShareDropdown
                    ? 'bg-[#f1f3f5] text-[#4a86f7] border-[#4a86f7]'
                    : 'border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
                <span>Share</span>
                <svg className={`w-3 h-3 transition-transform ${showShareDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {showShareDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#d0d0d8] py-1 z-50">
                  <div className="px-3 py-2 text-xs font-medium text-[#6c7086] border-b border-[#e8e8f0]">
                    Share on
                  </div>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition"
                  >
                    <svg className="w-4 h-4 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare('twitter')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition"
                  >
                    <svg className="w-4 h-4 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter
                  </button>
                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition"
                  >
                    <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleShare('telegram')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition"
                  >
                    <svg className="w-4 h-4 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== بخش Explanation ===== */}
      <div className="bg-white rounded-lg border border-[#e8e8f0] p-4">
        <h3 className="text-lg font-semibold text-[#4a86f7] flex items-center gap-2">
          📖 Explanation
        </h3>
        <div className="mt-2 space-y-2 text-[#1a1a2e]">
          <p><strong>Title:</strong> {safeString(snippet.card_title)}</p>
          <p><strong>Key Concept:</strong> {safeString(snippet.key_concept)}</p>
          <p><strong>What This Code Does:</strong> {safeString(snippet.what_this_code_does)}</p>
          {snippet.debug_analysis && snippet.debug_analysis !== '-' && (
            <p><strong>Debug Analysis:</strong> {safeString(snippet.debug_analysis)}</p>
          )}
          {snippet.optimization && snippet.optimization !== '-' && (
            <p><strong>Optimization:</strong> {safeString(snippet.optimization)}</p>
          )}
        </div>
      </div>

      {/* ===== بخش LinkedIn ===== */}
      <div className="bg-white rounded-lg border border-[#e8e8f0] p-4">
        <h3 className="text-lg font-semibold text-[#0a66c2] flex items-center gap-2">
          💼 LinkedIn Post
        </h3>
        <div className="mt-2 bg-[#fafbfc] p-3 rounded border border-[#e8e8f0] whitespace-pre-wrap text-sm">
          {safeString(snippet.linkedin_post)}
        </div>
      </div>

      {/* ===== بخش Advanced Analysis ===== */}
      {isAdvanced && fullAnalysis && (
        <div className="bg-white rounded-lg border border-[#e8e8f0] p-4">
          <h3 className="text-lg font-semibold text-[#4a86f7] flex items-center gap-2">
            📊 Advanced Analysis
          </h3>
          <div className="mt-2 space-y-3 text-[#1a1a2e] text-sm">
            {fullAnalysis.highLevelSummary && (
              <div><strong>💡 Summary:</strong> {safeString(fullAnalysis.highLevelSummary)}</div>
            )}
            {fullAnalysis.codeWalkthrough && fullAnalysis.codeWalkthrough.length > 0 && (
              <div>
                <strong>🧩 Code Walkthrough:</strong>
                <ul className="list-disc list-inside mt-1 text-[#4a4a6a]">
                  {fullAnalysis.codeWalkthrough.map((item: any, i: number) => (
                    <li key={i}><strong>{item.section}</strong>: {item.explanation}</li>
                  ))}
                </ul>
              </div>
            )}
            {fullAnalysis.bugsAndRiskyCases && fullAnalysis.bugsAndRiskyCases.length > 0 && (
              <div>
                <strong>🐛 Bugs:</strong>
                <ul className="list-disc list-inside mt-1 text-[#4a4a6a]">
                  {fullAnalysis.bugsAndRiskyCases.map((item: any, i: number) => (
                    <li key={i}>{item.issue} <span className="text-xs text-[#6c7086]">(Impact: {item.impact})</span></li>
                  ))}
                </ul>
              </div>
            )}
            {fullAnalysis.scorecard && (
              <div>
                <strong>📊 Scorecard:</strong>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                  {Object.entries(fullAnalysis.scorecard).map(([key, value]) => (
                    <div key={key} className="bg-[#f1f3f5] p-1.5 rounded text-center">
                      <p className="text-xs text-[#6c7086] capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="text-sm font-bold">{safeString(value)}/10</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fullAnalysis.finalVerdict && (
              <div className="bg-[#f1f3f5] p-3 rounded">
                <strong>🏁 Final Verdict:</strong>
                <p className="mt-1">{safeString(fullAnalysis.finalVerdict.summary)}</p>
                <p className="text-xs mt-1">Approved: {fullAnalysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}</p>
              </div>
            )}
            {fullAnalysis.improvedCode?.available && fullAnalysis.improvedCode?.code && (
              <div>
                <strong>✨ Improved Code:</strong>
                <pre className="bg-[#0a0a0a] text-[#cdd6f4] p-3 rounded mt-1 text-xs overflow-auto max-h-[200px]">
                  {fullAnalysis.improvedCode.code}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== بخش Line by Line ===== */}
      {lineExplanations && lineExplanations.length > 0 && (
        <div className="bg-white rounded-lg border border-[#e8e8f0] p-4">
          <h3 className="text-lg font-semibold text-[#4a86f7] flex items-center gap-2">
            📝 Line-by-Line Explanations
          </h3>
          <div className="mt-2 space-y-1 max-h-[300px] overflow-y-auto">
            {lineExplanations.map((item: any, i: number) => (
              <div key={i} className="border-b border-[#e8e8f0] pb-1 last:border-0">
                <p className="font-mono text-sm">Line {item.lineNumber}: {item.code}</p>
                <p className="text-sm text-[#4a4a6a]">💡 {item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== بخش Prompt ===== */}
      {generatedPrompt && (
        <div className="bg-white rounded-lg border border-[#e8e8f0] p-4">
          <h3 className="text-lg font-semibold text-[#4a86f7] flex items-center gap-2">
            📝 Generated Prompt
          </h3>
          <div className="mt-2 bg-[#fafbfc] p-3 rounded border border-[#e8e8f0] whitespace-pre-wrap font-mono text-sm max-h-[200px] overflow-y-auto">
            {generatedPrompt}
          </div>
        </div>
      )}
    </div>
  );
}