import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// ============================================================
// 🔥 بدون استفاده از @vercel/og
// ============================================================
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { slug, imageDataUrl, title, username, theme } = await req.json();

    if (!slug || !imageDataUrl) {
      return NextResponse.json(
        { error: 'Slug and imageDataUrl are required' },
        { status: 400 }
      );
    }

    // ===== تبدیل Data URL به Buffer =====
    const base64Data = imageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // ===== آپلود در Vercel Blob =====
    const fileName = `cards/${slug}-${Date.now()}.png`;
    const { url } = await put(fileName, buffer, {
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