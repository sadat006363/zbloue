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

  // 🔥 تبدیل تمام مقادیر null به undefined برای تطابق با SnippetDataSchema
  const candidate = {
    id: data.id ?? '',
    slug: data.slug ?? '',
    raw_code: data.raw_code ?? '',
    language: data.language ?? 'javascript',
    card_title: data.card_title ?? 'Code Analysis',
    key_concept: data.key_concept ?? '',
    what_this_code_does: data.what_this_code_does ?? '',
    debug_analysis: data.debug_analysis ?? '-',
    optimization: data.optimization ?? '-',
    linkedin_post: data.linkedin_post ?? '',
    is_public: data.is_public ?? false,
    created_at: data.created_at ?? new Date().toISOString(),

    username: data.username ?? undefined,
    github_username: data.github_username ?? undefined,
    avatar_url: data.avatar_url ?? undefined,
    card_image_url: data.card_image_url ?? undefined,

    code_walkthrough: data.code_walkthrough ?? undefined,
    what_works_well: data.what_works_well ?? undefined,
    bugs_and_risky_cases: data.bugs_and_risky_cases ?? undefined,
    edge_cases: data.edge_cases ?? undefined,
    performance_analysis: data.performance_analysis ?? undefined,
    security_analysis: data.security_analysis ?? undefined,
    production_readiness: data.production_readiness ?? undefined,
    recommended_improvements: data.recommended_improvements ?? undefined,
    improved_code: data.improved_code ?? undefined,
    suggested_tests: data.suggested_tests ?? undefined,
    scorecard: data.scorecard ?? undefined,
    final_verdict_summary: data.final_verdict_summary ?? undefined,
    final_verdict_approved: data.final_verdict_approved ?? undefined,
    final_verdict_next_steps: data.final_verdict_next_steps ?? undefined,
    line_explanations: data.line_explanations ?? undefined,
    generated_prompt: data.generated_prompt ?? undefined,

    findings: data.findings ?? undefined,
    execution_overview: data.execution_overview ?? undefined,
    architectural_observations: data.architectural_observations ?? undefined,
    recommended_actions: data.recommended_actions ?? undefined,
    suggested_tests_new: data.suggested_tests_new ?? undefined,
    complexity: data.complexity ?? undefined,
    scorecard_new: data.scorecard_new ?? undefined,
    verdict: data.verdict ?? undefined,
    limitations: data.limitations ?? undefined,
    audit_result: data.audit_result ?? undefined,
    debug_trace: data.debug_trace ?? undefined,
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
          // ادغام داده‌های Advanced به snippet
          snippet = {
            ...snippet,
            // فیلدهای اصلی Advanced
            findings: auditData.findings ?? snippet.findings,
            scorecard_new: auditData.scorecard ?? snippet.scorecard_new,
            verdict: auditData.verdict ?? snippet.verdict,
            execution_overview: auditData.executionOverview ?? snippet.execution_overview,
            architectural_observations: auditData.architecturalObservations ?? snippet.architectural_observations,
            recommended_actions: auditData.recommendedActions ?? snippet.recommended_actions,
            suggested_tests_new: auditData.suggestedTests ?? snippet.suggested_tests_new,
            complexity: auditData.complexity ?? snippet.complexity,
            limitations: auditData.limitations ?? snippet.limitations,
            improved_code: auditData.improvedCode?.code ?? snippet.improved_code,
            linkedin_post: auditData.linkedinPost ?? snippet.linkedin_post,
            summary: auditData.summary ?? snippet.key_concept,
            card_title: auditData.title ?? snippet.card_title,
            key_concept: auditData.summary ?? snippet.key_concept,
            what_this_code_does: auditData.executionOverview?.entryPoints?.join(', ') ?? snippet.what_this_code_does,
          };
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

  // 🔥 استفاده از normalizedAudit برای تشخیص وجود تحلیل کامل
  const fullAnalysisExists = normalizedAudit ? normalizedAudit.hasFullAnalysis : false;

  // 🔥 بررسی وجود Scorecard معتبر (اعداد واقعی) - بدون useMemo
  const hasValidScorecard = (() => {
    const sc = snippet.scorecard_new || snippet.audit_result?.scorecard;
    if (!sc || typeof sc !== 'object') return false;
    return Object.values(sc).some((item: any) => 
      item?.applicable === true && typeof item?.score === 'number' && item.score > 0
    );
  })();

  const debugData = {
    fullAnalysisExists,
    hasValidScorecard,
    findings: snippet.findings,
    scorecard_new: snippet.scorecard_new,
    verdict: snippet.verdict,
    execution_overview: snippet.execution_overview,
    normalizedAudit,
  };

  // 🔥 نرمالایز کردن line_explanations
  const lineExplanations = snippet.line_explanations && Array.isArray(snippet.line_explanations)
    ? (snippet.line_explanations as LineExplanation[])
    : [];

  return (
    <>
      {process.env.NODE_ENV === 'development' && <DebugLogger data={debugData} />}

      <main className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
          
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <SnippetHeader shareUrl={shareUrl} />
            <SnippetJsonDropdown snippet={snippet} />
          </div>

          <SnippetUserInfo
            username={snippet.username || 'Anonymous'}
            githubUsername={snippet.github_username || undefined}
          />

          <SnippetStatusBar snippet={snippet} />
          <SnippetShareButtons slug={snippet.slug} title={snippet.card_title} />
          <SnippetTabLinks shareUrl={shareUrl} />

          <div id="snippet-code">
            <SnippetCode
              code={snippet.raw_code ?? ''}
              language={snippet.language ?? 'text'}
              highlightedHtml={highlightedHtml}
            />
          </div>

          <div id="snippet-analysis">
            <SnippetAnalysis
              keyConcept={snippet.key_concept}
              whatItDoes={snippet.what_this_code_does}
            />
          </div>

          <div id="snippet-debug">
            <SnippetDebug
              debugAnalysis={snippet.debug_analysis}
              optimization={snippet.optimization}
            />
          </div>

          {/* ============================================================
              🔥 SnippetFullAnalysis - فقط در صورت وجود تحلیل کامل نمایش داده شود
              ============================================================ */}
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

          {/* 🔥 خط به خط - با استفاده از lineExplanations نرمالایز شده */}
          {lineExplanations.length > 0 && (
            <div id="snippet-line-by-line">
              <SnippetLineByLine lineExplanations={lineExplanations} />
            </div>
          )}

          {snippet.generated_prompt && (
            <div id="snippet-prompt">
              <SnippetPrompt generatedPrompt={snippet.generated_prompt} />
            </div>
          )}

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