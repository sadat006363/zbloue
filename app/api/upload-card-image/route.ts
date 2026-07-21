// app/api/upload-card-image/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';

export const runtime = 'edge';

export const POST = withErrorHandlerAndLog(async (req: NextRequest) => {
  const ip = getClientIP(req);

  // ===== Rate Limiter =====
  const rateLimitResult = await rateLimiter(ip);
  if (!rateLimitResult.allowed) {
    logger.warn(`[upload-card-image] Rate limit exceeded for IP ${ip}`);
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    );
  }

  const { slug, imageDataUrl, title, username, theme } = await req.json();

  if (!slug || !imageDataUrl) {
    return NextResponse.json(
      { error: 'Slug and imageDataUrl are required' },
      { status: 400 }
    );
  }

  const base64Data = imageDataUrl.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');

  const fileName = `cards/${slug}-${Date.now()}.png`;
  const { url } = await put(fileName, buffer, {
    access: 'public',
    contentType: 'image/png',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  logger.info(`[upload-card-image] Card image uploaded for slug ${slug} (IP ${ip})`);
  return NextResponse.json({
    success: true,
    imageUrl: url,
  });
});