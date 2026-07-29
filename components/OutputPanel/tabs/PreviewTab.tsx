// components/OutputPanel/tabs/PreviewTab.tsx
'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Image from 'next/image'; // ← اضافه شده
import { CardTheme } from '@/components/card/themes';
import ThemeSelector from './ThemeSelector';

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
  savedImageUrl?: string | null;
  isUploading?: boolean;
  hasUploaded?: boolean;
  onUploadImage?: () => Promise<void>;
  cardPageUrl: string;
  avatarUrl?: string | null;
  isUploadingAvatar?: boolean;
  onUploadAvatar?: (file: File) => Promise<void>;
}

const themes: CardTheme[] = [
  'dark', 'blue', 'purple', 'pink', 'gradient',
  'orange', 'gold', 'green', 'lavender', 'silver',
  'glass', 'light', 'white'
];

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

// ============================================================
// 🔥 کامپوننت اصلی با memo
// ============================================================

const PreviewTab = memo(function PreviewTab({
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
  savedImageUrl = null,
  isUploading = false,
  hasUploaded = false,
  onUploadImage,
  cardPageUrl,
  avatarUrl = null,
  isUploadingAvatar = false,
  onUploadAvatar,
}: PreviewTabProps) {
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [localSavedImageUrl, setLocalSavedImageUrl] = useState<string | null>(savedImageUrl);
  const [localHasUploaded, setLocalHasUploaded] = useState<boolean>(hasUploaded);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSavedImageUrl(savedImageUrl);
  }, [savedImageUrl]);

  useEffect(() => {
    setLocalHasUploaded(hasUploaded);
  }, [hasUploaded]);

  useEffect(() => {
    if (cardImageDataUrl && !isGeneratingCard) {
      setLocalSavedImageUrl(null);
      setLocalHasUploaded(false);
    }
  }, [cardImageDataUrl, isGeneratingCard]);

  // ============================================================
  // 🔥 هندلرها با useCallback
  // ============================================================

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('❌ Please select an image file');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('❌ Image size must be less than 2MB');
      e.target.value = '';
      return;
    }

    if (onUploadAvatar) {
      showToast('⏳ Uploading avatar...');
      onUploadAvatar(file).catch((error) => {
        console.error('Upload error:', error);
        showToast(`❌ ${error.message || 'Upload failed'}`);
      });
    } else {
      showToast('❌ Upload function not available');
    }
    e.target.value = '';
  }, [onUploadAvatar, showToast]);

  const triggerFileUpload = useCallback(() => {
    if (isUploadingAvatar) {
      showToast('⏳ Already uploading...');
      return;
    }
    if (!onUploadAvatar) {
      showToast('❌ Upload function not available');
      return;
    }
    fileInputRef.current?.click();
  }, [isUploadingAvatar, onUploadAvatar, showToast]);

  const handleCopyLink = useCallback(async () => {
    const linkToCopy = localSavedImageUrl || cardPageUrl;

    if (!linkToCopy) {
      showToast('❌ Card link is not available yet');
      return;
    }

    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showToast(
        localSavedImageUrl
          ? '✅ Image link copied!'
          : '✅ Card page link copied!'
      );
    } catch (error) {
      console.error('Copy failed:', error);
      showToast('❌ Failed to copy link');
    }
  }, [localSavedImageUrl, cardPageUrl, showToast]);

  const handleDownload = useCallback(async () => {
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
  }, [isDownloading, downloadCard, showToast]);

  const toggleDropdown = useCallback(() => {
    setShowShareDropdown((prev) => !prev);
  }, []);

  const handleShare = useCallback((platform: string) => {
    setShowShareDropdown(false);
    const shareUrl = localSavedImageUrl || cardPageUrl;
    const title = snippet?.card_title || 'Check out this code analysis on Zbloue!';
    const fullText = `${title} - Analyze your code with AI and share it with the world! #Zbloue #CodeReview #AI #Developer`;

    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText + ' ' + shareUrl)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
    }
  }, [localSavedImageUrl, cardPageUrl, snippet?.card_title]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-[600px]">
        <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
          <span>🖼️</span> Card Preview
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]"
            title={localSavedImageUrl ? 'Copy image link' : 'Copy card page link'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{copySuccess ? '✅ Copied!' : (localSavedImageUrl ? 'Copy Image Link' : 'Copy Link')}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isGeneratingCard || !cardImageDataUrl || isDownloading}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border ${
              isGeneratingCard || !cardImageDataUrl || isDownloading
                ? 'border-[#d0d0d8] text-[#a0a0b0] cursor-not-allowed bg-[#f8f9fa]'
                : 'border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
          </button>

          <div className="relative">
            <button
              onClick={toggleDropdown}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition border ${
                showShareDropdown
                  ? 'bg-[#f1f3f5] text-[#4a86f7] border-[#4a86f7]'
                  : 'border-[#d0d0d8] text-[#4a4a6a] hover:text-[#4a86f7] hover:bg-[#f1f3f5]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              <span>Share</span>
              <svg className={`w-3 h-3 transition-transform ${showShareDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {showShareDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#d0d0d8] py-1 z-50">
                <div className="px-3 py-2 text-xs font-medium text-[#6c7086] border-b border-[#e8e8f0]">Share on</div>
                <button onClick={() => handleShare('linkedin')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">LinkedIn</button>
                <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">Twitter</button>
                <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">WhatsApp</button>
                <button onClick={() => handleShare('telegram')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#f1f3f5] transition">Telegram</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          🔥 Avatar + Change Name (با next/image)
          ============================================================ */}
      <div className="w-full max-w-[600px] flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 h-full">
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-400"
                  priority={true}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border-2 border-gray-300">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Profile Picture</p>
              <p className="text-xs text-gray-500">Upload a photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={triggerFileUpload}
                  disabled={isUploadingAvatar}
                  className={`text-xs transition ${
                    isUploadingAvatar
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-800 hover:underline'
                  }`}
                >
                  {isUploadingAvatar ? 'Uploading...' : (avatarUrl ? 'Change Photo' : 'Upload Photo')}
                </button>
                {avatarUrl && (
                  <button
                    onClick={() => {
                      showToast('ℹ️ Remove avatar feature coming soon');
                    }}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 h-full flex flex-col justify-center">
            <button
              onClick={() => setShowUsernameInput(!showUsernameInput)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition text-left flex items-center gap-2"
            >
              <span>👤</span>
              {showUsernameInput ? 'Hide Name & GitHub' : 'Change Name & GitHub'}
            </button>

            {showUsernameInput && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6c7086] pointer-events-none">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-1.5 pl-9 rounded-md border-2 border-[#d0d0d8] text-sm focus:outline-none focus:border-[#4a86f7] transition bg-white"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6c7086] pointer-events-none">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={tempGithubUsername}
                    onChange={(e) => setTempGithubUsername(e.target.value.trim())}
                    placeholder="GitHub username (e.g., sadat006363)"
                    className="w-full px-3 py-1.5 pl-9 rounded-md border-2 border-[#d0d0d8] text-sm focus:outline-none focus:border-[#4a86f7] transition bg-white"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={updateCardImage}
                    disabled={isUpdating}
                    className="flex-1 bg-[#4a86f7] hover:bg-[#3b6fd4] text-white px-3 py-1.5 rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={() => setShowUsernameInput(false)}
                    className="px-3 py-1.5 rounded-md text-sm border-2 border-[#d0d0d8] hover:bg-gray-100 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="w-full max-w-[600px]">
        <ThemeSelector
          themes={themes}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          getThemeBackground={getThemeBackground}
          updateCardImage={updateCardImage}
        />
      </div>

      {/* Card Preview */}
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

      {localSavedImageUrl && (
        <div className="w-full max-w-[600px] text-xs text-[#6c7086] bg-[#f1f3f5] p-2 rounded border border-[#d0d0d8] break-all">
          <span className="font-medium">✅ Permanent image link:</span> {localSavedImageUrl}
        </div>
      )}
    </div>
  );
});

PreviewTab.displayName = 'PreviewTab';

export default PreviewTab;