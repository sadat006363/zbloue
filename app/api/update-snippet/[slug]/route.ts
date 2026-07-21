// app/api/update-snippet/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Snippet } from '@/types';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiSecretKey = process.env.API_SECRET_KEY;

if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('⚠️ Missing Supabase environment variables');
  }
  if (!apiSecretKey) {
    console.error('⚠️ Missing API_SECRET_KEY environment variable');
  }
}

const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

type UpdateSnippetData = Partial<Pick<
  Snippet,
  'username' | 'github_username' | 'line_explanations' | 'generated_prompt' | 'avatar_url'
>>;

export const PATCH = withErrorHandlerAndLog(
  async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
    const ip = getClientIP(req);

    // ===== Rate Limiter =====
    const rateLimitResult = await rateLimiter(ip);
    if (!rateLimitResult.allowed) {
      logger.warn(`[update-snippet] Rate limit exceeded for IP ${ip}`);
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429 }
      );
    }

    const apiKey = req.headers.get('x-api-key');

    if (!apiSecretKey) {
      return NextResponse.json(
        { error: 'Server configuration error: API key not set' },
        { status: 500 }
      );
    }

    if (apiKey !== apiSecretKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const body = await req.json();

    const updateData: UpdateSnippetData = {};

    if (body.username !== undefined) {
      updateData.username = body.username?.trim().slice(0, 50) || null;
    }
    if (body.github_username !== undefined) {
      updateData.github_username = body.github_username?.trim().slice(0, 50) || null;
    }
    if (body.line_explanations !== undefined) {
      updateData.line_explanations = body.line_explanations || null;
    }
    if (body.generated_prompt !== undefined) {
      updateData.generated_prompt = body.generated_prompt || null;
    }
    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('snippets')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase update error:', error);
      }
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Snippet not found' },
        { status: 404 }
      );
    }

    logger.info(`[update-snippet] Successfully updated snippet ${slug} (IP ${ip})`);
    return NextResponse.json({
      success: true,
      data,
    });
  }
);