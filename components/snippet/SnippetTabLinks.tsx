'use client';

interface SnippetTabLinksProps {
  shareUrl: string;
}

export default function SnippetTabLinks({ shareUrl }: SnippetTabLinksProps) {
  const tabs = [
    { id: 'explanation', label: '📖 Explanation' },
    { id: 'linkedin', label: '💼 LinkedIn' },
    { id: 'preview', label: '🖼️ Card' },
    { id: 'analysis', label: '📊 Analysis' },
    { id: 'line-by-line', label: '📝 Line by Line' },
    { id: 'prompt', label: '📝 Prompt' },
  ];

  return (
    <div className="pt-6 border-t border-[#313244] space-y-3">
      <h3 className="text-lg font-semibold text-[#89b4fa] flex items-center gap-2">
        🔗 Direct Links to Tabs
      </h3>
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`${shareUrl}?tab=${tab.id}`}
            className="text-sm text-[#a6adc8] hover:text-[#89b4fa] transition-colors px-3 py-1.5 rounded-md border border-[#313244] hover:border-[#89b4fa]"
          >
            {tab.label}
          </a>
        ))}
      </div>
    </div>
  );
}