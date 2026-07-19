import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_PROMPT, MAX_CODE_LENGTH } from '@/lib/constants';

// ============================================================
// 🔥 OpenAI Client با fallback
// ============================================================
const openaiApiKey = process.env.OPENAI_API_KEY || 'placeholder-key';
const openai = new OpenAI({ apiKey: openaiApiKey });

// ============================================================
// 🔥 پرامپت‌های مختلف بر اساس mode
// ============================================================
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

  // Advanced (پیش‌فرض)
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

export async function POST(req: NextRequest) {
  try {
    const { code, language, mode = 'simple' } = await req.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    // ===== محدودیت خطوط =====
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

    // ============================================================
    // 🔥 انتخاب پرامپت بر اساس mode
    // ============================================================
    const systemPrompt = getSystemPrompt(mode);

    const userPrompt = `
Generate a detailed analysis prompt for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Create a prompt that would help someone understand this code deeply.
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
        max_tokens: 4000,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0].message.content || '{}';
    const data = JSON.parse(content);

    return NextResponse.json({
      prompt: data.prompt || '',
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Prompt generation error:', error);
    }

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Prompt generation timed out after 30 seconds' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}