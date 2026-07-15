'use client';

interface SnippetFooterProps {
  appUrl: string;
  githubUrl?: string;
}

export default function SnippetFooter({ appUrl, githubUrl = 'https://github.com/sadat006363/Zbloue' }: SnippetFooterProps) {
  return (
    <div className="mt-8 pt-6 border-t border-[#313244]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#a6adc8]">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <span className="text-lg">💻</span>
          <span>
            Built with{' '}
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#89b4fa] hover:text-[#b4befe] transition-colors font-semibold hover:underline"
            >
              Zbloue
            </a>
          </span>
          <span className="hidden sm:inline text-[#6c7086]">·</span>
          
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#6c7086] font-mono break-all hover:text-[#89b4fa] transition-colors hover:underline"
          >
            {appUrl}
          </a>
          
          <span className="text-[#6c7086]">·</span>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#89b4fa] hover:text-[#b4befe] transition-colors flex items-center gap-1 hover:underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
        <div className="text-xs text-[#6c7086]">
          <span>✨ Share your code. Get insights. Grow your network.</span>
        </div>
      </div>
    </div>
  );
}