'use client';
import { CardTheme } from '@/components/card/themes';

interface ThemeSelectorProps {
  themes: CardTheme[];
  selectedTheme: CardTheme;
  setSelectedTheme: (theme: CardTheme) => void;
  getThemeBackground: (theme: CardTheme) => string;
  updateCardImage: () => void;
}

export default function ThemeSelector({ 
  themes, 
  selectedTheme, 
  setSelectedTheme, 
  getThemeBackground,
  updateCardImage
}: ThemeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 w-full max-w-[600px] bg-[#f8f9fa] p-3 rounded-lg border-2 border-[#d0d0d8]">
      <span className="text-sm font-medium text-[#1a1a2e]">🎨 Theme:</span>
      <div className="flex gap-2 flex-wrap">
        {themes.map((t) => (
          <button
            key={t}
            onClick={() => {
              if (selectedTheme !== t) {
                setSelectedTheme(t);
                setTimeout(() => {
                  updateCardImage();
                }, 100);
              }
            }}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
              selectedTheme === t ? 'border-[#1a1a2e] scale-110' : 'border-[#d0d0d8]'
            }`}
            style={{ background: getThemeBackground(t) }}
            title={t.charAt(0).toUpperCase() + t.slice(1)}
          />
        ))}
      </div>
    </div>
  );
}