// components/OutputPanel/tabs/LineByLineTab.tsx
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { CopyButton, DownloadButton } from '@/components/common';
import LineByLineExplanation from '../../LineByLineExplanation';
import type { Snippet } from '@/types';

interface LineByLineTabProps {
  snippet: Snippet | null;
  lineExplanations: any[];
  isExplaining: boolean;
  hoveredLine: number | null | undefined;
  onLineHover?: (lineNumber: number | null) => void;
  showToast: (message: string) => void;
  appUrl: string;
}

export default function LineByLineTab({
  snippet,
  lineExplanations,
  isExplaining,
  hoveredLine,
  onLineHover,
  showToast,
  appUrl,
}: LineByLineTabProps) {
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowShareDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const correctedExplanations = useMemo(() => {
    if (!snippet?.raw_code || !lineExplanations || lineExplanations.length === 0) {
      return lineExplanations || [];
    }

    const codeLines = snippet.raw_code.split('\n');
    const result: any[] = [];
    let expIndex = 0;
    const explanationsCopy = [...lineExplanations];

    for (let i = 0; i < codeLines.length; i++) {
      const lineNumber = i + 1;
      const lineContent = codeLines[i];
      const trimmedLine = lineContent.trim();

      if (trimmedLine === '') {
        result.push({ lineNumber, code: '', explanation: '' });
        continue;
      }

      if (expIndex < explanationsCopy.length) {
        const exp = explanationsCopy[expIndex];
        if (exp && exp.code && trimmedLine.includes(exp.code.trim())) {
          result.push({ ...exp, lineNumber });
          expIndex++;
        } else {
          result.push({ lineNumber, code: lineContent, explanation: 'No explanation provided.' });
        }
      } else {
        result.push({ lineNumber, code: lineContent, explanation: '' });
      }
    }

    return result;
  }, [snippet?.raw_code, lineExplanations]);

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

  const handleCopy = () => {
    const content = correctedExplanations
      .filter((item: any) => item.explanation)
      .map((item: any) => `Line ${item.lineNumber}:\n${item.code}\nExplanation: ${item.explanation}\n---`)
      .join('\n');
    navigator.clipboard.writeText(content);
    showToast('✅ Explanations copied!');
  };

  const handleDownload = () => {
    let content = '# Line-by-Line Code Explanation\n\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Language: ${snippet?.language || 'Unknown'}\n\n`;
    content += '## Explanations\n\n';
    correctedExplanations.forEach((item: any) => {
      if (item.code !== undefined || item.explanation) {
        content += `### Line ${item.lineNumber}\n`;
        content += `\`\`\`\n${item.code || ' '}\n\`\`\`\n`;
        content += `**Explanation:** ${item.explanation || 'No explanation provided.'}\n\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `line-by-line-explanation-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ File downloaded!');
  };

  if (!snippet && !isExplaining) {
    return (
      <div className="text-center text-[#4a4a6a] py-8">
        <p className="text-lg">📝 Generate a line-by-line explanation</p>
        <p className="text-sm">First, generate an analysis of your code.</p>
      </div>
    );
  }

  if (isExplaining) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4a86f7]/20 border-t-[#4a86f7] rounded-full animate-spin" />
          <p className="text-[#4a4a6a] text-sm">⏳ Generating line-by-line explanation...</p>
        </div>
      </div>
    );
  }

  if (snippet && lineExplanations && lineExplanations.length > 0) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
            <span>📝</span> Line-by-Line Code Explanation
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <CopyButton label="Copy All" tooltip="Copy all explanations" onCopy={handleCopy} />
            <DownloadButton label="Download .md" tooltip="Download as markdown file" onDownload={handleDownload} />

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
                  <div className="px-3 py-2 text-xs font-medium text-[#6c7086] border-b border-[#e8e8f0]">Share on</div>
                  <button onClick={() => handleShare('linkedin')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">LinkedIn</button>
                  <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">Twitter</button>
                  <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">WhatsApp</button>
                  <button onClick={() => handleShare('telegram')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">Telegram</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <LineByLineExplanation
          code={snippet.raw_code || ''}
          language={snippet.language || ''}
          explanations={correctedExplanations}
          loading={false}
          hoveredLine={hoveredLine ?? null}
          onLineHover={onLineHover}
        />
      </>
    );
  }

  return (
    <div className="text-center text-[#4a4a6a] py-8">
      <p className="text-lg">📝 No explanations available</p>
      <p className="text-sm">Click the <span className="font-semibold text-[#4a86f7]">"Explain"</span> button in the editor toolbar to generate line-by-line explanations.</p>
    </div>
  );
}