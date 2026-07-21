// ============================================================
// 📁 فایل: app/snippet/[slug]/page.tsx
// ============================================================

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

// ============================================================
// 🔥 params باید از نوع Promise باشد (Next.js 16)
// ============================================================
interface PageProps {
  params: Promise<{ slug: string }>;
}

// ============================================================
// 🔧 Helpers: Escape HTML (امنیت در برابر XSS)
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
// 🔧 Helpers: بررسی وجود محتوا در آرایه‌ها و رشته‌ها
// ============================================================
function hasItems<T>(value: readonly T[] | null | undefined): boolean {
  const result = Array.isArray(value) && value.length > 0;
  console.log(`[hasItems] value:`, value, `→ result: ${result}`);
  return result;
}

function hasText(value: string | null | undefined): boolean {
  const result = typeof value === 'string' && value.trim().length > 0;
  console.log(`[hasText] value:`, value, `→ result: ${result}`);
  return result;
}

function hasExecutionOverview(value: Snippet['execution_overview']): boolean {
  if (!value) {
    console.log('[hasExecutionOverview] value is null/undefined → false');
    return false;
  }
  const result =
    hasItems(value.entryPoints) ||
    hasItems(value.taskSubmissionPoints) ||
    hasItems(value.blockingWaitPoints) ||
    hasItems(value.sharedResources) ||
    hasItems(value.resourceLifecycle);
  console.log('[hasExecutionOverview] result:', result);
  return result;
}

// ============================================================
// 🔥 تابع دریافت اسنیپت با null-safe، اعتبارسنجی Zod و امنیت
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

    username: data.username ?? null,
    github_username: data.github_username ?? null,
    avatar_url: data.avatar_url ?? null,
    card_image_url: data.card_image_url ?? null,

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
    line_explanations: data.line_explanations ?? null,
    generated_prompt: data.generated_prompt ?? null,

    findings: data.findings ?? undefined,
    execution_overview: data.execution_overview ?? undefined,
    architectural_observations: data.architectural_observations ?? undefined,
    recommended_actions: data.recommended_actions ?? undefined,
    suggested_tests_new: data.suggested_tests_new ?? undefined,
    complexity: data.complexity ?? undefined,
    scorecard_new: data.scorecard_new ?? undefined,
    verdict: data.verdict ?? undefined,
    limitations: data.limitations ?? undefined,
  };

  console.log('🔍 [getSnippet] candidate findings:', candidate.findings);
  console.log('🔍 [getSnippet] candidate scorecard_new:', candidate.scorecard_new);
  console.log('🔍 [getSnippet] candidate verdict:', candidate.verdict);
  console.log('🔍 [getSnippet] candidate execution_overview:', candidate.execution_overview);

  const validation = SnippetDataSchema.safeParse(candidate);

  if (!validation.success) {
    console.error(
      `[SnippetPage] Invalid data for slug "${normalizedSlug}":`,
      validation.error.flatten()
    );
    throw new Error('Snippet data is invalid');
  }

  console.log('🔍 [getSnippet] validation.data:', validation.data);
  return validation.data;
}

// ============================================================
// 🔥 تابع کمکی برای هایلایت کد (امن در برابر XSS)
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
// 🔥 تابع بررسی وجود Full Report (با در نظر گرفتن آرایه‌های خالی)
// ============================================================
function hasFullAnalysis(snippet: Snippet): boolean {
  console.log('🔍 [hasFullAnalysis] START ==========================');
  console.log('🔍 [hasFullAnalysis] snippet.findings:', snippet.findings);
  console.log('🔍 [hasFullAnalysis] snippet.scorecard_new:', snippet.scorecard_new);
  console.log('🔍 [hasFullAnalysis] snippet.verdict:', snippet.verdict);
  console.log('🔍 [hasFullAnalysis] snippet.execution_overview:', snippet.execution_overview);

  const result =
    hasItems(snippet.code_walkthrough) ||
    hasItems(snippet.what_works_well) ||
    hasItems(snippet.bugs_and_risky_cases) ||
    hasItems(snippet.edge_cases) ||
    snippet.performance_analysis != null ||
    snippet.security_analysis != null ||
    snippet.production_readiness != null ||
    hasItems(snippet.recommended_improvements) ||
    hasText(snippet.improved_code) ||
    hasItems(snippet.suggested_tests) ||
    snippet.scorecard != null ||
    hasText(snippet.final_verdict_summary) ||
    hasItems(snippet.findings) ||
    hasExecutionOverview(snippet.execution_overview) ||
    hasItems(snippet.architectural_observations) ||
    hasItems(snippet.recommended_actions) ||
    hasItems(snippet.suggested_tests_new) ||
    snippet.complexity != null ||
    snippet.scorecard_new != null ||
    snippet.verdict != null ||
    hasItems(snippet.limitations);

  console.log('🔍 [hasFullAnalysis] FINAL RESULT:', result);
  console.log('🔍 [hasFullAnalysis] END ==========================');
  return result;
}

// ============================================================
// 🏠 صفحه اصلی
// ============================================================
export default async function SnippetPage({ params }: PageProps) {
  const { slug } = await params;

  let snippet: Snippet | null = null;
  let error: Error | null = null;

  try {
    snippet = await getSnippet(slug);
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
  const fullAnalysisExists = hasFullAnalysis(snippet);

  console.log('🔍 [SnippetPage] fullAnalysisExists:', fullAnalysisExists);
  console.log('🔍 [SnippetPage] snippet.findings:', snippet.findings);
  console.log('🔍 [SnippetPage] snippet.scorecard_new:', snippet.scorecard_new);
  console.log('🔍 [SnippetPage] snippet.verdict:', snippet.verdict);

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <SnippetHeader shareUrl={shareUrl} />
        <SnippetUserInfo
          username={snippet.username || 'Anonymous'}
          githubUsername={snippet.github_username || undefined}
        />
        <SnippetShareButtons slug={snippet.slug} title={snippet.card_title} />
        <SnippetTabLinks shareUrl={shareUrl} />
        <SnippetCode
          code={snippet.raw_code}
          language={snippet.language}
          highlightedHtml={highlightedHtml}
        />
        <SnippetAnalysis
          keyConcept={snippet.key_concept}
          whatItDoes={snippet.what_this_code_does}
        />
        <SnippetDebug
          debugAnalysis={snippet.debug_analysis}
          optimization={snippet.optimization}
        />

        {fullAnalysisExists ? (
          <SnippetFullAnalysis snippet={snippet} />
        ) : (
          <div className="mt-8 pt-6 border-t border-[#313244]">
            <div className="bg-[#11111b] p-6 rounded-lg border border-[#313244] text-center">
              <p className="text-[#a6adc8] text-sm">
                📊 Full report has not been generated for this snippet yet.
              </p>
              <p className="text-[#6c7086] text-xs mt-2">
                Generate a full analysis to see detailed insights including code walkthrough,
                performance analysis, security review, and more.
              </p>
            </div>
          </div>
        )}

        {snippet.line_explanations && snippet.line_explanations.length > 0 && (
          <SnippetLineByLine lineExplanations={snippet.line_explanations} />
        )}

        {snippet.generated_prompt && (
          <SnippetPrompt generatedPrompt={snippet.generated_prompt} />
        )}

        {snippet.linkedin_post && (
          <SnippetLinkedIn linkedinPost={snippet.linkedin_post} />
        )}

        <SnippetFooter appUrl={baseUrl || 'https://zbloue.vercel.app'} />
      </div>
    </main>
  );
}