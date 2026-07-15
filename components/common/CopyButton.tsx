'use client';
import { useState } from 'react';
import Tooltip from './Tooltip';

interface CopyButtonProps {
  text?: string;
  label?: string;
  tooltip?: string;
  className?: string;
  onCopy?: () => void;
}

export default function CopyButton({ 
  text = '', 
  label = '📋 Copy', 
  tooltip = 'Copy to clipboard',
  className = '',
  onCopy 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (onCopy) {
        onCopy();
      } else if (text) {
        await navigator.clipboard.writeText(text);
      } else {
        console.warn('CopyButton: No text provided and no onCopy handler');
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <Tooltip text={tooltip} position="top">
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition border ${
          copied 
            ? 'bg-[#a6e3a1] text-[#11111b] border-[#a6e3a1]' 
            : 'text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5] border-[#d0d0d8]'
        } ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        <span className="hidden sm:inline">{copied ? '✅ Copied!' : label}</span>
      </button>
    </Tooltip>
  );
}