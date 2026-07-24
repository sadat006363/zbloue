// components/snippet/SnippetDebug.tsx
'use client';

interface SnippetDebugProps {
  debugAnalysis?: string;
  optimization?: string;
}

export default function SnippetDebug({ debugAnalysis, optimization }: SnippetDebugProps) {
  const hasContent = debugAnalysis || optimization;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244] space-y-3">
        {debugAnalysis && debugAnalysis !== '-' && (
          <div>
            <h3 className="text-sm font-semibold text-[#f38ba8]">🐛 Debug Analysis</h3>
            <p className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap">{debugAnalysis}</p>
          </div>
        )}

        {optimization && optimization !== '-' && (
          <div className={debugAnalysis && debugAnalysis !== '-' ? 'pt-3 border-t border-[#313244]' : ''}>
            <h3 className="text-sm font-semibold text-[#a6e3a1]">⚡ Optimization</h3>
            <p className="text-sm text-[#cdd6f4] mt-1 whitespace-pre-wrap">{optimization}</p>
          </div>
        )}
      </div>
    </div>
  );
}