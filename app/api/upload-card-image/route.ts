// app/api/upload-card-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { generateCardImageBuffer } from '@/lib/cardImageGenerator';

export async function POST(req: NextRequest) {
  try {
    const { slug, title, username, theme } = await req.json();

    // ===== اعتبارسنجی =====
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zbloue.vercel.app';

    // ===== تولید تصویر کارت =====
    const imageBuffer = await generateCardImageBuffer({
      slug,
      title: title || 'Code Analysis',
      username: username || 'Developer',
      theme: theme || 'blue',
      appUrl,
    });

    // ===== آپلود در Vercel Blob =====
    const fileName = `cards/${slug}-${Date.now()}.png`;
    const { url } = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      imageUrl: url,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}