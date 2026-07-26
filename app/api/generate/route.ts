// app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateEducationalContent } from '@/lib/ai';
import { runAdvancedPipeline } from '@/lib/analysis/pipeline';
import {
  MAX_LINES_GENERATE,
  MAX_CODE_LENGTH,
  SUPPORTED_LANGUAGES,
} from '@/lib/constants';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import { MOCK_RESPONSE } from '@/lib/mockData';
import logger from '@/lib/logger';
import { z } from 'zod';
import { AdvancedAuditResultSchema } from '@/lib/analysis/schema';
import { normalizeAnalysisOutput } from '@/lib/analysis/normalizer';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';
import crypto from 'crypto';
import {
  GenerateRequestSchema,
  type GenerateRequest,
  type LegacyGenerateResponse,
  type AnalysisMode,
} from '@/types';

// ============================================================
// 🔥 Cache (In-Memory)
// ============================================================

interface CacheEntry {
  result: LegacyGenerateResponse;
  timestamp: number;
  pipelineTrace?: unknown;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(code: string, language: string, mode: string): string {
  const hash = crypto.createHash('sha256').update(`${code}|${language}|${mode}`).digest('hex');
  return hash;
}

function getCachedResult(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function setCacheResult(key: string, result: LegacyGenerateResponse, pipelineTrace?: unknown): void {
  cache.set(key, {
    result,
    timestamp: Date.now(),
    pipelineTrace,
  });
  if (cache.size > 1000) {
    const keys = Array.from(cache.keys());
    const toDelete = keys.slice(0, cache.size - 1000);
    for (const k of toDelete) {
      cache.delete(k);
    }
  }
}

// ============================================================
// 2. Helpers
// ============================================================

function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  const languageAliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rb: 'ruby',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    kt: 'kotlin',
    swift: 'swift',
    go: 'go',
    rs: 'rust',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    shell: 'bash',
    sql: 'sql',
  };
  return languageAliases[normalized] || normalized;
}

function isSupportedLanguage(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return SUPPORTED_LANGUAGES.includes(normalized as any);
}

function validateResponse(result: unknown): LegacyGenerateResponse {
  const withDefault = {
    ...(result as Record<string, unknown>),
    linkedin_post: (result as Record<string, unknown>)?.linkedin_post || 'Check out this code analysis! #Zbloue',
  };
  return withDefault as LegacyGenerateResponse;
}

/**
 * Maps a canonical AdvancedAuditResult to the legacy response shape,
 * while also preserving all canonical fields for storage and UI.
 */
function mapCanonicalToLegacy(canonical: any): LegacyGenerateResponse {
  return {
    analysis: canonical.summary || '',
    card_title: canonical.title || 'Code Analysis',
    key_concept: canonical.summary?.slice(0, 2000) || '',
    what_this_code_does: canonical.executionOverview?.entryPoints?.join(', ') || '',
    debug_analysis: canonical.findings?.length ? `${canonical.findings.length} findings` : '-',
    optimization: canonical.recommendedActions?.length
      ? canonical.recommendedActions.map((a: any) => a.title).join('; ')
      : '-',
    linkedin_post: canonical.linkedinPost || 'Check out this code analysis! #Zbloue',
    codeWalkthrough: [],
    whatWorksWell: [],
    bugsAndRiskyCases: [],
    edgeCases: [],
    performanceAnalysis: undefined,
    securityAnalysis: undefined,
    productionReadiness: undefined,
    recommendedImprovements: [],
    improvedCode: canonical.improvedCode?.available
      ? {
          available: canonical.improvedCode.available,
          code: canonical.improvedCode.code || '',
          notes: canonical.improvedCode.notes || '',
        }
      : undefined,
    suggestedTests: canonical.suggestedTests || [],
    scorecard: canonical.scorecard || null,
    finalVerdict: canonical.verdict
      ? {
          summary: canonical.verdict.explanation,
          approved: canonical.verdict.status === 'approved' || canonical.verdict.status === 'approved-with-suggestions',
          nextSteps: '',
        }
      : undefined,
    error: undefined,
    findings: canonical.findings || [],
    executionOverview: canonical.executionOverview || null,
    architecturalObservations: canonical.architecturalObservations || [],
    recommendedActions: canonical.recommendedActions || [],
    complexity: canonical.complexity || null,
    verdict: canonical.verdict || null,
    limitations: canonical.limitations || [],
    analysisCoverage: canonical.analysisCoverage || [],
    completionStatus: canonical.completionStatus || 'complete',
    repairApplied: canonical.repairApplied || false,
    appliedSpecializations: canonical.appliedSpecializations || [],
    title: canonical.title || 'Code Analysis',
    summary: canonical.summary || '',
    debug_trace: canonical.debug_trace || undefined,
    audit_result: canonical,
  };
}

// ============================================================
// 3. Main POST handler
// ============================================================

export const POST = withErrorHandlerAndLog(async (req: NextRequest) => {
  const startTime = Date.now();
  const ip = getClientIP(req);

  const rateLimitResult = await rateLimiter(ip);
  if (!rateLimitResult.allowed) {
    logger.warn(`[generate] Rate limit exceeded for IP ${ip}`);
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const validation = GenerateRequestSchema.safeParse(rawBody);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    logger.warn(`[generate] Validation failed for IP ${ip}: ${firstError.path.join('.')} - ${firstError.message}`);
    return NextResponse.json(
      { error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}` },
      { status: 400 }
    );
  }

  const { code, language: rawLanguage, mode } = validation.data;
  const language = normalizeLanguage(rawLanguage);

  if (!isSupportedLanguage(language)) {
    return NextResponse.json(
      {
        error: `Unsupported language: "${rawLanguage}" (normalized: "${language}"). Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const lines = code.split(/\r?\n/).length;
  if (lines > MAX_LINES_GENERATE) {
    return NextResponse.json(
      { error: `Code exceeds ${MAX_LINES_GENERATE} lines (${lines} lines).` },
      { status: 400 }
    );
  }

  const byteLength = Buffer.byteLength(JSON.stringify(rawBody), 'utf8');
  if (byteLength > 100000) {
    return NextResponse.json({ error: 'Payload too large (max 100KB)' }, { status: 413 });
  }

  const cacheKey = getCacheKey(code, language, mode);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    logger.info(`[generate] Cache hit for IP ${ip}, mode ${mode}, key ${cacheKey.slice(0, 8)}...`);
    return NextResponse.json({
      audit_result: cached.result.audit_result,
      language,
      raw_code: code,
    });
  }

  if (process.env.USE_MOCK_RESPONSE === 'true' && mode === 'advanced') {
    logger.info(`[generate] Using mock response for advanced mode (IP ${ip})`);
    const mock = validateResponse(MOCK_RESPONSE);
    setCacheResult(cacheKey, mock);
    return NextResponse.json({
      audit_result: mock.audit_result,
      language,
      raw_code: code,
    });
  }

  let legacyResult: LegacyGenerateResponse;
  let pipelineTrace: unknown = null;

  if (mode === 'advanced') {
    logger.info(`[generate] Running advanced pipeline for IP ${ip}`);
    try {
      const pipelineResult = await runAdvancedPipeline(code, language);
      pipelineTrace = pipelineResult.trace || null;

      if (pipelineResult.result) {
        const validated = AdvancedAuditResultSchema.safeParse(pipelineResult.result);
        if (validated.success) {
          legacyResult = mapCanonicalToLegacy(validated.data);
          if (pipelineResult.trace) {
            (legacyResult as any).debug_trace = pipelineResult.trace;
          }
          logger.info(`[generate] Advanced pipeline succeeded with status: ${pipelineResult.status}`);
        } else {
          logger.warn('[generate] Pipeline output failed schema validation, falling back to legacy');
          const legacyData = await generateEducationalContent(code, language, mode);
          legacyResult = validateResponse(legacyData);
        }
      } else {
        logger.warn(`[generate] Advanced pipeline failed: ${pipelineResult.error}`);
        const legacyData = await generateEducationalContent(code, language, mode);
        legacyResult = validateResponse(legacyData);
      }

      if (pipelineResult.trace) {
        (legacyResult as any).debug_trace = pipelineResult.trace;
      } else if (pipelineResult.error) {
        (legacyResult as any).debug_trace = {
          error: pipelineResult.error,
          status: pipelineResult.status,
        };
      }
    } catch (error) {
      logger.error('[generate] Pipeline error, falling back to legacy:', error);
      const legacyData = await generateEducationalContent(code, language, mode);
      legacyResult = validateResponse(legacyData);
      (legacyResult as any).debug_trace = {
        error: error instanceof Error ? error.message : 'Unknown pipeline error',
        timestamp: new Date().toISOString(),
      };
    }
  } else {
    logger.info(`[generate] Running legacy generation for mode ${mode} (IP ${ip})`);
    const legacyData = await generateEducationalContent(code, language, mode);
    legacyResult = validateResponse(legacyData);
  }

  setCacheResult(cacheKey, legacyResult, pipelineTrace);

  const duration = Date.now() - startTime;
  logger.info(`[generate] Request completed in ${duration}ms for mode ${mode} (IP ${ip})`);

  // 🔥 بازگرداندن فقط audit_result و metadata ساده
  return NextResponse.json({
    audit_result: legacyResult.audit_result,
    language,
    raw_code: code,
  });
});