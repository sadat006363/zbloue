import { NextRequest, NextResponse } from 'next/server';
import { generateEducationalContent } from '@/lib/ai';
import { GenerateRequest } from '@/types';
import { removeComments } from '@/lib/utils';
import {
  MAX_LINES_GENERATE,
  MAX_CODE_LENGTH,
  MAX_REQUESTS_PER_IP,
  TIME_WINDOW,
  SUPPORTED_LANGUAGES,
} from '@/lib/constants';

// ===== Rate Limiting =====
const requestLog = new Map<string, { count: number; firstRequest: number }>();

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

// ===== Type Guard برای زبان‌ها =====
function isSupportedLanguage(lang: string): lang is typeof SUPPORTED_LANGUAGES[number] {
  return SUPPORTED_LANGUAGES.includes(lang as any);
}

export async function POST(req: NextRequest) {
  try {
    // ===== 1. Rate Limiting =====
    const ip = getClientIP(req);
    const now = Date.now();
    const log = requestLog.get(ip);

    if (log) {
      if (now - log.firstRequest > TIME_WINDOW) {
        requestLog.set(ip, { count: 1, firstRequest: now });
      } else if (log.count >= MAX_REQUESTS_PER_IP) {
        return NextResponse.json(
          {
            error: `Too many requests. Maximum ${MAX_REQUESTS_PER_IP} requests per 24 hours.`,
          },
          { status: 429 }
        );
      } else {
        log.count += 1;
        requestLog.set(ip, log);
      }
    } else {
      requestLog.set(ip, { count: 1, firstRequest: now });
    }

    // ===== 2. Validate input =====
    const body: GenerateRequest = await req.json();
    const { code, language, mode } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    if (!mode || !['simple', 'medium', 'advanced'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Use simple, medium, or advanced.' },
        { status: 400 }
      );
    }

    // ===== 3. Validate language (با type guard) =====
    if (!isSupportedLanguage(language)) {
      return NextResponse.json(
        {
          error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // ===== 4. Code limits =====
    const lines = code.split('\n').length;
    if (lines > MAX_LINES_GENERATE) {
      return NextResponse.json(
        {
          error: `Code exceeds ${MAX_LINES_GENERATE} lines (${lines} lines). Please shorten your code.`,
        },
        { status: 400 }
      );
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        {
          error: `Code is too long (${code.length} characters). Maximum is ${MAX_CODE_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    // ===== 5. Payload size limit =====
    const payloadSize = JSON.stringify(body).length;
    if (payloadSize > 100000) {
      return NextResponse.json(
        { error: 'Payload too large (max 100KB)' },
        { status: 413 }
      );
    }

    // ============================================================
    // 🔥 NEW: Remove comments before sending to AI (especially for Advanced mode)
    // ============================================================
    let processedCode = code;
    if (mode === 'advanced') {
      processedCode = removeComments(code, language);
    }

    // ===== 6. Execute AI =====
    const result = await generateEducationalContent(processedCode, language, mode);
    return NextResponse.json(result);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('AI Generation error:', error);
    }
    return NextResponse.json(
      { error: error.message || 'AI processing failed. Please try again.' },
      { status: 500 }
    );
  }
}