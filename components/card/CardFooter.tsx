'use client';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ThemeColors } from './themes';

interface CardFooterProps {
  colors: ThemeColors;
  codeSnippet: string;
  language: string;
  fullUrl: string;
  views?: number;
}

export default function CardFooter({ 
  colors, 
  codeSnippet, 
  language, 
  fullUrl, 
  views = 0 
}: CardFooterProps) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, fullUrl, {
        width: 100,
        margin: 2,
        color: {
          dark: colors.qrDark,
          light: colors.qrLight,
        },
      }).catch((err) => {
        console.error('QR Code generation failed:', err);
      });
    }
  }, [fullUrl, colors]);

  return (
    <div 
      className="flex justify-between items-center z-10 pt-3 px-2 py-1 rounded-lg border"
      style={{ 
        borderColor: colors.borderColor,
        backgroundColor: colors.glassBg,
      }}
    >
      <div className="flex items-center gap-4 text-xs" style={{ color: colors.textMuted }}>
        <span>{`Ln ${codeSnippet ? codeSnippet.split('\n').length : 0}`}</span>
        <span>{`Lang: ${language.toUpperCase()}`}</span>
        <span>{`⭐ ${views || 0} Views`}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <span 
          className="text-[10px] font-mono truncate max-w-[200px]"
          style={{ color: colors.accent }}
        >
          {fullUrl}
        </span>
        <canvas
          ref={qrRef}
          className="w-[40px] h-[40px] rounded-lg p-0.5"
          style={{ backgroundColor: colors.glassBg }}
        />
      </div>
    </div>
  );
}