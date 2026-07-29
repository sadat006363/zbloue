// components/Carbon/SettingsPanel.tsx
'use client';

import { ChromePicker } from 'react-color';
import { THEMES } from './themes';

interface SettingsPanelProps {
  theme: string;
  setTheme: (theme: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  showLineNumbers: boolean;
  setShowLineNumbers: (show: boolean) => void;
  showWindowControls: boolean;
  setShowWindowControls: (show: boolean) => void;
  padding: number;
  setPadding: (padding: number) => void;
}

export function SettingsPanel({
  theme,
  setTheme,
  backgroundColor,
  setBackgroundColor,
  fontSize,
  setFontSize,
  showLineNumbers,
  setShowLineNumbers,
  showWindowControls,
  setShowWindowControls,
  padding,
  setPadding,
}: SettingsPanelProps) {
  return (
    <div className="p-4 space-y-4 bg-[#1a1a2e] rounded-lg border border-[#313244] min-w-[220px] max-h-[500px] overflow-y-auto">
      <h3 className="text-sm font-semibold text-white">⚙️ تنظیمات</h3>

      {/* انتخاب تم */}
      <div>
        <label className="text-xs text-[#a6adc8]">تم</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="w-full mt-1 px-3 py-1.5 bg-[#11111b] text-[#cdd6f4] rounded-md border border-[#313244] text-sm"
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* انتخاب رنگ پس‌زمینه */}
      <div>
        <label className="text-xs text-[#a6adc8]">رنگ پس‌زمینه</label>
        <div className="mt-1">
          <ChromePicker
            color={backgroundColor}
            onChange={(color) => setBackgroundColor(color.hex)}
            disableAlpha
            className="!w-full"
          />
        </div>
      </div>

      {/* اندازه فونت */}
      <div>
        <label className="text-xs text-[#a6adc8]">اندازه فونت: {fontSize}px</label>
        <input
          type="range"
          min={10}
          max={32}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full mt-1"
        />
      </div>

      {/* نمایش شماره خطوط */}
      <label className="flex items-center gap-2 text-xs text-[#a6adc8]">
        <input
          type="checkbox"
          checked={showLineNumbers}
          onChange={(e) => setShowLineNumbers(e.target.checked)}
        />
        نمایش شماره خطوط
      </label>

      {/* نمایش دکمه‌های پنجره */}
      <label className="flex items-center gap-2 text-xs text-[#a6adc8]">
        <input
          type="checkbox"
          checked={showWindowControls}
          onChange={(e) => setShowWindowControls(e.target.checked)}
        />
        نمایش دکمه‌های پنجره (close, minimize, maximize)
      </label>

      {/* Padding */}
      <div>
        <label className="text-xs text-[#a6adc8]">فاصله داخلی: {padding}px</label>
        <input
          type="range"
          min={10}
          max={80}
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          className="w-full mt-1"
        />
      </div>
    </div>
  );
}