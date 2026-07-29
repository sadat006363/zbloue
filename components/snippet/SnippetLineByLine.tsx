// components/snippet/SnippetLineByLine.tsx
'use client';

import { useMemo, memo } from 'react';
// 🔥 استفاده از require برای react-window (CommonJS)
const { FixedSizeList } = require('react-window');

import { type LineExplanation } from '@/types';

interface SnippetLineByLineProps {
  lineExplanations: LineExplanation[] | null | undefined;
}

// ============================================================
// کامپوننت ردیف برای Virtualization
// ============================================================

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: LineExplanation[];
  };
}

const Row = memo(function Row({ index, style, data }: RowProps) {
  const item = data.items[index];
  if (!item) return null;

  return (
    <div style={style} className="border-b border-[#313244] pb-2 last:border-0 px-2">
      <div className="flex items-start gap-2 text-sm">
        <span className="text-[#6c7086] font-mono min-w-[40px] select-none">
          {item.lineNumber}
        </span>
        <div className="flex-1 min-w-0">
          {item.code && (
            <pre className="text-[#cdd6f4] font-mono text-xs whitespace-pre-wrap break-all">
              {item.code}
            </pre>
          )}
          <p className="text-[#a6adc8] text-sm mt-1">{item.explanation}</p>
        </div>
      </div>
    </div>
  );
});

Row.displayName = 'Row';

// ============================================================
// کامپوننت اصلی
// ============================================================

const SnippetLineByLine = memo(function SnippetLineByLine({
  lineExplanations,
}: SnippetLineByLineProps) {
  const safeExplanations = useMemo(() => {
    if (!lineExplanations || !Array.isArray(lineExplanations)) {
      return [];
    }
    return lineExplanations.filter(
      (item) => item && typeof item === 'object' && 'lineNumber' in item
    );
  }, [lineExplanations]);

  if (safeExplanations.length === 0) {
    return null;
  }

  const itemHeight = 80;
  const maxHeight = 500;
  const listHeight = Math.min(safeExplanations.length * itemHeight, maxHeight);

  return (
    <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
      <h3 className="text-sm font-semibold text-[#89b4fa] mb-3">
        📝 Line-by-Line Explanation ({safeExplanations.length} lines)
      </h3>

      {safeExplanations.length > 100 ? (
        <div className="custom-scrollbar">
          <FixedSizeList
            height={listHeight}
            itemCount={safeExplanations.length}
            itemSize={itemHeight}
            width="100%"
            itemData={{ items: safeExplanations }}
            className="custom-scrollbar"
          >
            {Row}
          </FixedSizeList>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
          {safeExplanations.map((item) => (
            <div
              key={item.lineNumber}
              className="border-b border-[#313244] pb-2 last:border-0"
            >
              <div className="flex items-start gap-2 text-sm">
                <span className="text-[#6c7086] font-mono min-w-[40px] select-none">
                  {item.lineNumber}
                </span>
                <div className="flex-1 min-w-0">
                  {item.code && (
                    <pre className="text-[#cdd6f4] font-mono text-xs whitespace-pre-wrap break-all">
                      {item.code}
                    </pre>
                  )}
                  <p className="text-[#a6adc8] text-sm mt-1">{item.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e1e2e;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a86f7;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3b6fd4;
        }
      `}</style>
    </div>
  );
});

SnippetLineByLine.displayName = 'SnippetLineByLine';

export default SnippetLineByLine;