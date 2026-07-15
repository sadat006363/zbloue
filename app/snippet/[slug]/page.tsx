import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { highlightCode } from '@/lib/shiki';
import { safeString } from '@/lib/utils';
import { Metadata } from 'next';
import {
  SnippetHeader,
  SnippetUserInfo,
  SnippetCode,
  SnippetAnalysis,
  SnippetDebug,
  SnippetLinkedIn,
  SnippetShareButtons,
  SnippetTabLinks,
  SnippetFullAnalysis,
  SnippetFooter,
} from '@/components/snippet';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

// ===== Generate metadata with OG image =====
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const { data: snippet } = await supabaseAdmin
      .from('snippets')
      .select('card_title, key_concept, username')
      .eq('slug', slug)
      .single();

    if (!snippet) {
      return {
        title: 'Snippet Not Found',
      };
    }

    const title = snippet.card_title || 'Shared Code Snippet';
    const description = snippet.key_concept 
      ? snippet.key_concept.substring(0, 150) + '...' 
      : 'View this code snippet and its analysis.';
    const username = snippet.username || 'Developer';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';
    const imageUrl = `${appUrl}/api/og-image?slug=${slug}&title=${encodeURIComponent(title)}&username=${encodeURIComponent(username)}`;

    return {
      title: `${title} | Zbloue`,
      description: description,
      openGraph: {
        title: title,
        description: description,
        type: 'article',
        url: `${appUrl}/snippet/${slug}`,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: 'Snippet | Zbloue',
    };
  }
}

export default async function SnippetPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab || 'explanation';

  try {
    const { data: snippet, error } = await supabaseAdmin
      .from('snippets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !snippet) {
      console.error('Database fetch error or snippet not found:', error);
      notFound();
    }

    let highlightedHtml = '';
    try {
      highlightedHtml = await highlightCode(snippet.raw_code, snippet.language);
    } catch (highlightError) {
      console.error('Highlight error:', highlightError);
      highlightedHtml = `<pre class="text-[#cdd6f4] p-4">${safeString(snippet.raw_code)}</pre>`;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';
    const shareUrl = `${appUrl}/snippet/${slug}`;

    const isFullAnalysis = snippet.debug_analysis !== '-';

    const renderJsonValue = (value: any): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }
      return String(value || 'Not specified');
    };

    const fullText = `${snippet.card_title || 'Code Analysis'} - Analyze your code with AI and share it with the world! #Zbloue #CodeReview #AI #Developer`;

    const shareUrls = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText + ' ' + shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(snippet.card_title || 'Code Analysis')}`
    };

    const hasUserInfo = snippet.username || snippet.github_username;

    return (
      <main className="min-h-screen bg-[#0f0f14] text-[#cdd6f4] p-4 md:p-8 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          <SnippetHeader shareUrl={shareUrl} />

          <div className="bg-[#1e1e2e] rounded-xl p-6 md:p-8 shadow-2xl border border-[#313244] space-y-6">
            
            {/* Title & User Info */}
            <div>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                    {safeString(snippet.card_title || 'Code Analysis')}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#a6adc8] text-xs md:text-sm">
                    <span className="bg-[#313244] px-2.5 py-0.5 rounded-full text-[#cba6f7] font-semibold">
                      {safeString(snippet.language).toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>Published: {new Date(snippet.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}</span>
                  </div>
                </div>

                {hasUserInfo && (
                  <SnippetUserInfo 
                    username={snippet.username} 
                    githubUsername={snippet.github_username} 
                  />
                )}
              </div>
            </div>

            {/* Source Code */}
            <SnippetCode 
              code={snippet.raw_code} 
              language={snippet.language} 
              highlightedHtml={highlightedHtml} 
            />

            {/* Analysis Sections */}
            <SnippetAnalysis 
              keyConcept={snippet.key_concept} 
              whatItDoes={snippet.what_this_code_does} 
            />

            {/* Debug & Optimization */}
            <SnippetDebug 
              debugAnalysis={snippet.debug_analysis} 
              optimization={snippet.optimization} 
            />

            {/* LinkedIn Post */}
            <SnippetLinkedIn linkedinPost={snippet.linkedin_post} />

            {/* Share Buttons */}
            <div className="pt-6 border-t border-[#313244] space-y-3">
              <h3 className="text-lg font-semibold text-[#89b4fa] flex items-center gap-2">
                🌐 Share This Analysis
              </h3>
              <SnippetShareButtons shareUrls={shareUrls} />
            </div>

            {/* Tab Links */}
            <SnippetTabLinks shareUrl={shareUrl} />

            {/* Full Analysis */}
            {isFullAnalysis && (
              <SnippetFullAnalysis snippet={snippet} renderJsonValue={renderJsonValue} />
            )}

            {/* Footer */}
            <SnippetFooter appUrl={appUrl} />
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error loading snippet:', error);
    notFound();
  }
}