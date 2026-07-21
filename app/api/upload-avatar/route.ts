// app/api/upload-avatar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

export const POST = withErrorHandlerAndLog(async (req: NextRequest) => {
  const ip = getClientIP(req);

  // ===== Rate Limiter =====
  const rateLimitResult = await rateLimiter(ip);
  if (!rateLimitResult.allowed) {
    logger.warn(`[upload-avatar] Rate limit exceeded for IP ${ip}`);
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('avatar') as File;
  const slug = formData.get('slug') as string;

  if (!file || !slug) {
    return NextResponse.json(
      { error: 'Avatar file and snippet slug are required' },
      { status: 400 }
    );
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'File must be an image' },
      { status: 400 }
    );
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Image size must be less than 2MB' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const fileExtension = file.name.split('.').pop() || 'png';
  const fileName = `${slug}-${Date.now()}.${fileExtension}`;

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Upload error:', uploadError);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: uploadError.message
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  const avatarUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from('snippets')
    .update({ avatar_url: avatarUrl })
    .eq('slug', slug);

  if (updateError) {
    console.error('❌ Database update error:', updateError);
    return NextResponse.json(
      { error: 'Failed to update snippet' },
      { status: 500 }
    );
  }

  logger.info(`[upload-avatar] Avatar uploaded for slug ${slug} (IP ${ip})`);
  return NextResponse.json({
    success: true,
    avatarUrl,
  });
});