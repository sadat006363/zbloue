// components/OutputPanel/useOutputPanel.ts
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context';
import { toPng } from 'html-to-image';
import { CardTheme } from '../card/themes';
import { type TabType } from './OutputPanelTabs';
import { type AnalysisMode } from '@/types';

export function useOutputPanel(
  onUsernameChange?: (name: string) => void,
  onGithubChange?: (name: string) => void,
  onSnippetUpdate?: (data: { username: string; github_username: string }) => void,
  onAvatarChange?: (avatarUrl: string | null) => void,
  showToast?: (message: string) => void
) {
  const { state, dispatch } = useAppContext();
  const {
    mode,
    loading,
    outputs,
    username,
    githubUsername,
    avatarUrl,
    isExplaining,
    isGeneratingPrompt,
    hoveredLine,
  } = state;

  const currentOutput = useMemo(() => outputs[mode as AnalysisMode], [outputs, mode]);
  const snippet = currentOutput?.snippet ?? null;
  const fullAnalysis = currentOutput?.fullAnalysis ?? null;
  const lineExplanations = currentOutput?.lineExplanations ?? [];
  const generatedPrompt = currentOutput?.generatedPrompt ?? '';
  const isAdvanced = mode === 'advanced';

  const audit = useMemo(() => snippet?.audit_result || null, [snippet]);
  const cardTitle = useMemo(() => audit?.title || 'Code Analysis', [audit]);
  const keyConcept = useMemo(() => audit?.summary || '', [audit]);
  const whatItDoes = useMemo(() => audit?.executionOverview?.entryPoints?.join(', ') || audit?.summary || '', [audit]);
  const debugAnalysis = useMemo(() => audit?.findings?.length ? `${audit.findings.length} findings` : '-', [audit]);
  const optimization = useMemo(() => audit?.recommendedActions?.length ? audit.recommendedActions.map((a: any) => a.title).join('; ') : '-', [audit]);
  const linkedinPost = useMemo(() => audit?.linkedinPost || '', [audit]);

  const [activeTab, setActiveTab] = useState<TabType>('explanation');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cardImageDataUrl, setCardImageDataUrl] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('blue');
  const [displayUsername, setDisplayUsername] = useState<string>(username || 'Developer');
  const [displayGithubUsername, setDisplayGithubUsername] = useState<string>(githubUsername || '');
  const [tempUsername, setTempUsername] = useState<string>(displayUsername);
  const [tempGithubUsername, setTempGithubUsername] = useState<string>(displayGithubUsername);
  const [showUsernameInput, setShowUsernameInput] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const isFirstRender = useRef(true);
  const isUpdatingCard = useRef(false);
  const isDownloading = useRef(false);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCarbonModalOpen, setIsCarbonModalOpen] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';

  const internalShowToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
    if (showToast) showToast(message);
  }, [showToast]);

  // ============================================================
  // توابع
  // ============================================================

  const updateSnippetInDatabase = useCallback(async (username: string, githubUsername: string) => {
    if (!snippet || !snippet.slug) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/update-snippet/${snippet.slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({ username, github_username: githubUsername }),
      });
      if (!response.ok) throw new Error('Update failed');
      const data = await response.json();
      if (onSnippetUpdate) onSnippetUpdate({ username, github_username: githubUsername });
      dispatch({ type: 'SET_USERNAME', payload: username });
      dispatch({ type: 'SET_GITHUB_USERNAME', payload: githubUsername });
      internalShowToast('✅ User info updated successfully!');
    } catch (error) {
      internalShowToast('❌ Failed to update');
    } finally {
      setIsUpdating(false);
    }
  }, [snippet, onSnippetUpdate, dispatch, internalShowToast]);

  const handleUploadImage = useCallback(async () => {
    if (!snippet?.slug || !cardImageDataUrl) {
      internalShowToast('❌ No image to upload');
      return;
    }
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload-card-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: snippet.slug, imageDataUrl: cardImageDataUrl }),
      });
      const data = await response.json();
      if (data.success) {
        setSavedImageUrl(data.imageUrl);
        setHasUploaded(true);
        internalShowToast('✅ Card image uploaded successfully!');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      internalShowToast(`❌ ${error.message || 'Failed to upload'}`);
    } finally {
      setIsUploading(false);
    }
  }, [snippet, cardImageDataUrl, internalShowToast]);

  const handleUploadAvatar = useCallback(async (file: File) => {
    if (!snippet?.slug) {
      internalShowToast('❌ No snippet available');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('slug', snippet.slug);
      const response = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setLocalAvatarUrl(data.avatarUrl);
        if (onAvatarChange) onAvatarChange(data.avatarUrl);
        dispatch({ type: 'SET_AVATAR', payload: data.avatarUrl });
        internalShowToast('✅ Avatar uploaded successfully!');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      internalShowToast(`❌ ${error.message || 'Failed to upload avatar'}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [snippet, onAvatarChange, dispatch, internalShowToast]);

  const generateCardImage = useCallback(async (): Promise<string> => {
    if (!cardRef.current) throw new Error('Card element not found');
    return await toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#0f0f1a',
      style: { transform: 'scale(1)' },
    });
  }, []);

  const downloadCard = useCallback(async () => {
    if (isDownloading.current) return;
    if (!snippet) {
      internalShowToast('❌ No snippet available');
      return;
    }
    isDownloading.current = true;
    internalShowToast('⏳ Generating card image...');
    try {
      let dataUrl = cardImageDataUrl;
      if (!dataUrl) {
        setIsGeneratingCard(true);
        dataUrl = await generateCardImage();
        setCardImageDataUrl(dataUrl);
        setIsGeneratingCard(false);
      }
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Zbloue-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      internalShowToast('✅ Image downloaded!');
    } catch (error) {
      internalShowToast('❌ Failed to download image');
    } finally {
      isDownloading.current = false;
    }
  }, [snippet, cardImageDataUrl, generateCardImage, internalShowToast]);

  const updateCardImage = useCallback(async () => {
    if (!snippet || activeTab !== 'preview' || isUpdatingCard.current) return;
    isUpdatingCard.current = true;
    const newUsername = tempUsername || 'Developer';
    const newGithubUsername = tempGithubUsername || '';
    setDisplayUsername(newUsername);
    setDisplayGithubUsername(newGithubUsername);
    if (onUsernameChange) onUsernameChange(newUsername);
    if (onGithubChange) onGithubChange(newGithubUsername);
    await updateSnippetInDatabase(newUsername, newGithubUsername);
    setIsGeneratingCard(true);
    try {
      const dataUrl = await generateCardImage();
      setCardImageDataUrl(dataUrl);
      internalShowToast('✅ Card updated successfully!');
    } catch (error) {
      internalShowToast('❌ Failed to generate card');
    } finally {
      setIsGeneratingCard(false);
      isUpdatingCard.current = false;
    }
  }, [snippet, activeTab, generateCardImage, tempUsername, tempGithubUsername, onUsernameChange, onGithubChange, updateSnippetInDatabase, internalShowToast]);

  // ============================================================
  // Effects
  // ============================================================

  useEffect(() => {
    if (isExplaining) setActiveTab('line-by-line');
  }, [isExplaining]);

  useEffect(() => {
    if (isGeneratingPrompt) setActiveTab('prompt');
  }, [isGeneratingPrompt]);

  useEffect(() => {
    if (snippet && activeTab === 'preview' && isFirstRender.current) {
      isFirstRender.current = false;
      if (snippet.username) {
        setDisplayUsername(snippet.username);
        setTempUsername(snippet.username);
      }
      if (snippet.github_username) {
        setDisplayGithubUsername(snippet.github_username);
        setTempGithubUsername(snippet.github_username);
      }
      if (snippet.avatar_url) {
        setLocalAvatarUrl(snippet.avatar_url);
        if (onAvatarChange) onAvatarChange(snippet.avatar_url);
      } else {
        setLocalAvatarUrl(null);
        if (onAvatarChange) onAvatarChange(null);
      }
      setIsGeneratingCard(true);
      generateCardImage()
        .then((dataUrl) => setCardImageDataUrl(dataUrl))
        .catch((error) => {
          console.error('Card generation failed:', error);
          internalShowToast('❌ Failed to generate card');
        })
        .finally(() => setIsGeneratingCard(false));
    }
  }, [snippet, activeTab, generateCardImage, onAvatarChange, internalShowToast]);

  useEffect(() => {
    if (showUsernameInput) {
      setTempUsername(displayUsername);
      setTempGithubUsername(displayGithubUsername);
    }
  }, [showUsernameInput, displayUsername, displayGithubUsername]);

  const publicUrl = `${appUrl}/snippet/${snippet?.slug || ''}`;
  const cardPageUrl = snippet?.slug ? `${appUrl}/snippet/${snippet.slug}/card?theme=${selectedTheme}` : '';
  const quickAnalysisText = !isAdvanced && fullAnalysis?.analysis ? fullAnalysis.analysis : null;

  return {
    // State
    mode,
    loading,
    snippet,
    fullAnalysis,
    lineExplanations,
    generatedPrompt,
    isAdvanced,
    isExplaining,
    isGeneratingPrompt,
    hoveredLine,
    audit,
    cardTitle,
    keyConcept,
    whatItDoes,
    debugAnalysis,
    optimization,
    linkedinPost,
    activeTab,
    setActiveTab,
    toastMessage,
    setToastMessage,
    cardImageDataUrl,
    setCardImageDataUrl,
    isGeneratingCard,
    setIsGeneratingCard,
    cardRef,
    selectedTheme,
    setSelectedTheme,
    displayUsername,
    displayGithubUsername,
    tempUsername,
    setTempUsername,
    tempGithubUsername,
    setTempGithubUsername,
    showUsernameInput,
    setShowUsernameInput,
    isUpdating,
    savedImageUrl,
    isUploading,
    hasUploaded,
    localAvatarUrl,
    isUploadingAvatar,
    isCarbonModalOpen,
    setIsCarbonModalOpen,
    appUrl,
    publicUrl,
    cardPageUrl,
    quickAnalysisText,
    // Functions
    internalShowToast,
    updateSnippetInDatabase,
    handleUploadImage,
    handleUploadAvatar,
    generateCardImage,
    downloadCard,
    updateCardImage,
    dispatch,
  };
}