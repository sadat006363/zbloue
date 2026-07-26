// components/snippet/SnippetHeader.tsx
'use client';

import { useState } from 'react';
import Tooltip from '../common/Tooltip';

interface SnippetHeaderProps {
  shareUrl: string;
  title?: string;
}

export default function SnippetHeader({ shareUrl, title = 'Code Snippet' }: SnippetHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <h1 className="text-xl font-bold text-white truncate">{title}</h1>
      <Tooltip text="Copy shareable link to clipboard" position="top">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border ${
            copied
              ? 'bg-[#a6e3a1] text-[#11111b] border-[#a6e3a1]'
              : 'bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] border-[#313244]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>{copied ? '✅ Copied!' : 'Copy Link'}</span>
        </button>
      </Tooltip>
    </div>
  );
}