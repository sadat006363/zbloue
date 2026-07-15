// app/snippet/[slug]/CopyButton.tsx
'use client';

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string; // اضافه شدن پروپ اختیاری label
}

export default function CopyButton({ text, label = '📋 Copy Text' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // بازگشت به حالت اولیه بعد از ۲ ثانیه
    } catch (error) {
      console.error('Copy failed:', error);
      alert('❌ Failed to copy text.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border duration-200 ${
        copied 
          ? 'bg-[#a6e3a1] text-[#11111b] border-[#a6e3a1]' 
          : 'bg-[#313244] hover:bg-[#45475a] text-white border-[#313244]'
      }`}
      type="button"
    >
      {copied ? '✅ Copied!' : label}
    </button>
  );
}
