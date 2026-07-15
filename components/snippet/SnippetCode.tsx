'use client';
import CopyButton from '../common/CopyButton';

interface SnippetCodeProps {
  code: string;
  language: string;
  highlightedHtml: string;
}

export default function SnippetCode({ code, language, highlightedHtml }: SnippetCodeProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-[#89b4fa]">💻 Source Code</span>
        <CopyButton text={code} label="📄 Copy Code" tooltip="Copy source code" />
      </div>
      <div className="bg-[#11111b] rounded-lg overflow-x-auto max-h-[500px] border border-[#313244] font-mono text-sm leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} className="p-4" />
      </div>
    </div>
  );
}