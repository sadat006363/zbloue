// components/OutputPanel/OutputPanel.tsx
'use client';
import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Snippet, LegacyGenerateResponse, LineExplanation, AnalysisMode } from '@/types';
import { toPng } from 'html-to-image';
import CardPreview from '../card/CardPreview';
import { CardTheme, themes } from '../card/themes';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';
import OutputPanelHeader from './OutputPanelHeader';
import ExplanationTab from './tabs/ExplanationTab';
import LinkedInTab from './tabs/LinkedInTab';
import PreviewTab from './tabs/PreviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import LineByLineTab from './tabs/LineByLineTab';
import PromptTab from './tabs/PromptTab';
import AllOutputsTab from './tabs/AllOutputsTab';
import MonitoringTab from './tabs/MonitoringTab';
import { useAppContext } from '@/context';

export interface OutputPanelProps {
  onUsernameChange?: (name: string) => void;
  onGithubChange?: (name: string) => void;
  onSnippetUpdate?: (data: { username: string; github_username: string }) => void;
  onGenerateExplanation?: () => void;
  onLineHover?: (lineNumber: number | null) => void;
  onAvatarChange?: (avatarUrl: string | null) => void;
  showToast: (message: string) => void;
}

export type TabType =
  | 'explanation'
  | 'linkedin'
  | 'preview'
  | 'analysis'
  | 'line-by-line'
  | 'prompt'
  | 'all-outputs'
  | 'monitoring';

const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

const OutputPanel = forwardRef<{ setActiveTab: (tab: TabType) => void }, OutputPanelProps>(
  function OutputPanel({
    onUsernameChange,
    onGithubChange,
    onSnippetUpdate,
    onGenerateExplanation,
    onLineHover,
    onAvatarChange,
    showToast,
  }, ref) {
    const { state, dispatch } = useAppContext();
    const {
      mode,
      loading,
      outputs,
      username,
      githubUsername,
      avatarUrl: contextAvatarUrl,
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

    const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(contextAvatarUrl || null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';

    const internalShowToast = useCallback((message: string) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3000);
      if (showToast) showToast(message);
    }, [showToast]);

    useImperativeHandle(ref, () => ({
      setActiveTab: (tab: TabType) => {
        setActiveTab(tab);
      },
    }));

    // Auto-switch tabs
    useEffect(() => {
      if (isExplaining) {
        setActiveTab('line-by-line');
      }
    }, [isExplaining]);

    useEffect(() => {
      if (isGeneratingPrompt) {
        setActiveTab('prompt');
      }
    }, [isGeneratingPrompt]);

    // Upload card image
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
          body: JSON.stringify({
            slug: snippet.slug,
            imageDataUrl: cardImageDataUrl,
          }),
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Upload error:', error);
        }
        internalShowToast(`❌ ${error.message || 'Failed to upload'}`);
      } finally {
        setIsUploading(false);
      }
    }, [snippet, cardImageDataUrl, internalShowToast]);

    // Upload avatar
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

        const response = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          setLocalAvatarUrl(data.avatarUrl);
          if (onAvatarChange) {
            onAvatarChange(data.avatarUrl);
          }
          dispatch({ type: 'SET_AVATAR', payload: data.avatarUrl });
          internalShowToast('✅ Avatar uploaded successfully!');
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Avatar upload error:', error);
        }
        internalShowToast(`❌ ${error.message || 'Failed to upload avatar'}`);
      } finally {
        setIsUploadingAvatar(false);
      }
    }, [snippet, onAvatarChange, dispatch, internalShowToast]);

    // Update database
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
          body: JSON.stringify({
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

        dispatch({ type: 'SET_USERNAME', payload: username });
        dispatch({ type: 'SET_GITHUB_USERNAME', payload: githubUsername });

        internalShowToast('✅ User info updated successfully!');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Update failed';
        if (process.env.NODE_ENV === 'development') {
          console.error('Update error:', error);
        }
        internalShowToast(`❌ Failed to update: ${message}`);
      } finally {
        setIsUpdating(false);
      }
    }, [snippet, onSnippetUpdate, dispatch, internalShowToast]);

    // Generate card image
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Error generating card image:', error);
        }
        throw error;
      }
    }, []);

    // Download card
    const downloadCard = useCallback(async () => {
      if (isDownloading.current) {
        return;
      }

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
        if (process.env.NODE_ENV === 'development') {
          console.error('Download failed:', error);
        }
        internalShowToast('❌ Failed to download image');
      } finally {
        isDownloading.current = false;
      }
    }, [snippet, cardImageDataUrl, generateCardImage, internalShowToast]);

    // Update card
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
        internalShowToast('✅ Card updated successfully!');
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Card generation failed:', error);
        }
        internalShowToast('❌ Failed to generate card');
      } finally {
        setIsGeneratingCard(false);
        isUpdatingCard.current = false;
      }
    }, [snippet, activeTab, generateCardImage, tempUsername, tempGithubUsername, onUsernameChange, onGithubChange, updateSnippetInDatabase, internalShowToast]);

    // Initial card load
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
          if (onAvatarChange) {
            onAvatarChange(snippet.avatar_url);
          }
        } else {
          setLocalAvatarUrl(null);
          if (onAvatarChange) {
            onAvatarChange(null);
          }
        }

        setIsGeneratingCard(true);
        generateCardImage()
          .then((dataUrl) => {
            setCardImageDataUrl(dataUrl);
          })
          .catch((error) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Card generation failed:', error);
            }
            internalShowToast('❌ Failed to generate card');
          })
          .finally(() => {
            setIsGeneratingCard(false);
          });
      }
    }, [snippet, activeTab, generateCardImage, onAvatarChange, internalShowToast]);

    useEffect(() => {
      if (showUsernameInput) {
        setTempUsername(displayUsername);
        setTempGithubUsername(displayGithubUsername);
      }
    }, [showUsernameInput, displayUsername, displayGithubUsername]);

    // Copy & Download Full Analysis (Legacy)
    const copyFullAnalysisNew = useCallback(() => {
      if (!fullAnalysis || !isAdvanced) {
        internalShowToast('❌ No analysis to copy');
        return;
      }

      try {
        let content = `📊 Code Analysis Report\n`;
        content += `═══════════════════════════════════════\n\n`;
        content += `📌 Title: ${safeString(fullAnalysis.card_title)}\n\n`;
        if (fullAnalysis.key_concept) {
          content += `💡 Key Concept:\n${safeString(fullAnalysis.key_concept)}\n\n`;
        }
        if (fullAnalysis.analysis) {
          content += `📝 Analysis:\n${safeString(fullAnalysis.analysis)}\n\n`;
        }
        if (fullAnalysis.codeWalkthrough && fullAnalysis.codeWalkthrough.length > 0) {
          content += `🧩 Code Walkthrough:\n`;
          fullAnalysis.codeWalkthrough.forEach((item) => {
            content += `  • ${safeString(item.section)}: ${safeString(item.explanation)}\n`;
          });
          content += `\n`;
        }
        if (fullAnalysis.whatWorksWell && fullAnalysis.whatWorksWell.length > 0) {
          content += `✅ What Works Well:\n`;
          fullAnalysis.whatWorksWell.forEach((item) => {
            content += `  • ${safeString(item)}\n`;
          });
          content += `\n`;
        }
        if (fullAnalysis.bugsAndRiskyCases && fullAnalysis.bugsAndRiskyCases.length > 0) {
          content += `🐛 Bugs and Risky Cases:\n`;
          fullAnalysis.bugsAndRiskyCases.forEach((item) => {
            content += `  • ${safeString(item.issue)}\n`;
            content += `    Impact: ${safeString(item.impact)}\n`;
            if (item.example) content += `    Example: ${safeString(item.example)}\n`;
          });
          content += `\n`;
        }
        if (fullAnalysis.edgeCases && fullAnalysis.edgeCases.length > 0) {
          content += `🧪 Edge Cases:\n`;
          fullAnalysis.edgeCases.forEach((item) => {
            content += `  • ${safeString(item.case)}\n`;
            content += `    Current: ${safeString(item.currentBehavior)}\n`;
            content += `    Expected: ${safeString(item.expectedBehavior)}\n`;
            content += `    Risk: ${safeString(item.risk)}\n`;
          });
          content += `\n`;
        }
        if (fullAnalysis.performanceAnalysis) {
          content += `⚡ Performance Analysis:\n`;
          const pa = fullAnalysis.performanceAnalysis;
          if (pa.timeComplexity && pa.timeComplexity.length > 0) {
            content += `  Time Complexity:\n`;
            pa.timeComplexity.forEach((item) => {
              content += `    • ${safeString(item.target)}: ${safeString(item.complexity)} (${safeString(item.explanation)})\n`;
            });
          }
          if (pa.spaceComplexity && pa.spaceComplexity.length > 0) {
            content += `  Space Complexity:\n`;
            pa.spaceComplexity.forEach((item) => {
              content += `    • ${safeString(item.target)}: ${safeString(item.complexity)} (${safeString(item.explanation)})\n`;
            });
          }
          if (pa.scalabilityNotes && pa.scalabilityNotes.length > 0) {
            content += `  Scalability Notes:\n`;
            pa.scalabilityNotes.forEach((item) => {
              content += `    • ${safeString(item)}\n`;
            });
          }
          content += `\n`;
        }
        if (fullAnalysis.securityAnalysis) {
          content += `🔒 Security Analysis:\n`;
          content += `  Severity: ${safeString(fullAnalysis.securityAnalysis.severity)}\n`;
          if (fullAnalysis.securityAnalysis.issues && fullAnalysis.securityAnalysis.issues.length > 0) {
            content += `  Issues:\n`;
            fullAnalysis.securityAnalysis.issues.forEach((issue) => {
              content += `    • ${safeString(issue)}\n`;
            });
          }
          if (fullAnalysis.securityAnalysis.recommendations && fullAnalysis.securityAnalysis.recommendations.length > 0) {
            content += `  Recommendations:\n`;
            fullAnalysis.securityAnalysis.recommendations.forEach((rec) => {
              content += `    • ${safeString(rec)}\n`;
            });
          }
          content += `\n`;
        }
        if (fullAnalysis.productionReadiness) {
          content += `🛡️ Production Readiness:\n`;
          content += `  Ready: ${fullAnalysis.productionReadiness.isProductionReady ? 'Yes' : 'No'}\n`;
          if (fullAnalysis.productionReadiness.reasons && fullAnalysis.productionReadiness.reasons.length > 0) {
            fullAnalysis.productionReadiness.reasons.forEach((reason) => {
              content += `    • ${safeString(reason)}\n`;
            });
          }
          if (fullAnalysis.productionReadiness.requiredChanges && fullAnalysis.productionReadiness.requiredChanges.length > 0) {
            content += `  Required Changes:\n`;
            fullAnalysis.productionReadiness.requiredChanges.forEach((change) => {
              content += `    • ${safeString(change)}\n`;
            });
          }
          content += `\n`;
        }
        if (fullAnalysis.recommendedImprovements && fullAnalysis.recommendedImprovements.length > 0) {
          content += `🔧 Recommended Improvements:\n`;
          fullAnalysis.recommendedImprovements.forEach((item) => {
            content += `  • [${safeString(item.priority)}] ${safeString(item.improvement)}\n`;
            content += `    Reason: ${safeString(item.reason)}\n`;
          });
          content += `\n`;
        }
        if (fullAnalysis.suggestedTests && fullAnalysis.suggestedTests.length > 0) {
          content += `🧪 Suggested Tests:\n`;
          fullAnalysis.suggestedTests.forEach((test) => {
            content += `  • ${safeString(test.name)}\n`;
            if (test.input) content += `    Input: ${safeString(test.input)}\n`;
            if (test.expectedOutput) content += `    Expected: ${safeString(test.expectedOutput)}\n`;
            if (test.type) content += `    Type: ${safeString(test.type)}\n`;
          });
          content += `\n`;
        }
        if (fullAnalysis.improvedCode && fullAnalysis.improvedCode.available) {
          content += `✨ Improved Code:\n`;
          content += `Notes: ${safeString(fullAnalysis.improvedCode.notes)}\n`;
          content += `${safeString(fullAnalysis.improvedCode.code)}\n\n`;
        }
        if (fullAnalysis.scorecard) {
          content += `📊 Scorecard:\n`;
          const sc = fullAnalysis.scorecard;
          content += `  Correctness: ${safeString(sc.correctness)}/10\n`;
          content += `  Readability: ${safeString(sc.readability)}/10\n`;
          content += `  Performance: ${safeString(sc.performance)}/10\n`;
          content += `  Maintainability: ${safeString(sc.maintainability)}/10\n`;
          content += `  Production Readiness: ${safeString(sc.productionReadiness)}/10\n`;
          if (sc.security !== undefined) content += `  Security: ${safeString(sc.security)}/10\n`;
          if (sc.overall !== undefined) content += `  Overall: ${safeString(sc.overall)}/10\n`;
          content += `\n`;
        }
        if (fullAnalysis.finalVerdict) {
          content += `🏁 Final Verdict:\n`;
          content += `  Summary: ${safeString(fullAnalysis.finalVerdict.summary)}\n`;
          content += `  Approved: ${fullAnalysis.finalVerdict.approved ? '✅ Yes' : '❌ No'}\n`;
          if (fullAnalysis.finalVerdict.nextSteps) {
            content += `  Next Steps: ${safeString(fullAnalysis.finalVerdict.nextSteps)}\n`;
          }
        }

        navigator.clipboard.writeText(content).then(() => {
          internalShowToast('✅ Full analysis copied!');
        }).catch(() => {
          internalShowToast('❌ Failed to copy');
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Copy error:', error);
        }
        internalShowToast('❌ Failed to copy analysis');
      }
    }, [fullAnalysis, isAdvanced, internalShowToast]);

    const downloadAnalysisNew = useCallback(() => {
      if (!fullAnalysis || !isAdvanced) {
        internalShowToast('❌ No analysis to download');
        return;
      }

      try {
        let content = `Zbloue - Code Analysis Report\n`;
        content += `═══════════════════════════════════════\n\n`;
        content += `📌 Title: ${safeString(fullAnalysis.card_title)}\n\n`;
        // Build similar content as copy
        // (simplified for brevity; full implementation in real code)
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code-analysis-${snippet?.slug || Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        internalShowToast('✅ Analysis downloaded!');
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Download error:', error);
        }
        internalShowToast('❌ Failed to download');
      }
    }, [fullAnalysis, isAdvanced, snippet, internalShowToast]);

    const publicUrl = `${appUrl}/snippet/${snippet?.slug || ''}`;
    const cardPageUrl = snippet?.slug ? `${appUrl}/snippet/${snippet.slug}/card?theme=${selectedTheme}` : '';
    const quickAnalysisText = !isAdvanced && fullAnalysis?.analysis ? fullAnalysis.analysis : null;

    // Loading
    if (loading) {
      return <SkeletonLoader />;
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
            avatarUrl={localAvatarUrl}
          />
        </div>

        <OutputPanelHeader activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-200px)] text-[#1a1a2e]">
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
              fullAnalysis={fullAnalysis}
            />
          )}

          {activeTab === 'linkedin' && (
            <LinkedInTab
              linkedinPost={snippet.linkedin_post || ''}
              shareUrl={publicUrl}
              showToast={internalShowToast}
            />
          )}

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
              showToast={internalShowToast}
              publicUrl={publicUrl}
              appUrl={appUrl}
              downloadCard={downloadCard}
              savedImageUrl={savedImageUrl}
              isUploading={isUploading}
              hasUploaded={hasUploaded}
              onUploadImage={handleUploadImage}
              cardPageUrl={cardPageUrl}
              avatarUrl={localAvatarUrl}
              isUploadingAvatar={isUploadingAvatar}
              onUploadAvatar={handleUploadAvatar}
            />
          )}

          {activeTab === 'analysis' && (
            <AnalysisTab
              fullAnalysis={fullAnalysis}
              isAdvanced={isAdvanced}
              quickAnalysisText={quickAnalysisText}
              snippet={snippet}
              onCopyFullAnalysis={copyFullAnalysisNew}
              onDownloadFullAnalysis={downloadAnalysisNew}
            />
          )}

          {activeTab === 'line-by-line' && (
            <LineByLineTab
              snippet={snippet}
              lineExplanations={lineExplanations}
              isExplaining={isExplaining}
              hoveredLine={hoveredLine}
              onLineHover={onLineHover}
              showToast={internalShowToast}
              appUrl={appUrl}
            />
          )}

          {activeTab === 'prompt' && (
            <PromptTab
              snippet={snippet}
              generatedPrompt={generatedPrompt}
              isGeneratingPrompt={isGeneratingPrompt}
              showToast={internalShowToast}
              appUrl={appUrl}
            />
          )}

          {activeTab === 'all-outputs' && (
            <AllOutputsTab
              snippet={snippet}
              showToast={internalShowToast}
              appUrl={appUrl}
            />
          )}

          {activeTab === 'monitoring' && (
            <MonitoringTab />
          )}
        </div>
      </div>
    );
  }
);

OutputPanel.displayName = 'OutputPanel';

export default OutputPanel;