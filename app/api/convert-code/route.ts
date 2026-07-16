import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ============================================================
// 🔥 OpenAI Client با fallback (برای build بدون خطا)
// ============================================================
const openaiApiKey = process.env.OPENAI_API_KEY || 'placeholder-key';
const openai = new OpenAI({ apiKey: openaiApiKey });

// ===== Supported languages for conversion =====
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java',
  'rust', 'go', 'cpp', 'php'
];

// ===== Languages that cannot be converted (markup/data) =====
const NON_CONVERTIBLE = ['html', 'css', 'json'];

// ===== Conversion support map =====
const CONVERSION_MAP: Record<string, string[]> = {
  'javascript': ['typescript', 'python', 'java', 'go', 'php', 'cpp'],
  'typescript': ['javascript', 'python', 'java', 'go', 'php', 'cpp'],
  'python': ['javascript', 'java', 'go', 'cpp', 'php'],
  'java': ['javascript', 'python', 'go', 'cpp', 'php'],
  'rust': ['javascript', 'python', 'go'],
  'go': ['javascript', 'python', 'java', 'cpp', 'php'],
  'cpp': ['javascript', 'python', 'java', 'go', 'php'],
  'php': ['javascript', 'python', 'java', 'go'],
};

// ============================================================
// 🔥 Rate Limiting (اختیاری ولی پیشنهاد میشه)
// ============================================================
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

export async function POST(req: NextRequest) {
  try {
    // ===== 1. Rate Limiting (اختیاری) =====
    const ip = getClientIP(req);
    const now = Date.now();
    const log = requestLog.get(ip);

    if (log) {
      if (now - log.firstRequest > 24 * 60 * 60 * 1000) {
        requestLog.set(ip, { count: 1, firstRequest: now });
      } else if (log.count >= 10) { // محدودیت ۱۰ درخواست در روز برای تبدیل
        return NextResponse.json(
          { error: 'Too many conversion requests. Maximum 10 per day.' },
          { status: 429 }
        );
      } else {
        log.count += 1;
        requestLog.set(ip, log);
      }
    } else {
      requestLog.set(ip, { count: 1, firstRequest: now });
    }

    // ===== 2. دریافت داده =====
    const { code, sourceLanguage, targetLanguage } = await req.json();

    // ===== 3. Validation =====
    if (!code || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Code, source language, and target language are required' },
        { status: 400 }
      );
    }

    // ===== 4. Check if source language is convertible =====
    if (NON_CONVERTIBLE.includes(sourceLanguage)) {
      return NextResponse.json(
        {
          error: `${sourceLanguage.toUpperCase()} is a markup/data language and cannot be converted to other languages.`,
          availableTargets: [],
        },
        { status: 400 }
      );
    }

    // ===== 5. Check if source language is supported =====
    if (!SUPPORTED_LANGUAGES.includes(sourceLanguage)) {
      return NextResponse.json(
        { error: `Source language "${sourceLanguage}" is not supported for conversion` },
        { status: 400 }
      );
    }

    // ===== 6. Check if target language is supported =====
    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return NextResponse.json(
        { error: `Target language "${targetLanguage}" is not supported for conversion` },
        { status: 400 }
      );
    }

    // ===== 7. Check if conversion is possible =====
    const availableTargets = CONVERSION_MAP[sourceLanguage] || [];
    if (!availableTargets.includes(targetLanguage)) {
      return NextResponse.json(
        {
          error: `Conversion from ${sourceLanguage} to ${targetLanguage} is not supported.`,
          availableTargets,
        },
        { status: 400 }
      );
    }

    // ===== 8. Code length limit for conversion =====
    if (code.length > 30000) {
      return NextResponse.json(
        { error: 'Code is too long for conversion. Maximum 30,000 characters.' },
        { status: 400 }
      );
    }

    // ===== 9. Prepare prompt for AI =====
    const prompt = `
You are an expert software engineer. Convert the following code from ${sourceLanguage} to ${targetLanguage}.

Rules:
1. Keep the same logic and functionality.
2. Use the best practices and idiomatic syntax of the target language.
3. Preserve comments and variable names where possible.
4. If the code uses a framework or library that doesn't exist in the target language, suggest an alternative.
5. Return ONLY the converted code, no explanations.

Source code (${sourceLanguage}):
\`\`\`
${code}
\`\`\`

Converted code (${targetLanguage}):
`;

    // ===== 10. Call OpenAI API با timeout =====
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code conversion expert. Return only the converted code. Do not add any explanations or markdown formatting.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const convertedCode = response.choices[0].message.content || '';

    // ===== 11. Clean up response (remove markdown if present) =====
    const cleanCode = convertedCode
      .replace(/^```[a-zA-Z]*\s*/, '') // Remove opening ```lang
      .replace(/\s*```$/, '') // Remove closing ```
      .trim();

    return NextResponse.json({
      success: true,
      sourceLanguage,
      targetLanguage,
      convertedCode: cleanCode,
    });

  } catch (error: any) {
    // ===== 12. مدیریت خطا با شرط development =====
    if (process.env.NODE_ENV === 'development') {
      console.error('Code conversion error:', error);
    }

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Conversion request timed out after 30 seconds' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to convert code', details: error.message },
      { status: 500 }
    );
  }
}