'use client';
import { useState } from 'react';
import { CardTheme } from '@/components/card/themes';
import ThemeSelector from './ThemeSelector';
import CardActions from './CardActions';

interface PreviewTabProps {
  snippet: any;
  selectedTheme: CardTheme;
  setSelectedTheme: (theme: CardTheme) => void;
  cardImageDataUrl: string | null;
  isGeneratingCard: boolean;
  showUsernameInput: boolean;
  setShowUsernameInput: (show: boolean) => void;
  tempUsername: string;
  setTempUsername: (name: string) => void;
  tempGithubUsername: string;
  setTempGithubUsername: (name: string) => void;
  isUpdating: boolean;
  updateCardImage: () => void;
  showToast: (message: string) => void;
  publicUrl: string;
  appUrl: string;
  downloadCard: () => void;
}

// ===== لیست تم‌ها =====
const themes: CardTheme[] = [
  'dark', 'blue', 'purple', 'pink', 'gradient',
  'orange', 'gold', 'green', 'lavender', 'silver',
  'glass', 'light', 'white'
];

// ===== تابع رنگ تم =====
const getThemeBackground = (t: CardTheme): string => {
  const backgrounds: Record<CardTheme, string> = {
    dark: 'linear-gradient(135deg, #0a0a0a, #2a2a2a)',
    blue: 'linear-gradient(135deg, #1a1a2e, #4a86f7)',
    purple: 'linear-gradient(135deg, #2d1b4e, #a855f7)',
    pink: 'linear-gradient(135deg, #3d1a3d, #ec4899)',
    gradient: 'linear-gradient(135deg, #4a86f7, #ec4899)',
    orange: 'linear-gradient(135deg, #1a100a, #fb923c)',
    gold: 'linear-gradient(135deg, #1a150a, #fbbf24)',
    green: 'linear-gradient(135deg, #0a1a0f, #4ade80)',
    lavender: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
    silver: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
    light: 'linear-gradient(135deg, #f8f9fa, #dee2e6)',
    white: 'linear-gradient(135deg, #ffffff, #f8fafc)',
  };
  return backgrounds[t] || backgrounds.blue;
};

export default function PreviewTab({
  snippet,
  selectedTheme,
  setSelectedTheme,
  cardImageDataUrl,
  isGeneratingCard,
  showUsernameInput,
  setShowUsernameInput,
  tempUsername,
  setTempUsername,
  tempGithubUsername,
  setTempGithubUsername,
  isUpdating,
  updateCardImage,
  showToast,
  publicUrl,
  appUrl,
  downloadCard,
}: PreviewTabProps) {
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const cardPageUrl = `${appUrl}/snippet/${snippet?.slug}/card?theme=${selectedTheme}`;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadCard();
    } catch (error) {
      console.error('Download error:', error);
      showToast('❌ Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleDropdown = () => {
    setShowShareDropdown(!showShareDropdown);
  };

  const handleShare = (platform: string) => {
    setShowShareDropdown(false);
    const title = snippet?.card_title || 'Check out this code analysis on Zbloue!';
    const fullText = `${title} - Analyze your code with AI and share it with the world! #Zbloue #CodeReview #AI #Developer`;

    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(publicUrl)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText + ' ' + publicUrl)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ===== Header with actions ===== */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-[600px]">
        <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
          <span>🖼️</span> Card Preview
        </h2>
        
        <CardActions
          cardPageUrl={cardPageUrl}
          cardImageDataUrl={cardImageDataUrl}
          isDownloading={isDownloading}
          showShareDropdown={showShareDropdown}
          toggleDropdown={toggleDropdown}
          handleDownload={handleDownload}
          handleShare={handleShare}
          showToast={showToast}
        />
      </div>

      {/* ===== Theme Selector ===== */}
      <div className="w-full max-w-[600px]">
        <ThemeSelector
          themes={themes}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          getThemeBackground={getThemeBackground}
          updateCardImage={updateCardImage}
        />
      </div>

      {/* ===== Username Input (بازگردانی شده) ===== */}
      <div className="w-full max-w-[600px]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUsernameInput(!showUsernameInput)}
            className="text-sm text-[#4a4a6a] hover:text-[#4a86f7] transition px-3 py-1 rounded-md border border-[#d0d0d8] hover:border-[#4a86f7]"
          >
            👤 {showUsernameInput ? 'Hide' : 'Change Name'}
          </button>
        </div>
      </div>

      {showUsernameInput && (
        <div className="w-full max-w-[600px] space-y-3 bg-[#f1f3f5] p-4 rounded-lg border-2 border-[#d0d0d8]">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6c7086] pointer-events-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Your name (for card)"
                className="w-full px-3 py-2 rounded-md border-2 border-[#d0d0d8] text-sm focus:outline-none focus:border-[#4a86f7] transition bg-white pl-9"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6c7086] pointer-events-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </div>
              <input
                type="text"
                value={tempGithubUsername}
                onChange={(e) => setTempGithubUsername(e.target.value.trim())}
                placeholder="Enter your GitHub username only (e.g., sadat006363)"
                className="w-full px-3 py-2 rounded-md border-2 border-[#d0d0d8] text-sm focus:outline-none focus:border-[#4a86f7] transition bg-white pl-9"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2 border-t border-[#d0d0d8]">
            <button
              onClick={updateCardImage}
              disabled={isUpdating}
              className="flex-1 bg-[#4a86f7] hover:bg-[#3b6fd4] text-white px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              💾 Update Card
            </button>
            <button
              onClick={() => setShowUsernameInput(false)}
              className="px-4 py-2 rounded-md text-sm border-2 border-[#d0d0d8] hover:bg-[#e8e8f0] transition"
            >
              Close
            </button>
          </div>
          
          <p className="text-xs text-[#6c7086] flex items-center gap-1">
            <span>💡</span> Enter your GitHub username only (e.g., sadat006363). The full URL will be generated automatically.
          </p>
        </div>
      )}

      {/* ===== Card Preview ===== */}
      {isGeneratingCard ? (
        <div className="flex items-center justify-center w-full max-w-[600px] h-[400px] bg-[#fafbfc] rounded-lg border-2 border-[#d0d0d8]">
          <p className="text-[#4a4a6a]">⏳ Generating card...</p>
        </div>
      ) : cardImageDataUrl ? (
        <img
          src={cardImageDataUrl}
          alt="Code Card Preview"
          className="w-full max-w-[600px] rounded-lg shadow-2xl border-2 border-[#d0d0d8]"
        />
      ) : (
        <div className="flex items-center justify-center w-full max-w-[600px] h-[400px] bg-[#fafbfc] rounded-lg border-2 border-[#d0d0d8]">
          <p className="text-[#4a4a6a]">No card generated</p>
        </div>
      )}
    </div>
  );
}