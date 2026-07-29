// components/Carbon/CarbonTab.tsx
'use client';

import { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { PreviewPanel } from './PreviewPanel';
import { SettingsPanel } from './SettingsPanel';
import { DEFAULT_THEME } from './themes';

interface CarbonTabProps {
  initialCode?: string;
  initialLanguage?: string;
}

export function CarbonTab({
  initialCode = '// Enter your code here...',
  initialLanguage = 'javascript',
}: CarbonTabProps) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [backgroundColor, setBackgroundColor] = useState('#1e1e2e');
  const [fontSize, setFontSize] = useState(14);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWindowControls, setShowWindowControls] = useState(true);
  const [padding, setPadding] = useState(48);
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="flex h-full gap-4 p-4 bg-[#0f0f14] rounded-xl">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Language Selector */}
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-[#1a1a2e] text-[#cdd6f4] rounded-md border border-[#313244] text-sm"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="rust">Rust</option>
            <option value="go">Go</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="cpp">C++</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 text-sm bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-md transition"
          >
            {showSettings ? '🔽 Hide Settings' : '🔼 Show Settings'}
          </button>
        </div>

        {/* Editor & Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
          <div className="border border-[#313244] rounded-lg overflow-hidden">
            <CodeEditor
              code={code}
              onChange={setCode}
              language={language}
              theme={theme}
              fontSize={fontSize}
              showLineNumbers={showLineNumbers}
            />
          </div>
          <div className="border border-[#313244] rounded-lg overflow-hidden">
            <PreviewPanel
              code={code}
              language={language}
              theme={theme}
              backgroundColor={backgroundColor}
              fontSize={fontSize}
              showLineNumbers={showLineNumbers}
              showWindowControls={showWindowControls}
              padding={padding}
            />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-[280px] flex-shrink-0">
          <SettingsPanel
            theme={theme}
            setTheme={setTheme}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            fontSize={fontSize}
            setFontSize={setFontSize}
            showLineNumbers={showLineNumbers}
            setShowLineNumbers={setShowLineNumbers}
            showWindowControls={showWindowControls}
            setShowWindowControls={setShowWindowControls}
            padding={padding}
            setPadding={setPadding}
          />
        </div>
      )}
    </div>
  );
}