'use client';
import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback } from 'react';
import { Snippet, GenerateResponse } from '@/types';
import { toPng } from 'html-to-image';
import CardPreview from '../card/CardPreview';
import { CardTheme, themes } from '../card/themes'; // ✅ اصلاح شده
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import OutputPanelHeader from './OutputPanelHeader';
import ExplanationTab from './tabs/ExplanationTab';
import LinkedInTab from './tabs/LinkedInTab';
import PreviewTab from './tabs/PreviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import LineByLineTab from './tabs/LineByLineTab';
import PromptTab from './tabs/PromptTab';

export interface OutputPanelProps {
  snippet: Snippet | null;
  loading: boolean;
  fullAnalysis?: GenerateResponse | null;
  analysisMode?: 'simple' | 'medium' | 'advanced';
  onUsernameChange?: (name: string) => void;
  onGithubChange?: (name: string) => void;
  onSnippetUpdate?: (data: { username: string; github_username: string }) => void;
  lineExplanations?: any[];
  isExplaining?: boolean;
  onGenerateExplanation?: () => void;
  hoveredLine?: number | null;
  onLineHover?: (lineNumber: number | null) => void;
  generatedPrompt?: string;
  initialTab?: 'explanation' | 'linkedin' | 'preview' | 'analysis' | 'line-by-line' | 'prompt';
}

export type TabType = 'explanation' | 'linkedin' | 'preview' | 'analysis' | 'line-by-line' | 'prompt';

const OutputPanel = forwardRef<{ setActiveTab: (tab: TabType) => void }, OutputPanelProps>(
  function OutputPanel({ 
    snippet, 
    loading, 
    fullAnalysis, 
    analysisMode,
    onUsernameChange,
    onGithubChange,
    onSnippetUpdate,
    lineExplanations = [],
    isExplaining = false,
    onGenerateExplanation,
    hoveredLine,
    onLineHover,
    generatedPrompt,
    initialTab = 'explanation',
  }, ref) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [cardImageDataUrl, setCardImageDataUrl] = useState<string | null>(null);
    const [isGeneratingCard, setIsGeneratingCard] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const [selectedTheme, setSelectedTheme] = useState<CardTheme>('blue');
    const [displayUsername, setDisplayUsername] = useState<string>('Developer');
    const [displayGithubUsername, setDisplayGithubUsername] = useState<string>('');
    const [tempUsername, setTempUsername] = useState<string>('Developer');
    const [tempGithubUsername, setTempGithubUsername] = useState<string>('');
    const [showUsernameInput, setShowUsernameInput] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const isFirstRender = useRef(true);
    const isUpdatingCard = useRef(false);
    const isDownloading = useRef(false);

    const isAdvanced = analysisMode === 'advanced';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';

    const showToast = (message: string) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3000);
    };

    useImperativeHandle(ref, () => ({
      setActiveTab: (tab: TabType) => {
        setActiveTab(tab);
      },
    }));

    const updateSnippetInDatabase = useCallback(async (username: string, githubUsername: string) => {
      if (!snippet || !snippet.slug) return;

      setIsUpdating(true);
      try {
        const response = await fetch('/api/update-snippet', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: snippet.slug,
            username: username,
            github_username: githubUsername,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Update failed');
        }

        const data = await response.json();
        
        if (onSnippetUpdate) {
          onSnippetUpdate({ username, github_username: githubUsername });
        }

        showToast('✅ User info updated successfully!');
      } catch (error: any) {
        console.error('Update error:', error);
        showToast(`❌ Failed to update: ${error.message}`);
      } finally {
        setIsUpdating(false);
      }
    }, [snippet, onSnippetUpdate]);

    const generateCardImage = useCallback(async (): Promise<string> => {
      if (!cardRef.current) {
        throw new Error('Card element not found');
      }

      try {
        const dataUrl = await toPng(cardRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#0f0f1a',
          style: {
            transform: 'scale(1)',
          },
        });
        return dataUrl;
      } catch (error) {
        console.error('Error generating card image:', error);
        throw error;
      }
    }, []);

    const downloadCard = useCallback(async () => {
      if (isDownloading.current) {
        console.log('⏳ Download already in progress...');
        return;
      }

      if (!snippet) {
        showToast('❌ No snippet available');
        return;
      }

      isDownloading.current = true;
      showToast('⏳ Generating card image...');

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
        
        showToast('✅ Image downloaded!');
      } catch (error) {
        console.error('Download failed:', error);
        showToast('❌ Failed to download image');
      } finally {
        isDownloading.current = false;
      }
    }, [snippet, cardImageDataUrl, generateCardImage]);

    const updateCardImage = useCallback(async () => {
      if (!snippet || activeTab !== 'preview' || isUpdatingCard.current) return;
      
      isUpdatingCard.current = true;
      
      const newUsername = tempUsername || 'Developer';
      const newGithubUsername = tempGithubUsername || '';
      
      setDisplayUsername(newUsername);
      setDisplayGithubUsername(newGithubUsername);
      
      if (onUsernameChange) {
        onUsernameChange(newUsername);
      }
      if (onGithubChange) {
        onGithubChange(newGithubUsername);
      }

      await updateSnippetInDatabase(newUsername, newGithubUsername);
      
      setIsGeneratingCard(true);
      try {
        const dataUrl = await generateCardImage();
        setCardImageDataUrl(dataUrl);
        showToast('✅ Card updated successfully!');
      } catch (error) {
        console.error('Card generation failed:', error);
        showToast('❌ Failed to generate card');
      } finally {
        setIsGeneratingCard(false);
        isUpdatingCard.current = false;
      }
    }, [snippet, activeTab, generateCardImage, tempUsername, tempGithubUsername, onUsernameChange, onGithubChange, updateSnippetInDatabase]);

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
        
        setIsGeneratingCard(true);
        generateCardImage()
          .then((dataUrl) => {
            setCardImageDataUrl(dataUrl);
          })
          .catch((error) => {
            console.error('Card generation failed:', error);
            showToast('❌ Failed to generate card');
          })
          .finally(() => {
            setIsGeneratingCard(false);
          });
      }
    }, [snippet, activeTab, generateCardImage]);

    useEffect(() => {
      if (showUsernameInput) {
        setTempUsername(displayUsername);
        setTempGithubUsername(displayGithubUsername);
      }
    }, [showUsernameInput]);

    const publicUrl = `${appUrl}/snippet/${snippet?.slug || ''}`;
    const quickAnalysisText = !isAdvanced && fullAnalysis?.analysis ? fullAnalysis.analysis : null;

    if (loading) {
      return <LoadingState />;
    }

    if (!snippet) {
      return <EmptyState />;
    }

    return (
      <div className="flex flex-col h-full bg-white rounded-xl border-2 border-[#d0d0d8] overflow-hidden relative shadow-sm">
        {toastMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#1a1a2e] text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm transition-all duration-300">
            {toastMessage}
          </div>
        )}

        {/* Hidden Card for image generation */}
        <div className="absolute left-[-9999px] top-[-9999px]">
          <CardPreview
            ref={cardRef}
            title={snippet?.card_title || 'Code Analysis'}
            summary={snippet?.key_concept || 'Analysis of the provided code snippet.'}
            username={displayUsername || 'Developer'}
            slug={snippet?.slug || ''}
            language={snippet?.language || 'javascript'}
            theme={selectedTheme}
            showCode={true}
            codeSnippet={snippet?.raw_code || ''}
            createdAt={snippet?.created_at}
            githubUsername={displayGithubUsername || undefined}
          />
        </div>

        <OutputPanelHeader activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 p-4 md:p-6 overflow-y-auto text-[#1a1a2e]">
          {/* Explanation Tab */}
          {activeTab === 'explanation' && (
            <ExplanationTab 
              snippet={snippet} 
              isAdvanced={isAdvanced} 
              quickAnalysisText={quickAnalysisText}
              analysisText={snippet.what_this_code_does || ''}
              debugAnalysis={snippet.debug_analysis || ''}
              optimization={snippet.optimization || ''}
              keyConcept={snippet.key_concept || ''}
              cardTitle={snippet.card_title || ''}
            />
          )}

          {/* LinkedIn Tab */}
          {activeTab === 'linkedin' && (
            <LinkedInTab 
              linkedinPost={snippet.linkedin_post || ''}
              shareUrl={publicUrl}
              showToast={showToast}
            />
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <PreviewTab
              snippet={snippet}
              selectedTheme={selectedTheme}
              setSelectedTheme={setSelectedTheme}
              cardImageDataUrl={cardImageDataUrl}
              isGeneratingCard={isGeneratingCard}
              showUsernameInput={showUsernameInput}
              setShowUsernameInput={setShowUsernameInput}
              tempUsername={tempUsername}
              setTempUsername={setTempUsername}
              tempGithubUsername={tempGithubUsername}
              setTempGithubUsername={setTempGithubUsername}
              isUpdating={isUpdating}
              updateCardImage={updateCardImage}
              showToast={showToast}
              publicUrl={publicUrl}
              appUrl={appUrl}
              downloadCard={downloadCard}
            />
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <AnalysisTab
              fullAnalysis={fullAnalysis}
              isAdvanced={isAdvanced}
              quickAnalysisText={quickAnalysisText}
              snippet={snippet}
            />
          )}

          {/* Line-by-Line Tab */}
          {activeTab === 'line-by-line' && (
            <LineByLineTab
              snippet={snippet}
              lineExplanations={lineExplanations}
              isExplaining={isExplaining}
              hoveredLine={hoveredLine}
              onLineHover={onLineHover}
              showToast={showToast}
              appUrl={appUrl}
            />
          )}

          {/* Prompt Tab */}
          {activeTab === 'prompt' && (
            <PromptTab
              snippet={snippet}
              generatedPrompt={generatedPrompt}
              showToast={showToast}
              appUrl={appUrl}
            />
          )}
        </div>
      </div>
    );
  }
);

OutputPanel.displayName = 'OutputPanel';

export default OutputPanel;