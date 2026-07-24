// components/snippet/SnippetUserInfo.tsx
'use client';

interface SnippetUserInfoProps {
  username?: string | null;
  githubUsername?: string | null;
}

export default function SnippetUserInfo({ username, githubUsername }: SnippetUserInfoProps) {
  const displayName = username || 'Anonymous';

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-[#1a1a2e] rounded-lg border border-[#313244] mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#4a86f7] flex items-center justify-center text-white font-bold text-sm">
          {displayName.charAt(0).toUpperCase()}
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