// ============================================================
// 📁 فایل: components/snippet/SnippetUserInfo.tsx
// ============================================================
'use client';

interface SnippetUserInfoProps {
  username: string;
  githubUsername?: string;
}

export default function SnippetUserInfo({ username, githubUsername }: SnippetUserInfoProps) {
  return (
    <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="w-10 h-10 rounded-full bg-[#89b4fa] flex items-center justify-center text-white font-bold text-lg">
        {username?.[0]?.toUpperCase() || '?'}
      </div>
      <div>
        <p className="font-medium text-gray-900">{username || 'Anonymous'}</p>
        {githubUsername && (
          <a
            href={`https://github.com/${githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#89b4fa] hover:underline"
          >
            @{githubUsername}
          </a>
        )}
      </div>
    </div>
  );
}