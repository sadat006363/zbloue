// ============================================================
// 📁 فایل: components/snippet/SnippetHeader.tsx
// ============================================================
'use client';
import Link from 'next/link';
import CopyButton from '../common/CopyButton';

interface SnippetHeaderProps {
  shareUrl: string;
}

export default function SnippetHeader({ shareUrl }: SnippetHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <Link href="/" className="text-[#89b4fa] hover:text-[#b4befe] transition-colors inline-flex items-center gap-2 text-sm font-medium">
        ← Back to Home
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#a6adc8]">Share this page:</span>
        <CopyButton text={shareUrl} label="📋 Copy Page Link" tooltip="Copy page link to clipboard" />
      </div>
    </div>
  );
}