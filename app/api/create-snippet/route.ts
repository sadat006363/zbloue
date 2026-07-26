// app/api/create-snippet/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';
import { toSnippetInsert, isValidSnippetContext } from '@/lib/analysis/to-snippet';
import { AdvancedAuditResultSchema } from '@/lib/analysis/schema';

// ============================================================
// 1. Zod schemas (با catchall برای پذیرش فیلدهای اضافی)
// ============================================================

const CreateSnippetRequestSchema = z
  .object({
    code: z.string().min(1).max(100000),
    language: z.string().min(1).max(50),
    username: z.string().min(1).max(100).nullable().optional(),
    github_username: z.string().min(1).max(100).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    audit_result: z.any().optional().nullable(),
  })
  .catchall(z.any());

type CreateSnippetRequest = z.infer<typeof CreateSnippetRequestSchema>;

// ============================================================
// 2. Slug generator
// ============================================================

const SLUG_LENGTH = 10;
const MAX_SLUG_RETRIES = 3;

function generateSlug(): string {
  return randomBytes(SLUG_LENGTH)
    .toString('base64url')
    .slice(0, SLUG_LENGTH);
}

async function generateUniqueSlug(retries = MAX_SLUG_RETRIES): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const slug = generateSlug();
    const { data, error } = await supabase
      .from('snippets')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      logger.error('[create-snippet] Slug uniqueness check error:', error);
      throw new Error('Failed to check slug uniqueness');
    }
    if (!data) return slug;
    logger.warn(`[create-snippet] Slug collision: ${slug}, retrying...`);
  }
  throw new Error('Failed to generate unique slug after multiple retries');
}

// ============================================================
// 🔥 تابع Fallback (برای داده‌های قدیمی بدون audit_result)
// ============================================================

function buildFallbackRow(body: any, context: any): any {
  const now = new Date().toISOString();
  return {
    slug: context.slug,
    raw_code: context.rawCode,
    language: context.sourceLanguage,
    username: context.username ?? null,
    github_username: context.githubUsername ?? null,
    avatar_url: context.avatarUrl ?? null,
    is_public: true,
    created_at: now,
    audit_result: null,
    card_title: null,
    key_concept: null,
    what_this_code_does: null,
    debug_analysis: null,
    optimization: null,
    linkedin_post: null,
    code_walkthrough: null,
    what_works_well: null,
    bugs_and_risky_cases: null,
    edge_cases: null,
    performance_analysis: null,
    security_analysis: null,
    production_readiness: null,
    recommended_improvements: null,
    improved_code: null,
    suggested_tests: null,
    scorecard: null,
    final_verdict_summary: null,
    final_verdict_approved: null,
    final_verdict_next_steps: null,
    findings: null,
    execution_overview: null,
    architectural_observations: null,
    recommended_actions: null,
    suggested_tests_new: null,
    complexity: null,
    scorecard_new: null,
    verdict: null,
    limitations: null,
    debug_trace: null,
  };
}

// ============================================================
// 3. POST Handler
// ============================================================

export const POST = withErrorHandlerAndLog(async (req: NextRequest) => {
  const ip = getClientIP(req);

  // ===== Rate Limiter =====
  const rateLimitResult = await rateLimiter(ip);
  if (!rateLimitResult.allowed) {
    logger.warn(`[create-snippet] Rate limit exceeded for IP ${ip}`);
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    );
  }

  // ===== Parse Request =====
  let rawBody: unknown;
  try {
    rawBody = await req.json();
    logger.info('[create-snippet] Received body (first 500 chars):', JSON.stringify(rawBody).slice(0, 500));
  } catch (error) {
    logger.error('[create-snippet] Failed to parse JSON:', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // ===== Validation =====
  const validation = CreateSnippetRequestSchema.safeParse(rawBody);
  if (!validation.success) {
    logger.error('[create-snippet] Validation failed:', validation.error.issues);
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}` },
      { status: 400 }
    );
  }

  const body = validation.data;

  // ===== Generate Slug =====
  let slug: string;
  try {
    slug = await generateUniqueSlug();
    logger.info(`[Server] Generated slug: ${slug}`);
  } catch (error) {
    logger.error('[create-snippet] Slug generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate unique identifier' }, { status: 500 });
  }

  // ===== ساخت Context =====
  const context = {
    rawCode: body.code,
    sourceLanguage: body.language,
    slug,
    username: body.username ?? null,
    githubUsername: body.github_username ?? null,
    avatarUrl: body.avatar_url ?? null,
    isPublic: true,
  };

  // اعتبارسنجی Context
  try {
    isValidSnippetContext(context);
    logger.info('[Server] Context validation passed');
  } catch (error) {
    logger.error('[create-snippet] Invalid context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid snippet context' },
      { status: 400 }
    );
  }

  // ============================================================
  // 🔥 ساخت Row با استفاده از Mapper
  // ============================================================

  let row: any;
  try {
    if (body.audit_result) {
      // 🔥 اعتبارسنجی audit_result
      const validated = AdvancedAuditResultSchema.safeParse(body.audit_result);
      if (!validated.success) {
        logger.error('[create-snippet] Invalid audit_result:', validated.error.issues);
        return NextResponse.json(
          { error: 'Invalid audit result structure' },
          { status: 400 }
        );
      }
      // 🔥 استفاده از toSnippetInsert
      row = toSnippetInsert(validated.data, context);
      logger.info('[Server] ✅ Mapper used with audit_result');
    } else {
      // Fallback: اگر audit_result وجود نداشت
      logger.warn('[create-snippet] No audit_result provided, using fallback');
      row = buildFallbackRow(body, context);
      logger.info('[Server] ✅ Fallback row created');
    }
  } catch (error) {
    logger.error('[create-snippet] Mapper failed:', error);
    return NextResponse.json(
      { error: 'Failed to map data for storage' },
      { status: 500 }
    );
  }

  // ============================================================
  // 5. Insert into Supabase
  // ============================================================

  logger.info('[Server] Attempting to insert into Supabase...');
  const { data, error } = await supabase
    .from('snippets')
    .insert(row as any)
    .select('id, slug, username, github_username, avatar_url')
    .single();

  if (error) {
    logger.error('[create-snippet] ❌ Supabase insert error:', error);
    logger.error('[create-snippet] Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return NextResponse.json({ error: 'Failed to save snippet' }, { status: 500 });
  }

  if (!data) {
    logger.error('[create-snippet] ❌ Insert succeeded but returned no data');
    return NextResponse.json({ error: 'Snippet was not returned after creation' }, { status: 500 });
  }

  // ===== Response =====
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  logger.info(`[create-snippet] ✅ Snippet created: ${data.slug} (IP ${ip})`);

  return NextResponse.json(
    {
      success: true,
      id: data.id,
      slug: data.slug,
      url: `${baseUrl}/snippet/${data.slug}`,
      username: data.username ?? null,
      github_username: data.github_username ?? null,
      avatar_url: data.avatar_url ?? null,
    },
    { status: 201 }
  );
});