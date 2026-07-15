'use client';

interface SnippetDebugProps {
  debugAnalysis: string;
  optimization: string;
}

export default function SnippetDebug({ debugAnalysis, optimization }: SnippetDebugProps) {
  if ((!debugAnalysis || debugAnalysis === '-') && (!optimization || optimization === '-')) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#313244]">
      {debugAnalysis && debugAnalysis !== '-' && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#f38ba8]">🐛 Debug Analysis</h3>
          <p className="text-[#a6adc8] text-sm leading-relaxed whitespace-pre-wrap">
            {debugAnalysis}
          </p>
        </div>
      )}

      {optimization && optimization !== '-' && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#a6e3a1]">⚡ Optimization</h3>
          <p className="text-[#a6adc8] text-sm leading-relaxed whitespace-pre-wrap">
            {optimization}
          </p>
        </div>
      )}
    </div>
  );
}