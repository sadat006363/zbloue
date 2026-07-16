import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { highlightCode } from '@/lib/shiki';
import { safeString } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';

// ============================================================
// 🔥 جلوگیری از Static Generation در زمان build
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================
// 🔥 Supabase Client با fallback (برای build بدون خطا)
// ============================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// 🔥 Interface برای Props
// ============================================================
interface PageProps {
  params: Promise<{ slug: string }>;
}

// ============================================================
// 🔥 متادیتا (با fallback برای خطا)
// ============================================================
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

// ============================================================
// 🔥 صفحه اصلی کارت
// ============================================================
export default async function CardPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    // ===== 1. دریافت داده از Supabase =====
    const { data: snippet, error } = await supabaseAdmin
      .from('snippets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !snippet) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Card fetch error:', error);
      }
      notFound();
    }

    // ===== 2. هایلایت کد =====
    let highlightedHtml = '';
    try {
      highlightedHtml = await highlightCode(snippet.raw_code, snippet.language);
    } catch (highlightError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Highlight error:', highlightError);
      }
      highlightedHtml = `<pre class="text-[#cdd6f4] p-4">${safeString(snippet.raw_code)}</pre>`;
    }

    // ===== 3. تاریخ =====
    const formattedDate = new Date(snippet.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // ===== 4. لینک اشتراک‌گذاری =====
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';
    const shareUrl = `${appUrl}/snippet/${slug}`;

    // ============================================================
    // 🔥 رندر UI
    // ============================================================
    return (
      <div className="min-h-screen bg-[#0f0f14] text-[#cdd6f4] p-4 md:p-8 flex flex-col items-center">
        <div className="max-w-3xl w-full bg-[#1e1e2e] rounded-xl p-6 md:p-8 shadow-2xl border border-[#313244] space-y-6">

          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between">
            <Link
              href={`/snippet/${slug}`}
              className="text-[#89b4fa] hover:text-[#b4befe] transition-colors text-sm font-medium"
            >
              ← Back to Analysis
            </Link>
            <div className="text-xs text-[#6c7086]">📋 Card Preview</div>
          </div>

          {/* ===== TITLE & INFO ===== */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              {safeString(snippet.card_title || 'Code Analysis')}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#a6adc8] text-xs md:text-sm">
              <span className="bg-[#313244] px-2.5 py-0.5 rounded-full text-[#cba6f7] font-semibold">
                {safeString(snippet.language).toUpperCase()}
              </span>
              <span>•</span>
              <span>Published: {formattedDate}</span>
              {snippet.username && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>👤</span>
                    {safeString(snippet.username)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ===== KEY CONCEPT ===== */}
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa] flex items-center gap-2">
              💡 Key Concept
            </h3>
            <p className="text-[#a6adc8] text-sm leading-relaxed mt-1 whitespace-pre-wrap">
              {safeString(snippet.key_concept || 'No key concept provided.')}
            </p>
          </div>

          {/* ===== SOURCE CODE ===== */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[#89b4fa]">💻 Source Code</span>
            </div>
            <div className="bg-[#11111b] rounded-lg overflow-x-auto max-h-[400px] border border-[#313244] font-mono text-sm leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} className="p-4" />
            </div>
          </div>

          {/* ===== SUMMARY ===== */}
          {snippet.what_this_code_does && snippet.what_this_code_does !== '-' && (
            <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
              <h3 className="text-lg font-semibold text-[#89b4fa] flex items-center gap-2">
                📝 What This Code Does
              </h3>
              <p className="text-[#a6adc8] text-sm leading-relaxed mt-1 whitespace-pre-wrap">
                {safeString(snippet.what_this_code_does)}
              </p>
            </div>
          )}

          {/* ===== SHARE BUTTONS ===== */}
          <div className="pt-4 border-t border-[#313244]">
            <h3 className="text-sm font-semibold text-[#a6adc8] mb-2">🌐 Share This Card</h3>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 rounded-md text-sm transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this code analysis: ${snippet.card_title}`)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1DA1F2] hover:bg-[#0d8bdb] text-white px-4 py-2 rounded-md text-sm transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this code analysis: ${snippet.card_title} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1da851] text-white px-4 py-2 rounded-md text-sm transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(snippet.card_title || 'Code Analysis')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0088cc] hover:bg-[#006699] text-white px-4 py-2 rounded-md text-sm transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
              </a>
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div className="pt-4 border-t border-[#313244] text-center text-xs text-[#6c7086]">
            <p>✨ Built with <a href={appUrl} target="_blank" rel="noopener noreferrer" className="text-[#89b4fa] hover:underline">Zbloue</a></p>
            <p className="mt-1">Share your code. Get insights. Grow your network.</p>
          </div>

        </div>
      </div>
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading card:', error);
    }
    notFound();
  }
}