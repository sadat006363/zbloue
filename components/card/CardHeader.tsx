'use client';
import { themes, type CardTheme } from './themes';

interface CardHeaderProps {
  colors: typeof themes.blue;
  theme: CardTheme;
  username?: string;
  githubUsername?: string;
  userAvatar?: string;
  interactive?: boolean;
  appUrl?: string;
  avatarUrl?: string | null; // NEW
}

export default function CardHeader({
  colors,
  theme,
  username = 'Guest',
  githubUsername,
  userAvatar,
  interactive = false,
  appUrl = '',
  avatarUrl = null,
}: CardHeaderProps) {
  // Generate avatar URL: use uploaded avatar if available, otherwise use ui-avatars
  const avatarSrc = avatarUrl || userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${colors.accent.replace('#', '')}&color=fff&size=40&bold=true`;

  return (
    <div className="flex items-center justify-between z-10">
      {/* Left: Avatar + Username + GitHub */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
          <img
            src={avatarSrc}
            alt={username}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white font-semibold text-base">
            {username}
          </span>
          {githubUsername && (
            <a
              href={`https://github.com/${githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              @{githubUsername}
            </a>
          )}
        </div>
      </div>

      {/* Right: Zbloue logo (only in interactive mode) */}
      {interactive && (
        <div className="text-right">
          <span className="text-white/80 text-sm font-semibold">Zbloue</span>
          <span className="block text-white/40 text-[10px]">AI Code Analysis</span>
        </div>
      )}
    </div>
  );
}