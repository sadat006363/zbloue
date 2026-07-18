import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_EXPLAIN, MAX_CODE_LENGTH } from '@/lib/constants';

// ============================================================
// 🔥 OpenAI Client با fallback (برای build بدون خطا)
// ============================================================
const openaiApiKey = process.env.OPENAI_API_KEY || 'placeholder-key';
const openai = new OpenAI({ apiKey: openaiApiKey });

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    // ===== محدودیت خطوط =====
    const lines = code.split('\n').filter((line: string) => line.trim().length > 0);
    if (lines.length > MAX_LINES_EXPLAIN) {
      return NextResponse.json(
        { error: `Code exceeds ${MAX_LINES_EXPLAIN} lines (${lines.length} lines). Please shorten your code.` },
        { status: 400 }
      );
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        { error: `Code is too long (${code.length} characters).` },
        { status: 400 }
      );
    }

    // ===== ساخت پرامپت =====
    const systemPrompt = `
You are an expert programming tutor. Explain the provided code line by line.

**IMPORTANT RULES:**
1. Provide a concise explanation for each line (max 2 sentences per line).
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
${code}
\`\`\`

Provide a clear explanation for each line of code.
`;

    // ============================================================
    // 🔥 AbortController با timeout
    // ============================================================
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds

    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 8000, // ← افزایش یافته
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0].message.content || '{}';
    
    // ===== مدیریت خطای JSON Parsing =====
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

    return NextResponse.json({
      explanations: data.explanations || [],
    });
  } catch (error: any) {
    // ============================================================
    // 🔥 مدیریت خطا با شرط development
    // ============================================================
    if (process.env.NODE_ENV === 'development') {
      console.error('Explanation error:', error);
    }

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Explanation request timed out after 45 seconds' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate explanations' },
      { status: 500 }
    );
  }
}