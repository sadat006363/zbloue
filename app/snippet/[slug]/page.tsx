// app/snippet/[slug]/page.tsx

import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SnippetDataSchema } from '@/types';
import type { Snippet } from '@/types';
import SnippetHeader from '@/components/snippet/SnippetHeader';
import SnippetCode from '@/components/snippet/SnippetCode';
import SnippetAnalysis from '@/components/snippet/SnippetAnalysis';
import SnippetFullAnalysis from '@/components/snippet/SnippetFullAnalysis';
import SnippetDebug from '@/components/snippet/SnippetDebug';
import SnippetLinkedIn from '@/components/snippet/SnippetLinkedIn';
import SnippetTabLinks from '@/components/snippet/SnippetTabLinks';
import SnippetShareButtons from '@/components/snippet/SnippetShareButtons';
import SnippetFooter from '@/components/snippet/SnippetFooter';
import SnippetUserInfo from '@/components/snippet/SnippetUserInfo';
import SnippetLineByLine from '@/components/snippet/SnippetLineByLine';
import SnippetPrompt from '@/components/snippet/SnippetPrompt';
import SnippetStatusBar from '@/components/snippet/SnippetStatusBar';
import SnippetJsonDropdown from '@/components/snippet/SnippetJsonDropdown';
import DebugLogger from '@/components/DebugLogger';
import {
  normalizeSnippetAudit,
  type NormalizedSnippetAudit,
} from '@/lib/analysis/normalize-snippet-audit';
import { type LineExplanation } from '@/types';
import { adaptCanonicalToLegacy, hasCanonicalAudit } from '@/lib/snippetAdapter';

// ============================================================
// 🔥 غیرفعال کردن کش
// ============================================================
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// ============================================================
// 🔥 تعریف نوع خروجی adaptCanonicalToLegacy برای استفاده در page
// ============================================================
type LegacyFields = ReturnType<typeof adaptCanonicalToLegacy>;

// ============================================================
// 🔥 params (Next.js 16)
// ============================================================
interface PageProps {
  params: Promise<{ slug: string }>;
}

// ============================================================
// 🔧 Helpers
// ============================================================
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ============================================================
// 🔥 تابع دریافت اسنیپت
// ============================================================
async function getSnippet(slug: string): Promise<Snippet> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    throw new Error('Invalid slug');
  }

  const { data, error } = await supabase
    .from('snippets')
    .select('*')
    .eq('slug', normalizedSlug)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    console.error(`[SnippetPage] Supabase error for slug "${normalizedSlug}":`, error);
    throw new Error('Failed to load snippet');
  }

  if (!data) {
    return null as any;
  }

  // 🔥 STEP 1: اگر audit_result وجود دارد، فیلدهای Legacy را از آن پر کن
  let legacyFields: LegacyFields = {
    card_title: '',
    key_concept: '',
    what_this_code_does: '',
    debug_analysis: '',
    optimization: '',
    linkedin_post: '',
    summary: '',
    findings: [],
    scorecard_new: null,
    verdict: null,
  };

  if (hasCanonicalAudit(data)) {
    legacyFields = adaptCanonicalToLegacy(data.audit_result);
  }

  // 🔥 STEP 2: ساخت شیء نهایی با اولویت audit_result (فقط فیلدهای مجاز Root)
  const candidate = {
    // ===== شناسه و پاکت‌نامه =====
    id: data.id ?? '',
    slug: data.slug ?? '',
    raw_code: data.raw_code ?? '',
    language: data.language ?? 'javascript',
    is_public: data.is_public ?? false,
    created_at: data.created_at ?? new Date().toISOString(),

    // ===== اطلاعات کاربر =====
    username: data.username ?? undefined,
    github_username: data.github_username ?? undefined,
    avatar_url: data.avatar_url ?? undefined,
    card_image_url: data.card_image_url ?? undefined,

    // ===== داده‌های تحلیلی (فقط از audit_result) =====
    audit_result: data.audit_result ?? undefined,

    // ===== فیلدهای کمکی (از Adapter پر می‌شوند) =====
    card_title: legacyFields.card_title || data.card_title || 'Code Analysis',
    key_concept: legacyFields.key_concept || data.key_concept || '',
    what_this_code_does: legacyFields.what_this_code_does || data.what_this_code_does || '',
    linkedin_post: legacyFields.linkedin_post || data.linkedin_post || '',

    // ===== Line-by-line و Prompt =====
    line_explanations: data.line_explanations ?? undefined,
    generated_prompt: data.generated_prompt ?? undefined,

    // فیلدهای Legacy اضافی (برای backward compatibility – در صورت وجود)
    code_walkthrough: data.code_walkthrough ?? undefined,
    what_works_well: data.what_works_well ?? undefined,
    bugs_and_risky_cases: data.bugs_and_risky_cases ?? undefined,
    edge_cases: data.edge_cases ?? undefined,
    performance_analysis: data.performance_analysis ?? undefined,
    security_analysis: data.security_analysis ?? undefined,
    production_readiness: data.production_readiness ?? undefined,
    recommended_improvements: data.recommended_improvements ?? undefined,
    suggested_tests: data.suggested_tests ?? undefined,
    scorecard: data.scorecard ?? undefined,
    final_verdict_summary: data.final_verdict_summary ?? undefined,
    final_verdict_approved: data.final_verdict_approved ?? undefined,
    final_verdict_next_steps: data.final_verdict_next_steps ?? undefined,
  };

  const validation = SnippetDataSchema.safeParse(candidate);

  if (!validation.success) {
    console.error(
      `[SnippetPage] Invalid data for slug "${normalizedSlug}":`,
      validation.error.flatten()
    );
    throw new Error('Snippet data is invalid');
  }

  return validation.data;
}

// ============================================================
// 🔥 تابع هایلایت کد
// ============================================================
async function highlightCode(code: string, language: string): Promise<string> {
  try {
    const { codeToHtml } = await import('shiki');
    return await codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    });
  } catch (error) {
    console.error('[SnippetPage] Code highlighting failed:', error);
    return `<pre class="overflow-x-auto text-[#cdd6f4]"><code>${escapeHtml(
      code
    )}</code></pre>`;
  }
}

// ============================================================
// 🏠 صفحه اصلی
// ============================================================
export default async function SnippetPage({ params }: PageProps) {
  const { slug } = await params;

  let snippet: Snippet | null = null;
  let error: Error | null = null;
  let normalizedAudit: NormalizedSnippetAudit | null = null;

  try {
    snippet = await getSnippet(slug);
    if (snippet) {
      normalizedAudit = normalizeSnippetAudit(snippet);

      // ============================================================
      // 🔥 اضافه کردن داده‌های Advanced از normalizedAudit به snippet
      // ============================================================
      if (normalizedAudit && (normalizedAudit.status.type === 'valid' || normalizedAudit.status.type === 'legacy')) {
        const auditData = normalizedAudit.status.audit;
        if (auditData) {
          snippet = {
            ...snippet,
            // فقط فیلدهای کمکی را از auditData به‌روز می‌کنیم
            card_title: auditData.title ?? snippet.card_title,
            key_concept: auditData.summary ?? snippet.key_concept,
            what_this_code_does: auditData.executionOverview?.entryPoints?.join(', ') ?? snippet.what_this_code_does,
            linkedin_post: auditData.linkedinPost ?? snippet.linkedin_post,
          };
          // audit_result قبلاً تنظیم شده است و نیازی به تغییر ندارد
        }
      }
    }
  } catch (err) {
    error = err as Error;
    console.error('[SnippetPage] Error loading snippet:', error);
  }

  if (error || !snippet) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const shareUrl = `${baseUrl}/snippet/${snippet.slug}`;
  const highlightedHtml = await highlightCode(snippet.raw_code, snippet.language);

  // 🔥 تشخیص وجود تحلیل کامل (Advanced) – از audit_result
  const hasAudit = !!(snippet.audit_result);
  const fullAnalysisExists = hasAudit && !!(snippet.audit_result?.findings?.length ||
    snippet.audit_result?.scorecard || snippet.audit_result?.verdict);

  // 🔥 استخراج متن کامل تحلیل از audit_result
  let fullAnalysisText = snippet.audit_result?.analysis || '';

  // 🔥 اگر Advanced است و analysis خالی است، از داده‌های ساختاریافته متن بساز
  if (fullAnalysisExists && !fullAnalysisText) {
    fullAnalysisText = buildAnalysisTextForAdvanced(snippet.audit_result);
  }

  const debugData = {
    fullAnalysisExists,
    hasAudit,
    findings: snippet.audit_result?.findings || [],
    scorecard_new: snippet.audit_result?.scorecard || null,
    verdict: snippet.audit_result?.verdict || null,
    execution_overview: snippet.audit_result?.executionOverview || null,
    normalizedAudit,
  };

  const lineExplanations = snippet.line_explanations && Array.isArray(snippet.line_explanations)
    ? (snippet.line_explanations as LineExplanation[])
    : [];

  return (
    <>
      {process.env.NODE_ENV === 'development' && <DebugLogger data={debugData} />}

      <main className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <SnippetHeader shareUrl={shareUrl} title={snippet.card_title || 'Code Snippet'} />
            <SnippetJsonDropdown snippet={snippet} />
          </div>

          <SnippetUserInfo
            username={snippet.username || 'Anonymous'}
            githubUsername={snippet.github_username || undefined}
          />

          <SnippetStatusBar snippet={snippet} />
          <SnippetShareButtons slug={snippet.slug} title={snippet.card_title || 'Code Snippet'} />
          <SnippetTabLinks shareUrl={shareUrl} />

          <div id="snippet-code">
            <SnippetCode
              code={snippet.raw_code ?? ''}
              language={snippet.language ?? 'text'}
              highlightedHtml={highlightedHtml}
            />
          </div>

          {/* ============================================================
              🔥 SnippetAnalysis - با ارسال audit_result
              ============================================================ */}
          <div id="snippet-analysis">
            <SnippetAnalysis
              keyConcept={snippet.key_concept}
              whatItDoes={snippet.what_this_code_does}
              fullAnalysis={fullAnalysisText}
              auditResult={snippet.audit_result}
            />
          </div>

          <div id="snippet-debug">
            <SnippetDebug
              debugAnalysis={snippet.audit_result?.findings?.length ? `${snippet.audit_result.findings.length} findings` : '-'}
              optimization={snippet.audit_result?.recommendedActions?.length
                ? snippet.audit_result.recommendedActions.map((a: any) => a.title).join('; ')
                : '-'}
            />
          </div>

          <div id="snippet-full-analysis">
            {fullAnalysisExists ? (
              <SnippetFullAnalysis snippet={snippet} />
            ) : (
              <div className="mt-8 pt-6 border-t border-[#313244]">
                <div className="bg-[#11111b] p-6 rounded-lg border border-[#313244] text-center">
                  <p className="text-[#a6adc8] text-sm">
                    📊 Full analysis is only available in <strong>Advanced</strong> mode.
                  </p>
                  <p className="text-[#6c7086] text-xs mt-2">
                    Switch to Advanced mode to see detailed findings, scorecard, and recommendations.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================
              🔥 Line-by-Line Section - Always show
              ============================================================ */}
          <div id="snippet-line-by-line" className="mt-8 pt-6 border-t border-[#313244]">
            {lineExplanations.length > 0 ? (
              <SnippetLineByLine lineExplanations={lineExplanations} />
            ) : (
              <div className="bg-[#11111b] p-6 rounded-lg border border-[#313244] text-center">
                <p className="text-[#a6adc8] text-sm">
                  📝 No line-by-line explanation generated yet.
                </p>
                <p className="text-[#6c7086] text-xs mt-2">
                  Click the <span className="font-semibold text-[#89b4fa]">"Explain"</span> button in the editor toolbar to generate line-by-line explanations.
                </p>
              </div>
            )}
          </div>

          {/* ============================================================
              🔥 Prompt Section - Always show
              ============================================================ */}
          <div id="snippet-prompt" className="mt-8 pt-6 border-t border-[#313244]">
            {snippet.generated_prompt ? (
              <SnippetPrompt generatedPrompt={snippet.generated_prompt} />
            ) : (
              <div className="bg-[#11111b] p-6 rounded-lg border border-[#313244] text-center">
                <p className="text-[#a6adc8] text-sm">
                  📝 No prompt generated yet.
                </p>
                <p className="text-[#6c7086] text-xs mt-2">
                  Click the <span className="font-semibold text-[#89b4fa]">"Generate Prompt"</span> button in the editor toolbar to create a prompt from your code.
                </p>
              </div>
            )}
          </div>

          {snippet.linkedin_post && (
            <div id="snippet-linkedin">
              <SnippetLinkedIn linkedinPost={snippet.linkedin_post} />
            </div>
          )}

          <SnippetFooter appUrl={baseUrl || 'https://zbloue.vercel.app'} />
        </div>
      </main>
    </>
  );
}

// ============================================================
// 🔥 تابع تولید متن تحلیل برای Advanced
// ============================================================
function buildAnalysisTextForAdvanced(audit: any): string {
  if (!audit) return 'No detailed analysis available.';

  const parts: string[] = [];

  if (audit.title) {
    parts.push(`📌 Title: ${audit.title}`);
  }

  if (audit.summary) {
    parts.push(`📝 Summary: ${audit.summary}`);
    parts.push('');
  }

  if (audit.findings && audit.findings.length > 0) {
    parts.push(`🔍 Findings (${audit.findings.length}):`);
    audit.findings.slice(0, 5).forEach((f: any) => {
      const confidence = f.confidence || 'unknown';
      parts.push(`  - [${f.severity}] ${f.title} (${confidence})`);
      if (f.remediation) {
        parts.push(`    Fix: ${f.remediation}`);
      }
    });
    if (audit.findings.length > 5) {
      parts.push(`  ... and ${audit.findings.length - 5} more findings`);
    }
    parts.push('');
  }

  if (audit.scorecard) {
    const scoreItems = Object.entries(audit.scorecard)
      .filter(([_, v]: [string, any]) => v?.applicable === true && typeof v?.score === 'number')
      .map(([k, v]: [string, any]) => `${k}: ${v.score}`);
    if (scoreItems.length > 0) {
      parts.push(`📊 Scorecard:\n  ${scoreItems.join('\n  ')}`);
    }
    parts.push('');
  }

  if (audit.verdict) {
    parts.push(`🏁 Verdict: ${audit.verdict.status}`);
    if (audit.verdict.explanation) {
      parts.push(`  ${audit.verdict.explanation}`);
    }
    parts.push('');
  }

  if (audit.limitations && audit.limitations.length > 0) {
    parts.push(`⚠️ Limitations:`);
    audit.limitations.slice(0, 3).forEach((lim: string) => {
      parts.push(`  - ${lim}`);
    });
  }

  return parts.join('\n\n') || 'No detailed analysis available.';
}