// app/snippet/[slug]/card/page.tsx

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import CardPreview from '@/components/card/CardPreview';
import { CardTheme } from '@/components/card/themes';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ theme?: CardTheme }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: snippet } = await supabaseAdmin
      .from('snippets')
      .select('card_title')
      .eq('slug', slug)
      .single();

    return {
      title: snippet?.card_title ? `${snippet.card_title} | Zbloue` : 'Code Snippet | Zbloue',
    };
  } catch {
    return { title: 'Code Snippet | Zbloue' };
  }
}

export default async function CardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const theme = (await searchParams)?.theme || 'blue';

  try {
    const { data: snippet, error } = await supabaseAdmin
      .from('snippets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !snippet) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-4">
        <div className="w-full max-w-[1200px]">
          <CardPreview
            title={snippet.card_title || 'Code Analysis'}
            summary={snippet.key_concept || 'Analysis of the provided code snippet.'}
            username={snippet.username || 'Developer'}
            slug={snippet.slug}
            language={snippet.language}
            theme={theme}
            showCode={true}
            codeSnippet={snippet.raw_code}
            createdAt={snippet.created_at}
            githubUsername={snippet.github_username || undefined}
            avatarUrl={snippet.avatar_url || null}
          />
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}