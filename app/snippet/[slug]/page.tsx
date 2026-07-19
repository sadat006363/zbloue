import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Snippet,
  GenerateResponse,
  CodeWalkthroughItem,
  BugAndRiskyCase,
  EdgeCase,
  PerformanceAnalysis,
  SecurityAnalysis,
  ProductionReadiness,
  RecommendedImprovement,
  SuggestedTest,
  ScorecardLegacy,
  LineExplanation,
} from '@/types';
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

interface PageProps {
  params: {
    slug: string;
  };
}

async function getSnippet(slug: string): Promise<Snippet | null> {
  const { data, error } = await supabase
    .from('snippets')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Snippet;
}

export default async function SnippetPage({ params }: PageProps) {
  const snippet = await getSnippet(params.slug);

  if (!snippet) {
    notFound();
  }

  const codeWalkthrough = snippet.code_walkthrough as CodeWalkthroughItem[] | null;
  const whatWorksWell = snippet.what_works_well as string[] | null;
  const bugsAndRiskyCases = snippet.bugs_and_risky_cases as BugAndRiskyCase[] | null;
  const edgeCases = snippet.edge_cases as EdgeCase[] | null;
  const performanceAnalysis = snippet.performance_analysis as PerformanceAnalysis | null;
  const securityAnalysis = snippet.security_analysis as SecurityAnalysis | null;
  const productionReadiness = snippet.production_readiness as ProductionReadiness | null;
  const recommendedImprovements = snippet.recommended_improvements as RecommendedImprovement[] | null;
  const suggestedTests = snippet.suggested_tests as SuggestedTest[] | null;
  const scorecard = snippet.scorecard as ScorecardLegacy | null;
  const lineExplanations = snippet.line_explanations as LineExplanation[] | null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const shareUrl = `${appUrl}/snippet/${snippet.slug}`;

  const fullAnalysis: GenerateResponse = {
    title: snippet.card_title,
    highLevelSummary: snippet.key_concept,
    codeWalkthrough: codeWalkthrough || undefined,
    whatWorksWell: whatWorksWell || undefined,
    bugsAndRiskyCases: bugsAndRiskyCases || undefined,
    edgeCases: edgeCases || undefined,
    performanceAnalysis: performanceAnalysis || undefined,
    securityAnalysis: securityAnalysis || undefined,
    productionReadiness: productionReadiness || undefined,
    recommendedImprovements: recommendedImprovements || undefined,
    suggestedTestsLegacy: suggestedTests || undefined,
    scorecardLegacy: scorecard || undefined,
    finalVerdict: {
      summary: snippet.final_verdict_summary || '',
      approved: snippet.final_verdict_approved || false,
      nextSteps: snippet.final_verdict_next_steps || '',
    },
    linkedin_post: snippet.linkedin_post,
  };

  const hasFullAnalysis =
    fullAnalysis.codeWalkthrough ||
    fullAnalysis.whatWorksWell ||
    fullAnalysis.bugsAndRiskyCases ||
    fullAnalysis.edgeCases ||
    fullAnalysis.performanceAnalysis ||
    fullAnalysis.securityAnalysis ||
    fullAnalysis.productionReadiness ||
    fullAnalysis.recommendedImprovements ||
    fullAnalysis.suggestedTestsLegacy ||
    fullAnalysis.scorecardLegacy;

  const hasDebugAnalysis = snippet.debug_analysis && snippet.debug_analysis !== '-';
  const hasOptimization = snippet.optimization && snippet.optimization !== '-';

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <SnippetHeader shareUrl={shareUrl} />

        <SnippetUserInfo
          username={snippet.username}
          githubUsername={snippet.github_username}
        />

        <SnippetShareButtons slug={snippet.slug} title={snippet.card_title} />

        <SnippetTabLinks
          hasCode={!!snippet.raw_code}
          hasAnalysis={!!hasFullAnalysis}
          hasDebug={!!hasDebugAnalysis}
          hasLinkedIn={!!snippet.linkedin_post}
        />

        <SnippetCode
          code={snippet.raw_code}
          language={snippet.language}
          lineExplanations={lineExplanations || undefined}
        />

        {hasFullAnalysis && (
          <SnippetFullAnalysis
            analysis={fullAnalysis}
            codeWalkthrough={codeWalkthrough}
            whatWorksWell={whatWorksWell}
            bugsAndRiskyCases={bugsAndRiskyCases}
            edgeCases={edgeCases}
            performanceAnalysis={performanceAnalysis}
            securityAnalysis={securityAnalysis}
            productionReadiness={productionReadiness}
            recommendedImprovements={recommendedImprovements}
            suggestedTests={suggestedTests}
            scorecard={scorecard}
          />
        )}

        {snippet.what_this_code_does && snippet.what_this_code_does !== 'No analysis generated.' && (
          <SnippetAnalysis analysis={snippet.what_this_code_does} />
        )}

        {hasDebugAnalysis && <SnippetDebug debugAnalysis={snippet.debug_analysis} />}

        {hasOptimization && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Optimization</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{snippet.optimization}</p>
          </div>
        )}

        {snippet.linkedin_post && (
          <SnippetLinkedIn linkedinPost={snippet.linkedin_post} />
        )}

        <SnippetFooter createdAt={snippet.created_at} />
      </div>
    </main>
  );
}
