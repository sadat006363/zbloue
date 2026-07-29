// components/OutputPanel/OutputPanel.tsx
'use client';

import { forwardRef, useImperativeHandle } from 'react';
import CardPreview from '../card/CardPreview';
import { CarbonModal } from '@/components/Carbon/CarbonModal';
import OutputPanelTabs, { type TabType } from './OutputPanelTabs';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';
import ExplanationTab from './tabs/ExplanationTab';
import LinkedInTab from './tabs/LinkedInTab';
import PreviewTab from './tabs/PreviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import LineByLineTab from './tabs/LineByLineTab';
import PromptTab from './tabs/PromptTab';
import AllOutputsTab from './tabs/AllOutputsTab';
import MonitoringTab from './tabs/MonitoringTab';
import { useOutputPanel } from './useOutputPanel';

export interface OutputPanelProps {
  onUsernameChange?: (name: string) => void;
  onGithubChange?: (name: string) => void;
  onSnippetUpdate?: (data: { username: string; github_username: string }) => void;
  onGenerateExplanation?: () => void;
  onLineHover?: (lineNumber: number | null) => void;
  onAvatarChange?: (avatarUrl: string | null) => void;
  showToast: (message: string) => void;
}

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
    const {
      loading,
      snippet,
      fullAnalysis,
      lineExplanations,
      generatedPrompt,
      isAdvanced,
      isExplaining,
      isGeneratingPrompt,
      hoveredLine,
      cardTitle,
      keyConcept,
      whatItDoes,
      debugAnalysis,
      optimization,
      linkedinPost,
      activeTab,
      setActiveTab,
      toastMessage,
      cardImageDataUrl,
      isGeneratingCard,
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
      internalShowToast,
      handleUploadImage,
      handleUploadAvatar,
      downloadCard,
      updateCardImage,
    } = useOutputPanel(
      onUsernameChange,
      onGithubChange,
      onSnippetUpdate,
      onAvatarChange,
      showToast
    );

    // ============================================================
    // توابع کپی و دانلود (اختصاصی)
    // ============================================================

    const copyFullAnalysisNew = () => {
      if (!fullAnalysis || !isAdvanced) {
        internalShowToast('❌ No analysis to copy');
        return;
      }
      try {
        let content = `📊 Code Analysis Report\n`;
        content += `═══════════════════════════════════════\n\n`;
        content += `📌 Title: ${fullAnalysis.card_title || 'Code Analysis'}\n\n`;
        if (fullAnalysis.key_concept) content += `💡 Key Concept:\n${fullAnalysis.key_concept}\n\n`;
        if (fullAnalysis.analysis) content += `📝 Analysis:\n${fullAnalysis.analysis}\n\n`;
        navigator.clipboard.writeText(content).then(() => {
          internalShowToast('✅ Full analysis copied!');
        }).catch(() => {
          internalShowToast('❌ Failed to copy');
        });
      } catch (error) {
        internalShowToast('❌ Failed to copy analysis');
      }
    };

    const downloadAnalysisNew = () => {
      if (!fullAnalysis || !isAdvanced) {
        internalShowToast('❌ No analysis to download');
        return;
      }
      try {
        let content = `Zbloue - Code Analysis Report\n`;
        content += `═══════════════════════════════════════\n\n`;
        content += `📌 Title: ${fullAnalysis.card_title || 'Code Analysis'}\n\n`;
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
        internalShowToast('❌ Failed to download');
      }
    };

    useImperativeHandle(ref, () => ({
      setActiveTab: (tab: TabType) => setActiveTab(tab),
    }));

    if (loading) return <SkeletonLoader />;
    if (!snippet) return <EmptyState />;

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
            title={cardTitle}
            summary={keyConcept}
            username={displayUsername || 'Developer'}
            slug={snippet.slug || ''}
            language={snippet.language || 'javascript'}
            theme={selectedTheme}
            showCode={true}
            codeSnippet={snippet.raw_code || ''}
            createdAt={snippet.created_at}
            githubUsername={displayGithubUsername || undefined}
            avatarUrl={localAvatarUrl}
          />
        </div>

        <OutputPanelTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-200px)] text-[#1a1a2e]">
          {activeTab === 'explanation' && (
            <ExplanationTab
              snippet={snippet}
              isAdvanced={isAdvanced}
              quickAnalysisText={quickAnalysisText}
              analysisText={whatItDoes}
              debugAnalysis={debugAnalysis}
              optimization={optimization}
              keyConcept={keyConcept}
              cardTitle={cardTitle}
              fullAnalysis={fullAnalysis}
            />
          )}
          {activeTab === 'linkedin' && (
            <LinkedInTab linkedinPost={linkedinPost} shareUrl={publicUrl} showToast={internalShowToast} />
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
            <AllOutputsTab snippet={snippet} showToast={internalShowToast} appUrl={appUrl} />
          )}
          {activeTab === 'monitoring' && <MonitoringTab />}
          {activeTab === 'carbon' && (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-4 text-center">
              <h2 className="text-3xl font-bold text-white">🎨 Carbon</h2>
              <p className="text-[#a6adc8] max-w-md">
                Create beautiful, customizable code snapshots with syntax highlighting.
              </p>
              <button
                onClick={() => setIsCarbonModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#4a86f7] to-[#a855f7] text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                Open Carbon Editor
              </button>
            </div>
          )}
        </div>

        <CarbonModal
          isOpen={isCarbonModalOpen}
          onClose={() => setIsCarbonModalOpen(false)}
          initialCode={snippet.raw_code || ''}
          initialLanguage={snippet.language || 'javascript'}
        />
      </div>
    );
  }
);

OutputPanel.displayName = 'OutputPanel';

export default OutputPanel;