'use client';
import { safeString } from '@/lib/utils';
import { CopyButton, DownloadButton } from '@/components/common';

interface ExplanationTabProps {
  snippet: any;
  isAdvanced: boolean;
  quickAnalysisText: string | null;
  analysisText: string;
  debugAnalysis: string;
  optimization: string;
  keyConcept: string;
  cardTitle: string;
}

export default function ExplanationTab({ 
  snippet, 
  isAdvanced, 
  quickAnalysisText,
  analysisText,
  debugAnalysis,
  optimization,
  keyConcept,
  cardTitle,
}: ExplanationTabProps) {
  
  // ===== تابع جمع‌آوری متن کامل برای کپی و دانلود =====
  const getFullContent = () => {
    let content = '';
    
    if (isAdvanced) {
      content += `📌 ${safeString(cardTitle)}\n\n`;
      content += `💡 Key Concept:\n${safeString(keyConcept)}\n\n`;
      content += `🔍 What This Code Does:\n${safeString(analysisText)}\n\n`;
      content += `🐛 Debug Analysis:\n${safeString(debugAnalysis)}\n\n`;
      content += `⚡ Optimization:\n${safeString(optimization)}\n\n`;
    } else {
      // ===== حالت Simple/Medium: از quickAnalysisText استفاده کن =====
      if (quickAnalysisText) {
        content = quickAnalysisText;
      } else {
        content += `📌 ${safeString(cardTitle)}\n\n`;
        content += `📝 Summary:\n${safeString(keyConcept)}\n\n`;
        if (debugAnalysis && debugAnalysis !== '-') {
          content += `🐛 Debug Analysis:\n${safeString(debugAnalysis)}\n\n`;
        }
      }
    }
    
    return content;
  };

  const fullContent = getFullContent();

  // ===== تابع پاک‌سازی آیکون‌های تکراری از ابتدای متن =====
  const cleanDuplicateIcons = (text: string) => {
    if (!text) return '';
    
    // لیست آیکون‌هایی که ممکن است تکرار شوند
    const iconPattern = /^[📝🐛⚡💡🔍🔧📊✅🧪🔒💼🖼️📖📌⭐🔬🛡️🏁✨🚨🛡️🧩]\s*/;
    
    // حذف آیکون از ابتدای متن اگر وجود داشته باشد
    return text.replace(iconPattern, '');
  };

  // ===== تابع پردازش متن برای حذف ### و فرمت‌دهی =====
  const formatText = (text: string) => {
    if (!text) return '';
    
    // حذف علامت‌های ###
    let formatted = text.replace(/^###\s*/gm, '');
    
    // حذف آیکون‌های تکراری از ابتدای هر خط
    const lines = formatted.split('\n');
    const cleanedLines = lines.map(line => {
      // اگر خط با آیکون شروع می‌شود، آن را حذف کن
      return cleanDuplicateIcons(line);
    });
    formatted = cleanedLines.join('\n');
    
    // تبدیل خطوط با - به لیست
    formatted = formatted.replace(/^-\s*/gm, '• ');
    
    // تبدیل **متن** به برجسته
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    return formatted;
  };

  // ===== تابع تشخیص و نمایش بخش‌ها با آیکون =====
  const renderSection = (title: string, content: string) => {
    if (!content || content === '-') return null;
    
    const iconMap: Record<string, string> = {
      'summary': '📝',
      'key concept': '💡',
      'what this code does': '🔍',
      'debug analysis': '🐛',
      'optimization': '⚡',
      'critical issues': '🚨',
      'quick fix': '⚡',
      'code overview': '📌',
      'logical & edge case analysis': '🔍',
      'refactoring & improvements': '🔧',
      'high-level summary': '💡',
      'code walkthrough': '🧩',
      'what works well': '✅',
      'bugs and risky cases': '🐛',
      'edge cases': '🧪',
      'performance analysis': '⚡',
      'security analysis': '🔒',
      'production readiness': '🛡️',
      'recommended improvements': '🔧',
      'improved code': '✨',
      'suggested tests': '🧪',
      'scorecard': '📊',
      'final verdict': '🏁',
    };

    const lowerTitle = title.toLowerCase();
    let icon = '📌';
    
    for (const [key, value] of Object.entries(iconMap)) {
      if (lowerTitle.includes(key)) {
        icon = value;
        break;
      }
    }

    // پاک کردن عنوان از آیکون‌های اضافی
    const cleanTitle = cleanDuplicateIcons(title);
    const formattedContent = formatText(content);

    return (
      <div className="mb-4">
        <h3 className="font-semibold text-[#4a86f7] flex items-center gap-2 mb-2">
          <span>{icon}</span> {cleanTitle}
        </h3>
        <div 
          className="text-[#1a1a2e] leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
      </div>
    );
  };

  // ===== تابع parse برای حالت Simple/Medium =====
  const parseQuickAnalysis = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const sections: { title: string; content: string }[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // تشخیص عنوان (با ### یا بدون)
      if (trimmed.startsWith('###') || trimmed.match(/^[📝🐛⚡💡🔍🔧📊✅🧪🔒💼🖼️📖📌⭐🔬🛡️🏁✨🚨🛡️🧩]\s/)) {
        if (currentTitle && currentContent.length > 0) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n')
          });
        }
        // حذف ### و آیکون از عنوان
        currentTitle = trimmed
          .replace(/^###\s*/, '')
          .replace(/^[📝🐛⚡💡🔍🔧📊✅🧪🔒💼🖼️📖📌⭐🔬🛡️🏁✨🚨🛡️🧩]\s*/, '')
          .trim();
        currentContent = [];
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }
    
    if (currentTitle && currentContent.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n')
      });
    }
    
    return sections.length > 0 ? sections : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-3 pb-2 border-b-2 border-[#e8e8f0]">
        <CopyButton 
          text={fullContent} 
          label="Copy All" 
          tooltip="Copy all explanation content to clipboard"
          onCopy={() => {}}
        />
        <DownloadButton 
          content={fullContent} 
          filename={`explanation-${snippet?.slug || Date.now()}`} 
          extension="txt"
          label="Download"
          tooltip="Download explanation as text file"
          onDownload={() => {}}
        />
      </div>

      {isAdvanced ? (
        // ===== حالت Advanced =====
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(cardTitle)}
          </h2>
          
          {renderSection('💡 Key Concept', keyConcept)}
          {renderSection('🔍 What This Code Does', analysisText)}
          {renderSection('🐛 Debug Analysis', debugAnalysis)}
          {renderSection('⚡ Optimization', optimization)}
        </div>
      ) : (
        // ===== حالت Simple/Medium =====
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📌</span> {safeString(cardTitle)}
          </h2>
          
          {(() => {
            // ===== اگر quickAnalysisText وجود دارد، از آن استفاده کن =====
            if (quickAnalysisText) {
              const sections = parseQuickAnalysis(quickAnalysisText);
              if (sections && sections.length > 0) {
                return sections.map((section, idx) => (
                  <div key={idx}>
                    {renderSection(section.title, section.content)}
                  </div>
                ));
              }
              // اگر parse نشد، کل متن را نمایش بده
              return renderSection('📝 Analysis', quickAnalysisText);
            }
            
            // ===== fallback: از keyConcept استفاده کن =====
            const sections = parseQuickAnalysis(keyConcept);
            if (sections && sections.length > 0) {
              return sections.map((section, idx) => (
                <div key={idx}>
                  {renderSection(section.title, section.content)}
                </div>
              ));
            }
            return renderSection('📝 Summary', keyConcept);
          })()}
          
          {debugAnalysis && debugAnalysis !== '-' && (
            renderSection('🐛 Debug Analysis', debugAnalysis)
          )}
        </div>
      )}
    </div>
  );
}