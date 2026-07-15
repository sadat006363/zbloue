'use client';
import { useState } from 'react';
import Tooltip from './Tooltip';

interface DownloadButtonProps {
  content?: string;
  filename?: string;
  extension?: string;
  label?: string;
  tooltip?: string;
  className?: string;
  onDownload?: () => void;
}

export default function DownloadButton({ 
  content = '', 
  filename = 'download', 
  extension = 'txt',
  label = '⬇️ Download',
  tooltip = 'Download as file',
  className = '',
  onDownload 
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    try {
      if (onDownload) {
        onDownload();
      } else if (content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.warn('DownloadButton: No content provided and no onDownload handler');
        return;
      }
      setDownloading(true);
      setTimeout(() => setDownloading(false), 500);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloading(false);
    }
  };

  return (
    <Tooltip text={tooltip} position="top">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="hidden sm:inline">{downloading ? '⏳ Downloading...' : label}</span>
      </button>
    </Tooltip>
  );
}