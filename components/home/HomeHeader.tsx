'use client';

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

interface HomeHeaderProps {
  githubUrl?: string;
}

export default function HomeHeader({ githubUrl = 'https://github.com/sadat006363/Zbloue' }: HomeHeaderProps) {
  return (
    <header className="flex justify-between items-center mb-6 p-4 bg-white rounded-xl border-2 border-[#d0d0d8] shadow-sm">
      <h1 className="text-2xl md:text-4xl font-bold text-[#1a1a2e]">Zbloue</h1>
      <div className="flex items-center gap-3">
        <a
          href="mailto:sjmousavi0066@gmail.com?subject=Zbloue%20Feedback&body=Hello,%20I%20have%20some%20feedback...%0A%0A"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-3 py-1.5 rounded-lg border-2 border-[#d0d0d8] hover:border-[#4a86f7] bg-white"
        >
          <EmailIcon />
          <span className="hidden sm:inline">Contact</span>
        </a>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#4a4a6a] hover:text-[#1a1a2e] transition px-3 py-1.5 rounded-lg border-2 border-[#d0d0d8] hover:border-[#1a1a2e] bg-white"
        >
          <GitHubIcon />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </header>
  );
}