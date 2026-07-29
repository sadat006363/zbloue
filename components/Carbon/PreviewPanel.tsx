// components/Carbon/PreviewPanel.tsx
'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

interface PreviewPanelProps {
  code: string;
  language: string;
  theme: string;
  backgroundColor: string;
  fontSize: number;
  showLineNumbers: boolean;
  showWindowControls: boolean;
  padding: number;
}

export function PreviewPanel({
  code,
  language,
  theme,
  backgroundColor,
  fontSize,
  showLineNumbers,
  showWindowControls,
  padding,
}: PreviewPanelProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: backgroundColor,
      });
      const link = document.createElement('a');
      link.download = `code-snapshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const isDark = backgroundColor !== '#ffffff' && backgroundColor !== '#fafafa' && backgroundColor !== '#f5f5f5';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-[#1a1a2e] border-b border-[#313244] rounded-t-lg">
        <span className="text-xs text-[#a6adc8]">📸 Preview</span>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-3 py-1 text-xs bg-[#4a86f7] hover:bg-[#3b6fd4] text-white rounded-md transition disabled:opacity-50"
        >
          {isDownloading ? '⏳ Downloading...' : '⬇️ Download Image'}
        </button>
      </div>

      {/* Preview Content */}
      <div
        ref={previewRef}
        className="flex-1 overflow-auto p-4"
        style={{
          backgroundColor: backgroundColor,
          padding: `${padding}px`,
        }}
      >
        {/* Window Controls */}
        {showWindowControls && (
          <div className="flex gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
        )}

        {/* Code Display */}
        <div
          className={`font-mono ${isDark ? 'text-[#cdd6f4]' : 'text-[#1a1a2e]'}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <pre className="whitespace-pre-wrap break-words">
            {code || '// Enter your code here...'}
          </pre>
        </div>

        {/* Language Label */}
        <div className="mt-4 text-xs opacity-50" style={{ color: isDark ? '#a6adc8' : '#4a4a6a' }}>
          {language.toUpperCase()} · {code.split('\n').length} lines
        </div>
      </div>
    </div>
  );
}