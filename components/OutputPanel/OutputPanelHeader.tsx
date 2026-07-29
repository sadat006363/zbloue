// components/OutputPanel/OutputPanelHeader.tsx
'use client';

import { useRouter } from 'next/navigation';
import Tooltip from '../common/Tooltip';

export type TabType =
  | 'explanation'
  | 'linkedin'
  | 'preview'
  | 'analysis'
  | 'line-by-line'
  | 'prompt'
  | 'all-outputs'
  | 'monitoring';

interface OutputPanelHeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string; tooltip: string }[] = [
  { id: 'explanation', label: 'Explanation', icon: '📖', tooltip: 'High-level explanation of the code' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', tooltip: 'Ready-to-share LinkedIn post' },
  { id: 'preview', label: 'Card', icon: '🖼️', tooltip: 'Shareable card preview' },
  { id: 'analysis', label: 'Analysis', icon: '📊', tooltip: 'Detailed code analysis with findings' },
  { id: 'line-by-line', label: 'Line by Line', icon: '📝', tooltip: 'Line-by-line code explanation' },
  { id: 'prompt', label: 'Prompt', icon: '📝', tooltip: 'Generated learning prompt' },
  { id: 'all-outputs', label: 'All Outputs', icon: '📊', tooltip: 'All outputs in one page' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊', tooltip: 'System metrics and monitoring dashboard' },
];

export default function OutputPanelHeader({
  activeTab,
  setActiveTab,
}: OutputPanelHeaderProps) {
  const router = useRouter();

  const handleTabClick = (tabId: TabType) => {
    if (tabId === 'carbon') {
      router.push('/carbon');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex items-center border-b-2 border-[#d0d0d8] flex-wrap bg-[#f1f3f5] px-2">
      <div className="flex flex-wrap">
        {tabs.map((tab) => (
          <Tooltip key={tab.id} text={tab.tooltip} position="top">
            <button
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'text-[#4a86f7] border-b-2 border-[#4a86f7] bg-white/30'
                  : 'text-[#4a4a6a] hover:text-[#1a1a2e]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          </Tooltip>
        ))}
        {/* دکمه Carbon به عنوان یک تب جداگانه در انتها */}
        <Tooltip text="ساخت تصویر از کد" position="top">
          <button
            onClick={() => router.push('/carbon')}
            className="px-4 py-3 text-sm font-medium transition text-[#4a4a6a] hover:text-[#1a1a2e] bg-gradient-to-r from-[#4a86f7]/10 to-[#a855f7]/10 hover:from-[#4a86f7]/20 hover:to-[#a855f7]/20 rounded-md ml-2"
          >
            🎨 Carbon
          </button>
        </Tooltip>
      </div>
    </div>
  );
}