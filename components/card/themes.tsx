export type CardTheme = 
  | 'dark'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gradient'
  | 'orange'
  | 'gold'
  | 'green'
  | 'lavender'
  | 'silver'
  | 'glass'
  | 'light'
  | 'white';

export interface ThemeColors {
  background: string;
  backgroundGradient: string;
  accent: string;
  accentLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  glassBg: string;
  qrDark: string;
  qrLight: string;
}

export const themes: Record<CardTheme, ThemeColors> = {
  // ===== تم‌های قبلی =====
  dark: {
    background: 'from-[#0a0a0a] via-[#1a1a1a] to-[#2a2a2a]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#6b7280',
    accentLight: 'rgba(107, 114, 128, 0.2)',
    textPrimary: '#f3f4f6',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    borderColor: 'rgba(255,255,255,0.08)',
    glassBg: 'rgba(255,255,255,0.03)',
    qrDark: '#6b7280',
    qrLight: '#1a1a1a',
  },
  blue: {
    background: 'from-[#0f0f1a] via-[#1a1a2e] to-[#16213e]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#4a86f7',
    accentLight: 'rgba(74, 134, 247, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#a6adc8',
    textMuted: '#6c7086',
    borderColor: 'rgba(255,255,255,0.1)',
    glassBg: 'rgba(255,255,255,0.05)',
    qrDark: '#4a86f7',
    qrLight: '#1a1a2e',
  },
  purple: {
    background: 'from-[#1a0b2e] via-[#2d1b4e] to-[#4a2d7a]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#a855f7',
    accentLight: 'rgba(168, 85, 247, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#c4b5d4',
    textMuted: '#8b7aa8',
    borderColor: 'rgba(255,255,255,0.1)',
    glassBg: 'rgba(255,255,255,0.05)',
    qrDark: '#a855f7',
    qrLight: '#2d1b4e',
  },
  pink: {
    background: 'from-[#1a0b1a] via-[#3d1a3d] to-[#5c2d5c]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#ec4899',
    accentLight: 'rgba(236, 72, 153, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#f0c0d0',
    textMuted: '#a06a8a',
    borderColor: 'rgba(255,255,255,0.1)',
    glassBg: 'rgba(255,255,255,0.05)',
    qrDark: '#ec4899',
    qrLight: '#3d1a3d',
  },
  gradient: {
    background: 'from-[#4a86f7] via-[#7c3aed] to-[#ec4899]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#ffffff',
    accentLight: 'rgba(255,255,255,0.15)',
    textPrimary: '#ffffff',
    textSecondary: '#e0e0ff',
    textMuted: '#c0c0e0',
    borderColor: 'rgba(255,255,255,0.15)',
    glassBg: 'rgba(255,255,255,0.08)',
    qrDark: '#ffffff',
    qrLight: '#4a86f7',
  },
  orange: {
    background: 'from-[#1a100a] via-[#3a2a1a] to-[#2a1a0f]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#fb923c',
    accentLight: 'rgba(251, 146, 60, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#e0c8b4',
    textMuted: '#9a7a6a',
    borderColor: 'rgba(255,255,255,0.1)',
    glassBg: 'rgba(255,255,255,0.05)',
    qrDark: '#fb923c',
    qrLight: '#1a100a',
  },
  gold: {
    background: 'from-[#1a150a] via-[#3a2a1a] to-[#2a1f0f]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#fbbf24',
    accentLight: 'rgba(251, 191, 36, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#e0d0b0',
    textMuted: '#9a8a6a',
    borderColor: 'rgba(255,255,255,0.1)',
    glassBg: 'rgba(255,255,255,0.05)',
    qrDark: '#fbbf24',
    qrLight: '#1a150a',
  },
  green: {
    background: 'from-[#0a1a0f] via-[#1a3a2a] to-[#0f2a1a]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#4ade80',
    accentLight: 'rgba(74, 222, 128, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#b4e0c8',
    textMuted: '#6a9a7a',
    borderColor: 'rgba(255,255,255,0.1)',
    glassBg: 'rgba(255,255,255,0.05)',
    qrDark: '#4ade80',
    qrLight: '#0a1a0f',
  },
  lavender: {
    background: 'from-[#ede9fe] via-[#ddd6fe] to-[#c4b5fd]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#7c3aed',
    accentLight: 'rgba(124, 58, 237, 0.15)',
    textPrimary: '#1e1b4b',
    textSecondary: '#4c1d95',
    textMuted: '#7c3aed',
    borderColor: 'rgba(124,58,237,0.1)',
    glassBg: 'rgba(255,255,255,0.4)',
    qrDark: '#7c3aed',
    qrLight: '#ede9fe',
  },
  silver: {
    background: 'from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#475569',
    accentLight: 'rgba(71, 85, 105, 0.15)',
    textPrimary: '#0f172a',
    textSecondary: '#1e293b',
    textMuted: '#475569',
    borderColor: 'rgba(0,0,0,0.08)',
    glassBg: 'rgba(255,255,255,0.5)',
    qrDark: '#475569',
    qrLight: '#e2e8f0',
  },
  glass: {
    background: 'from-[rgba(255,255,255,0.05)] via-[rgba(255,255,255,0.02)] to-[rgba(255,255,255,0.08)]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#94a3b8',
    accentLight: 'rgba(148, 163, 184, 0.2)',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderColor: 'rgba(255,255,255,0.15)',
    glassBg: 'rgba(255,255,255,0.1)',
    qrDark: '#94a3b8',
    qrLight: '#0f172a',
  },
  light: {
    background: 'from-[#f8f9fa] via-[#e9ecef] to-[#dee2e6]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#4a86f7',
    accentLight: 'rgba(74, 134, 247, 0.15)',
    textPrimary: '#1a1a2e',
    textSecondary: '#4a4a6a',
    textMuted: '#8a8a9a',
    borderColor: 'rgba(0,0,0,0.08)',
    glassBg: 'rgba(255,255,255,0.5)',
    qrDark: '#4a86f7',
    qrLight: '#f8f9fa',
  },
  white: {
    background: 'from-[#ffffff] via-[#f8fafc] to-[#f1f5f9]',
    backgroundGradient: 'bg-gradient-to-br',
    accent: '#3b82f6',
    accentLight: 'rgba(59, 130, 246, 0.15)',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    borderColor: 'rgba(0,0,0,0.06)',
    glassBg: 'rgba(255,255,255,0.6)',
    qrDark: '#3b82f6',
    qrLight: '#ffffff',
  },
};