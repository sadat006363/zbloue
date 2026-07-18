import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_PROMPT, MAX_CODE_LENGTH } from '@/lib/constants';
import { removeComments } from '@/lib/utils';

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

    // ============================================================
    // 🔥 NEW: Remove comments before processing
    // ============================================================
    const codeWithoutComments = removeComments(code, language);

    // ===== محدودیت خطوط (با کد بدون کامنت) =====
    const lines = codeWithoutComments.split('\n').filter((line: string) => line.trim().length > 0);
    if (lines.length > MAX_LINES_PROMPT) {
      return NextResponse.json(
        { error: `Code exceeds ${MAX_LINES_PROMPT} lines (${lines.length} lines). Please shorten your code.` },
        { status: 400 }
      );
    }

    if (codeWithoutComments.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        { error: `Code is too long (${codeWithoutComments.length} characters).` },
        { status: 400 }
      );
    }

    // ===== ساخت پرامپت =====
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
${codeWithoutComments}
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
    let data;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw content:', content);
      }
      return NextResponse.json(
        { error: 'AI response format error. Please try again.' },
        { status: 500 }
      );
    }

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