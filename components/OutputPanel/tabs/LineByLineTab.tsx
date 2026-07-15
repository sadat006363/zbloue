'use client';
import { CopyButton, DownloadButton, ShareButtons } from '@/components/common';
import LineByLineExplanation from '../../LineByLineExplanation';

interface LineByLineTabProps {
  snippet: any;
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
    const handleCopy = () => {
      const content = lineExplanations.map((item: any) => 
        `Line ${item.lineNumber}:\n${item.code}\nExplanation: ${item.explanation}\n---`
      ).join('\n');
      navigator.clipboard.writeText(content);
      showToast('✅ Explanations copied!');
    };

    const handleDownload = () => {
      let content = '# Line-by-Line Code Explanation\n\n';
      content += `Generated: ${new Date().toLocaleString()}\n`;
      content += `Language: ${snippet?.language || 'Unknown'}\n\n`;
      content += '## Explanations\n\n';
      
      lineExplanations.forEach((item: any) => {
        content += `### Line ${item.lineNumber}\n`;
        content += `\`\`\`\n${item.code}\n\`\`\`\n`;
        content += `**Explanation:** ${item.explanation}\n\n`;
      });

      const filename = `line-by-line-explanation-${Date.now()}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ File downloaded!');
    };

    const shareUrl = `${appUrl}/snippet/${snippet.slug}`;

    return (
      <>
        <div className="flex justify-end items-center gap-2 flex-wrap mb-4">
          <CopyButton 
            label="Copy All" 
            tooltip="Copy all explanations"
            onCopy={handleCopy}
          />
          <DownloadButton 
            label="Download .md" 
            tooltip="Download as markdown file"
            onDownload={handleDownload}
          />
          <ShareButtons 
            url={shareUrl} 
            title="Check out this code analysis on Zbloue!" 
          />
        </div>

        <LineByLineExplanation
          code={snippet.raw_code || ''}
          language={snippet.language || ''}
          explanations={lineExplanations}
          loading={false}
          hoveredLine={hoveredLine ?? null}
          onLineHover={onLineHover}
          onCopy={() => showToast('✅ Explanations copied!')}
          onDownload={() => showToast('✅ File downloaded!')}
          onShare={() => {
            const url = `${appUrl}/snippet/${snippet.slug}`;
            navigator.clipboard.writeText(url).then(() => {
              showToast('✅ Link copied! Share it anywhere!');
            }).catch(() => {
              showToast('❌ Failed to copy link');
            });
          }}
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