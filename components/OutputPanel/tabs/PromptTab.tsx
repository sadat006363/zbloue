// components/OutputPanel/tabs/PromptTab.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { CopyButton, DownloadButton } from '@/components/common';
import type { Snippet } from '@/types';

interface PromptTabProps {
  snippet: Snippet | null;
  generatedPrompt?: string;
  isGeneratingPrompt?: boolean;
  showToast: (message: string) => void;
  appUrl: string;
}

export default function PromptTab({
  snippet,
  generatedPrompt,
  isGeneratingPrompt = false,
  showToast,
  appUrl,
}: PromptTabProps) {
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

  // 🔥 اصلاح: استخراج عنوان از audit_result
  const title = snippet?.audit_result?.title || 'Check out this code analysis on Zbloue!';

  const handleShare = (platform: string) => {
    setShowShareDropdown(false);
    const slug = snippet?.slug ?? '';
    const url = `${appUrl}/snippet/${slug}`;
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
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      showToast('✅ Prompt copied!');
    }
  };

  const handleDownload = () => {
    if (!generatedPrompt) {
      showToast('❌ No prompt to download');
      return;
    }
    const blob = new Blob([generatedPrompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ File downloaded!');
  };

  if (isGeneratingPrompt) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4a86f7]/20 border-t-[#4a86f7] rounded-full animate-spin" />
          <p className="text-[#4a4a6a] text-sm">⏳ Generating prompt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
          <span>📝</span> Generated Prompt
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          <CopyButton text={generatedPrompt ?? ''} label="Copy" tooltip="Copy prompt to clipboard" onCopy={handleCopy} />
          <DownloadButton content={generatedPrompt ?? ''} filename={`prompt-${Date.now()}`} extension="md" label="Download .md" tooltip="Download as markdown file" onDownload={handleDownload} />

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

      {generatedPrompt ? (
        <div className="bg-[#1e1e2e] text-[#cdd6f4] p-4 rounded-lg border-2 border-[#313244] whitespace-pre-wrap leading-relaxed font-mono text-sm max-h-[500px] overflow-y-auto">
          {generatedPrompt}
        </div>
      ) : (
        <div className="text-center text-[#4a4a6a] py-12">
          <p className="text-lg">📝 No prompt generated yet</p>
          <p className="text-sm">Click the <span className="font-semibold text-[#4a86f7]">"Generate Prompt"</span> button in the editor toolbar to create a prompt from your code.</p>
        </div>
      )}
    </div>
  );
}