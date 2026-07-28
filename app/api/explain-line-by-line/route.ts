// app/api/explain-line-by-line/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_EXPLAIN, MAX_CODE_LENGTH } from '@/lib/constants';
import { removeComments } from '@/lib/utils';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';
import { cache, getCacheKey } from '@/lib/cache';
import { callOpenAI } from '@/lib/openaiClient';
import { AnalysisModeSchema } from '@/types';

const openaiApiKey = process.env.OPENAI_API_KEY || 'placeholder-key';
const openai = new OpenAI({ apiKey: openaiApiKey });

export const POST = withErrorHandlerAndLog(async (req: NextRequest) => {
  const ip = getClientIP(req);

  // ===== Rate Limiter =====
  const rateLimitResult = await rateLimiter(ip);
  if (!rateLimitResult.allowed) {
    logger.warn(`[explain-line-by-line] Rate limit exceeded for IP ${ip}`);
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    );
  }

  const { code, language, mode = 'simple' } = await req.json();

  if (!code || !language) {
    return NextResponse.json(
      { error: 'Code and language are required' },
      { status: 400 }
    );
  }

  // 🔥 اعتبارسنجی mode
  const modeValidation = AnalysisModeSchema.safeParse(mode);
  if (!modeValidation.success) {
    return NextResponse.json(
      { error: 'Invalid mode. Must be simple, medium, or advanced.' },
      { status: 400 }
    );
  }
  const validMode = modeValidation.data;

  const codeWithoutComments = removeComments(code, language);

  const lines = codeWithoutComments.split('\n').filter((line: string) => line.trim().length > 0);
  if (lines.length > MAX_LINES_EXPLAIN) {
    return NextResponse.json(
      { error: `Code exceeds ${MAX_LINES_EXPLAIN} lines (${lines.length} lines). Please shorten your code.` },
      { status: 400 }
    );
  }

  if (codeWithoutComments.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { error: `Code is too long (${codeWithoutComments.length} characters).` },
      { status: 400 }
    );
  }

  // ============================================================
  // 🔥 بررسی کش
  // ============================================================
  const cacheKey = getCacheKey(codeWithoutComments, language, `explain-${validMode}`);
  const cachedResult = await cache.get<{ explanations: any[] }>(cacheKey);

  if (cachedResult) {
    logger.info(`[explain-line-by-line] Cache hit for IP ${ip}`);
    return NextResponse.json(cachedResult);
  }

  // ============================================================
  // 🔥 تولید توضیحات با استفاده از callOpenAI و mode کاربر
  // ============================================================

  const systemPrompt = `
You are an expert programming tutor. Explain the provided code line by line.

**IMPORTANT RULES:**
1. Provide a concise explanation for each line (max 1-2 sentences per line).
2. Focus on WHAT the line does and WHY it's important.
3. Use simple, easy-to-understand language.
4. For long code, prioritize important lines and group similar ones.
5. Output MUST be in valid JSON format.

**Output Format:**
{
  "explanations": [
    {
      "lineNumber": 1,
      "code": "const x = 5;",
      "explanation": "Declares a constant variable x and assigns it the value 5."
    }
  ]
}
`;

  const userPrompt = `
Explain the following ${language} code line by line:

\`\`\`${language}
${codeWithoutComments}
\`\`\`

Provide a clear explanation for each line of code.
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    // 🔥 استفاده از callOpenAI با mode کاربر
    const content = await callOpenAI(systemPrompt, userPrompt, {
      mode: validMode, // ← simple/medium → Groq, advanced → OpenAI
      responseFormat: 'json_object',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw content:', content);
      }
      return NextResponse.json(
        { error: 'AI response format error. Please try again with shorter code.' },
        { status: 500 }
      );
    }

    const result = {
      explanations: data.explanations || [],
    };

    // ============================================================
    // 🔥 ذخیره در کش
    // ============================================================
    try {
      await cache.set(cacheKey, result);
      logger.info(`[explain-line-by-line] Cached result for IP ${ip}`);
    } catch (cacheError) {
      logger.warn('[explain-line-by-line] Failed to cache result:', cacheError);
    }

    logger.info(`[explain-line-by-line] Success for IP ${ip}, ${result.explanations.length} explanations, mode: ${validMode}`);
    return NextResponse.json(result);
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('[explain-line-by-line] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate explanations' },
      { status: 500 }
    );
  }
});