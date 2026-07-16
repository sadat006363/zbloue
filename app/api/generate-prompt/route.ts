import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_PROMPT, MAX_CODE_LENGTH } from '@/lib/constants';

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

    // ===== ساخت پرامپت برای تولید پرامپت =====
    const systemPrompt = `
You are an expert AI prompt engineer. Your task is to generate a high-quality prompt that can be used to analyze the provided code.

**IMPORTANT RULES:**
1. Create a prompt that asks for detailed code analysis.
2. The prompt should be clear, specific, and actionable.
3. Include questions about: code purpose, logic flow, potential bugs, edge cases, and improvements.
4. Output MUST be in valid JSON format.

**Output Format:**
{
  "prompt": "Your generated prompt here..."
}
`;

    const userPrompt = `
Generate a detailed analysis prompt for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Create a prompt that would help someone understand this code deeply.
`;

    // ============================================================
    // 🔥 AbortController با timeout
    // ============================================================
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
    // ============================================================
    // 🔥 مدیریت خطا با شرط development
    // ============================================================
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