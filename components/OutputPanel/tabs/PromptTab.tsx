'use client';
import { CopyButton, DownloadButton } from '@/components/common';

interface PromptTabProps {
  snippet: any;
  generatedPrompt: string | undefined;
  showToast: (message: string) => void;
  appUrl: string;
}

export default function PromptTab({
  snippet,
  generatedPrompt,
  showToast,
  appUrl,
}: PromptTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
          <span>📝</span> Generated Prompt
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {generatedPrompt && (
            <>
              <CopyButton 
                text={generatedPrompt} 
                label="Copy" 
                tooltip="Copy the generated prompt to clipboard"
                onCopy={() => showToast('✅ Prompt copied!')}
              />
              <button
                onClick={() => {
                  const url = `${appUrl}/snippet/${snippet?.slug}?tab=prompt`;
                  window.open(url, '_blank');
                  showToast('🔗 Opening prompt page...');
                }}
                className="bg-[#4a86f7] hover:bg-[#3b6fd4] text-white px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>🔗 Open Prompt Page</span>
              </button>
            </>
          )}
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