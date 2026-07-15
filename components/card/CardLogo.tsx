'use client';
import { ThemeColors } from './themes';

interface CardLogoProps {
  colors: ThemeColors;
  theme: string;
  interactive?: boolean;
  appUrl: string;
}

export default function CardLogo({ colors, theme, interactive, appUrl }: CardLogoProps) {
  const LogoContent = () => (
    <div className="flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-mono font-bold text-sm shadow-lg border border-white/10"
        style={{ 
          background: `linear-gradient(135deg, ${colors.accent}, ${theme === 'gradient' ? '#ffffff' : colors.accentLight})`,
          boxShadow: `0 4px 15px ${colors.accent}40`
        }}
      >
        {'</>'}
      </div>
      <div>
        <span 
          className="font-bold text-xl tracking-tight"
          style={{ color: colors.textPrimary }}
        >
          Zbloue
        </span>
        <p 
          className="text-[10px] -mt-0.5"
          style={{ color: colors.textMuted }}
        >
          AI Code Analysis
        </p>
      </div>
    </div>
  );

  if (interactive) {
    return (
      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        <LogoContent />
      </a>
    );
  }

  return <LogoContent />;
}