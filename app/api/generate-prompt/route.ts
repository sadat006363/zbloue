// app/api/generate-prompt/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_PROMPT, MAX_CODE_LENGTH } from '@/lib/constants';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';
import { callOpenAI } from '@/lib/openaiClient';
import { AnalysisModeSchema } from '@/types';

const openaiApiKey = process.env.OPENAI_API_KEY || 'placeholder-key';
const openai = new OpenAI({ apiKey: openaiApiKey });

const getSystemPrompt = (mode: string) => {
  if (mode === 'simple') {
    return `
You are a friendly programming tutor for beginners. Your task is to generate a simple, clear, and encouraging prompt that helps a beginner developer deeply understand the provided code.

**Guidelines:**
1. Use simple language and avoid technical jargon.
2. Ask questions that guide the learner step by step.
3. Focus on: What does this code do? How does it work? What are the key parts?
4. Include a simple challenge or question to test understanding.
5. Keep the tone supportive and encouraging.

**Output Format (MUST be valid JSON):**
{
  "prompt": "Your generated prompt here..."
}
`;
  }

  if (mode === 'medium') {
    return `
You are a skilled programming mentor. Your task is to generate a detailed and thought-provoking prompt that helps an intermediate developer analyze the provided code deeply.

**Guidelines:**
1. Use clear technical language but avoid being overly academic.
2. Ask questions about: logic flow, edge cases, potential bugs, and performance.
3. Encourage the learner to think about improvements and alternative implementations.
4. Include a moderate challenge or refactoring exercise.
5. Keep the tone professional and constructive.

**Output Format (MUST be valid JSON):**
{
  "prompt": "Your generated prompt here..."
}
`;
  }

  return `
You are a Senior Software Engineer and Code Reviewer. Your task is to generate a comprehensive, professional prompt that helps an experienced developer perform a production-grade analysis of the provided code.

**Guidelines:**
1. Use advanced technical language and precise terminology.
2. Ask questions about: security, performance, concurrency, scalability, maintainability, and architectural design.
3. Encourage the learner to think about optimization, error handling, and production readiness.
4. Include a high-level challenge (e.g., refactoring, redesigning, or adding a new feature).
5. Keep the tone analytical and objective.

**Output Format (MUST be valid JSON):**
{
  "prompt": "Your generated prompt here..."
}
`;
};

export const POST = withErrorHandlerAndLog(async (req: NextRequest) => {
  const ip = getClientIP(req);

  // ===== Rate Limiter =====
  const rateLimitResult = await rateLimiter(ip);
  if (!rateLimitResult.allowed) {
    logger.warn(`[generate-prompt] Rate limit exceeded for IP ${ip}`);
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

  const lines = code.split('\n').filter((line: string) => line.trim().length > 0);
  if (lines.length > MAX_LINES_PROMPT) {
    return NextResponse.json(
      { error: `Code exceeds ${MAX_LINES_PROMPT} lines (${lines.length} lines). Please shorten your code.` },
      { status: 400 }
    );
  }

  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { error: `Code is too long (${code.length} characters).` },
      { status: 400 }
    );
  }

  const systemPrompt = getSystemPrompt(validMode);

  const userPrompt = `
Generate a detailed analysis prompt for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Create a prompt that would help someone understand this code deeply.
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // 🔥 استفاده از callOpenAI با mode کاربر
    const content = await callOpenAI(systemPrompt, userPrompt, {
      mode: validMode, // ← simple/medium → Groq, advanced → OpenAI
      responseFormat: 'json_object',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = JSON.parse(content);

    logger.info(`[generate-prompt] Success for IP ${ip}, mode: ${validMode}`);
    return NextResponse.json({
      prompt: data.prompt || '',
    });
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('[generate-prompt] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prompt' },
      { status: 500 }
    );
  }
});