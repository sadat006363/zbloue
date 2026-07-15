import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    // ===== پرامپت سیستم با دستور انگلیسی =====
    const systemPrompt = `
You are an expert software engineer and technical writer.

Your task is to generate a professional, detailed prompt based on the provided source code.

**IMPORTANT RULES:**
1. **OUTPUT LANGUAGE**: Your entire response MUST be in English only.
2. **NO PERSIAN/FARSI**: Do not use any Persian (Farsi) language, including comments, explanations, or descriptions.
3. **ALL CONTENT IN ENGLISH**: All function descriptions, parameter explanations, return value details, and comments must be written in English.
4. **PROFESSIONAL TONE**: Use a professional, technical tone suitable for developers.

The prompt you generate should include:
1. A clear title describing the program's purpose
2. Detailed explanation of each function (inputs, outputs, edge cases)
3. Main execution flow description
4. Best practices and code quality suggestions
5. Example usage or test cases

Format the prompt as a comprehensive development task that another developer could follow to recreate or improve the code.
`;

    // ===== پرامپت کاربر =====
    const userPrompt = `
Generate a professional, detailed prompt for the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

**Requirements for the prompt:**
- ALL IN ENGLISH (no Persian/Farsi)
- Professional and technical tone
- Include function descriptions, parameters, return values
- Explain the main program flow
- Mention edge cases and error handling
- Suggest improvements or best practices if applicable

Your response MUST be 100% in English.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const prompt = response.choices[0].message.content || '';

    return NextResponse.json({ prompt });

  } catch (error: any) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}