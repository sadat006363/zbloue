// app/api/upload-avatar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';
import { withCsrfProtection } from '@/lib/csrf';
import sharp from 'sharp';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

// ============================================================
// محدودیت‌ها
// ============================================================

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGE_DIMENSION = 1024; // 1024x1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST = withCsrfProtection(
  withErrorHandlerAndLog(async (req: NextRequest) => {
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

    // ============================================================
    // ۱. اعتبارسنجی نوع فایل
    // ============================================================
    
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: `Unsupported image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // ۲. اعتبارسنجی حجم فایل
    // ============================================================
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `Image size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          current: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 413 }
      );
    }

    // ============================================================
    // ۳. اعتبارسنجی و بهینه‌سازی ابعاد تصویر با sharp
    // ============================================================
    
    let optimizedBuffer: Buffer;
    // 🔥 رفع خطا: استفاده از نوع any به جای sharp.Metadata
    let metadata: any;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: unable to read dimensions');
      }
      
      if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
        return NextResponse.json(
          { 
            error: `Image dimensions must be ≤ ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`,
            current: `${metadata.width}x${metadata.height}`,
          },
          { status: 400 }
        );
      }
      
      // بهینه‌سازی تصویر
      const outputFormat = file.type === 'image/png' ? 'png' : 
                          file.type === 'image/webp' ? 'webp' : 'jpeg';
      
      const sharpInstance = sharp(buffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      
      if (outputFormat === 'jpeg') {
        sharpInstance.jpeg({ quality: 80, progressive: true });
      } else if (outputFormat === 'png') {
        sharpInstance.png({ quality: 80, compressionLevel: 9 });
      } else if (outputFormat === 'webp') {
        sharpInstance.webp({ quality: 80 });
      }
      
      optimizedBuffer = await sharpInstance.toBuffer();
      
      logger.info(`[upload-avatar] Image optimized: ${(buffer.length / 1024).toFixed(0)}KB → ${(optimizedBuffer.length / 1024).toFixed(0)}KB`);
      
    } catch (error) {
      logger.error('[upload-avatar] Image validation failed:', error);
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      );
    }

    // ============================================================
    // ۴. آپلود به Supabase Storage
    // ============================================================

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('[upload-avatar] Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const fileExtension = file.type === 'image/png' ? 'png' : 
                         file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${slug}-${Date.now()}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, optimizedBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      logger.error('[upload-avatar] Upload error:', uploadError);
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

    // ============================================================
    // ۵. به‌روزرسانی دیتابیس
    // ============================================================

    const { error: updateError } = await supabaseAdmin
      .from('snippets')
      .update({ avatar_url: avatarUrl })
      .eq('slug', slug);

    if (updateError) {
      logger.error('[upload-avatar] Database update error:', updateError);
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
  })
);