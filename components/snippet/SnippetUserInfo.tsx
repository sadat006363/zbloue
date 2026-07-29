// components/snippet/SnippetUserInfo.tsx
'use client';

import Image from 'next/image';

interface SnippetUserInfoProps {
  username?: string | null;
  githubUsername?: string | null;
  avatarUrl?: string | null;
}

export default function SnippetUserInfo({ 
  username, 
  githubUsername,
  avatarUrl = null,
}: SnippetUserInfoProps) {
  const displayName = username || 'Anonymous';
  const avatarSrc = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4a86f7&color=fff&size=40&bold=true`;

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-[#1a1a2e] rounded-lg border border-[#313244] mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative">
          <Image
            src={avatarSrc}
            alt={displayName}
            width={32}
            height={32}
            className="w-full h-full object-cover"
            unoptimized={avatarSrc.includes('ui-avatars.com')}
          />
        </div>
        <div>
          <p className="text-sm text-[#cdd6f4] font-medium">{displayName}</p>
          {githubUsername && (
            <p className="text-xs text-[#6c7086]">@{githubUsername}</p>
          )}
        </div>
      </div>
    </div>
  );
}