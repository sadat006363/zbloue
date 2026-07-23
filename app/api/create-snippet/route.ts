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
    card_title: z.string().min(1).max(200).optional(),
    key_concept: z.string().max(2000).optional(),
    what_this_code_does: z.string().max(10000).optional(),
    debug_analysis: z.string().max(5000).optional(),
    optimization: z.string().max(5000).optional(),
    linkedin_post: z.string().max(300).optional(),
    username: z.string().min(1).max(100).nullable().optional(),
    github_username: z.string().min(1).max(100).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),

    // ===== فیلدهای Legacy =====
    code_walkthrough: z.any().optional().nullable(),
    what_works_well: z.any().optional().nullable(),
    bugs_and_risky_cases: z.any().optional().nullable(),
    edge_cases: z.any().optional().nullable(),
    performance_analysis: z.any().optional().nullable(),
    security_analysis: z.any().optional().nullable(),
    production_readiness: z.any().optional().nullable(),
    recommended_improvements: z.any().optional().nullable(),
    improved_code: z.string().optional().nullable(),
    suggested_tests: z.any().optional().nullable(),
    scorecard: z.any().optional().nullable(),
    final_verdict_summary: z.string().optional().nullable(),
    final_verdict_approved: z.boolean().optional().nullable(),
    final_verdict_next_steps: z.string().optional().nullable(),

    // ===== فیلدهای Advanced (JSONB) =====
    findings: z.any().optional().nullable(),
    execution_overview: z.any().optional().nullable(),
    architectural_observations: z.any().optional().nullable(),
    recommended_actions: z.any().optional().nullable(),
    suggested_tests_new: z.any().optional().nullable(),
    complexity: z.any().optional().nullable(),
    scorecard_new: z.any().optional().nullable(),
    verdict: z.any().optional().nullable(),
    limitations: z.array(z.string().max(300)).max(20).optional().nullable(),

    // ===== فیلدهای Debug =====
    debug_trace: z.any().optional().nullable(),
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
// 3. POST Handler (با استفاده از Mapper جدید)
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
    console.log('🔍 [create-snippet] Received body:', JSON.stringify(rawBody, null, 2));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // ===== Validation =====
  const validation = CreateSnippetRequestSchema.safeParse(rawBody);
  if (!validation.success) {
    console.error('❌ [create-snippet] Validation failed:', validation.error.issues);
    logger.warn('[create-snippet] Validation failed:', validation.error.issues);
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
  } catch (error) {
    logger.error('[create-snippet] Slug generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate unique identifier' }, { status: 500 });
  }

  // ============================================================
  // 🔥 استفاده از Mapper جدید (toSnippetInsert)
  // ============================================================

  // 1. ساخت Context برای Mapper
  const context = {
    rawCode: body.code,
    sourceLanguage: body.language,
    slug,
    username: body.username ?? null,
    githubUsername: body.github_username ?? null,
    avatarUrl: body.avatar_url ?? null,
    isPublic: true,
  };

  // 2. اعتبارسنجی Context
  try {
    isValidSnippetContext(context);
  } catch (error) {
    logger.error('[create-snippet] Invalid context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid snippet context' },
      { status: 400 }
    );
  }

  // 3. ساخت Audit Result از داده‌های ورودی (در صورت وجود)
  // برای سازگاری با Mapper، اگر فیلدهای Advanced وجود دارند، یک Audit Result می‌سازیم
  let auditResult: any = null;
  if (body.findings || body.scorecard_new || body.verdict) {
    try {
      // ساخت یک شیء شبیه به AdvancedAuditResult از داده‌های ورودی
      auditResult = {
        schemaVersion: '1.0',
        auditType: body.execution_overview ? 'concurrency' : 'generic',
        status: 'complete',
        language: body.language,
        summary: body.key_concept || '',
        executionOverview: body.execution_overview || { entryPoints: [], taskSubmissionPoints: [], blockingWaitPoints: [], sharedResources: [], resourceLifecycle: [] },
        findings: body.findings || [],
        architecturalObservations: body.architectural_observations || [],
        recommendedActions: body.recommended_actions || [],
        suggestedTests: body.suggested_tests_new || [],
        complexity: body.complexity || { time: 'unknown', space: 'unknown', resourceGrowth: 'unknown', assumptions: [] },
        scorecard: body.scorecard_new || {
          correctness: { score: 0, reason: '', relatedFindings: [] },
          concurrencySafety: { score: 0, reason: '', relatedFindings: [] },
          liveness: { score: 0, reason: '', relatedFindings: [] },
          errorHandling: { score: 0, reason: '', relatedFindings: [] },
          resourceManagement: { score: 0, reason: '', relatedFindings: [] },
          maintainability: { score: 0, reason: '', relatedFindings: [] },
          productionReadiness: { score: 0, reason: '', relatedFindings: [] },
        },
        verdict: body.verdict || { status: 'requires-changes', explanation: '' },
        limitations: body.limitations || [],
        improvedCode: {
          available: !!body.improved_code,
          code: body.improved_code || null,
          notes: body.improved_code ? 'Migrated from improved_code' : 'No improved code provided',
        },
        linkedin_post: body.linkedin_post || 'Check out this code analysis! #Zbloue',
      };

      // اعتبارسنجی Audit Result با Schema اصلی
      const validated = AdvancedAuditResultSchema.safeParse(auditResult);
      if (!validated.success) {
        logger.warn('[create-snippet] Audit result validation failed, using fallback:', validated.error.issues);
        auditResult = null;
      } else {
        auditResult = validated.data;
      }
    } catch (error) {
      logger.warn('[create-snippet] Failed to build audit result:', error);
      auditResult = null;
    }
  }

  // 4. استفاده از Mapper
  let row: any;
  try {
    if (auditResult) {
      // اگر Audit Result موجود است، از Mapper استفاده کن
      row = toSnippetInsert(auditResult, context);
    } else {
      // Fallback: استفاده از داده‌های Legacy
      const now = new Date().toISOString();
      row = {
        slug,
        raw_code: body.code,
        language: body.language,
        card_title: body.card_title ?? 'Code Analysis',
        key_concept: body.key_concept ?? '',
        what_this_code_does: body.what_this_code_does ?? '',
        debug_analysis: body.debug_analysis ?? '-',
        optimization: body.optimization ?? '-',
        linkedin_post: body.linkedin_post ?? '',
        username: body.username ?? null,
        github_username: body.github_username ?? null,
        avatar_url: body.avatar_url ?? null,
        is_public: true,
        created_at: now,

        // Legacy fields
        code_walkthrough: body.code_walkthrough ?? null,
        what_works_well: body.what_works_well ?? null,
        bugs_and_risky_cases: body.bugs_and_risky_cases ?? null,
        edge_cases: body.edge_cases ?? null,
        performance_analysis: body.performance_analysis ?? null,
        security_analysis: body.security_analysis ?? null,
        production_readiness: body.production_readiness ?? null,
        recommended_improvements: body.recommended_improvements ?? null,
        improved_code: body.improved_code ?? null,
        suggested_tests: body.suggested_tests ?? null,
        scorecard: body.scorecard ?? null,
        final_verdict_summary: body.final_verdict_summary ?? null,
        final_verdict_approved: body.final_verdict_approved ?? null,
        final_verdict_next_steps: body.final_verdict_next_steps ?? null,

        // Advanced fields
        findings: body.findings ?? null,
        execution_overview: body.execution_overview ?? null,
        architectural_observations: body.architectural_observations ?? null,
        recommended_actions: body.recommended_actions ?? null,
        suggested_tests_new: body.suggested_tests_new ?? null,
        complexity: body.complexity ?? null,
        scorecard_new: body.scorecard_new ?? null,
        verdict: body.verdict ?? null,
        limitations: body.limitations ?? null,
        debug_trace: body.debug_trace ?? null,
      };
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

  const { data, error } = await supabase
    .from('snippets')
    .insert(row as any)
    .select('id, slug, card_title, username, github_username, avatar_url')
    .single();

  if (error) {
    logger.error('[create-snippet] Supabase insert error:', error);
    return NextResponse.json({ error: 'Failed to save snippet' }, { status: 500 });
  }

  if (!data) {
    logger.error('[create-snippet] Insert succeeded but returned no data');
    return NextResponse.json({ error: 'Snippet was not returned after creation' }, { status: 500 });
  }

  // ===== Response =====
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  logger.info(`[create-snippet] Snippet created: ${data.slug} (IP ${ip})`);

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