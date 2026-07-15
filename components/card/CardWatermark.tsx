'use client';
import { ThemeColors } from './themes';

interface CardWatermarkProps {
  colors: ThemeColors;
  interactive?: boolean;
  appUrl: string;
}

export default function CardWatermark({ colors, interactive, appUrl }: CardWatermarkProps) {
  if (interactive) {
    return (
      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-4 text-[10px] opacity-30 hover:opacity-70 transition-opacity z-10"
        style={{ color: colors.textMuted }}
      >
        Zbloue
      </a>
    );
  }

  return (
    <div 
      className="absolute bottom-2 right-4 text-[10px] opacity-20 z-0"
      style={{ color: colors.textMuted }}
    >
      Zbloue
    </div>
  );
}