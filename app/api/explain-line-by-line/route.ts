import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MAX_LINES_EXPLAIN, MAX_CODE_LENGTH } from '@/lib/constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // ===== ساخت پرامپت برای توضیح خط به خط =====
    const systemPrompt = `
You are an expert programming tutor. Your task is to explain the provided code line by line.

**IMPORTANT RULES:**
1. Provide a clear, concise explanation for each line of code.
2. Focus on WHAT the line does and WHY it's important.
3. Use simple, easy-to-understand language.
4. Output MUST be in valid JSON format.
5. ALL explanations MUST be in English.

**Output Format:**
{
  "explanations": [
    {
      "lineNumber": 1,
      "code": "const x = 5;",
      "explanation": "Declares a constant variable x and assigns it the value 5."
    },
    ...
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const data = JSON.parse(content);

    return NextResponse.json({
      explanations: data.explanations || [],
    });

  } catch (error: any) {
    console.error('Explanation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate explanations' },
      { status: 500 }
    );
  }
}