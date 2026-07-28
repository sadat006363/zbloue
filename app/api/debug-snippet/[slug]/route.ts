// app/api/debug-snippet/[slug]/route.ts

import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  console.log(`🔍 [Debug API] Fetching snippet with slug: "${slug}"`);

  const { data, error } = await supabase
    .from('snippets')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error(`❌ [Debug API] Supabase error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    console.warn(`⚠️ [Debug API] No snippet found for slug: "${slug}"`);
    return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
  }

  console.log(`✅ [Debug API] Snippet found:`, {
    id: data.id,
    slug: data.slug,
    hasAuditResult: !!data.audit_result,
    auditResultType: typeof data.audit_result,
    is_public: data.is_public,
    keys: Object.keys(data),
  });

  // اگر audit_result به‌صورت string است، آن را parse کن
  let auditResult = data.audit_result;
  if (typeof auditResult === 'string') {
    try {
      auditResult = JSON.parse(auditResult);
      console.log(`✅ [Debug API] audit_result parsed successfully`);
    } catch (e) {
      console.error(`❌ [Debug API] Failed to parse audit_result`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      audit_result: auditResult,
      audit_result_type: typeof data.audit_result,
    },
  }, { status: 200 });
}