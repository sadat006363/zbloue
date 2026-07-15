import { NextRequest, NextResponse } from 'next/server';
import { getHighlighterInstance } from '@/lib/shiki';

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    const shiki = await getHighlighterInstance();
    const html = shiki.codeToHtml(code, { lang: language || 'javascript', theme: 'dark-plus' });

    return NextResponse.json({
      success: true,
      html,
    });

  } catch (error: any) {
    console.error('Highlight error:', error);
    return NextResponse.json(
      { error: 'Failed to highlight code', details: error.message },
      { status: 500 }
    );
  }
}