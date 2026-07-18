// app/api/upload-avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    // ===== 1. دریافت فایل و slug =====
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    const slug = formData.get('slug') as string;

    if (!file || !slug) {
      return NextResponse.json(
        { error: 'Avatar and slug are required' },
        { status: 400 }
      );
    }

    // ===== 2. اعتبارسنجی فایل =====
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

    // ============================================================
    // 🔥 ساخت کلاینت Supabase به‌صورت Lazy (در زمان اجرا)
    // ============================================================
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // ===== import پویا برای جلوگیری از بارگذاری در زمان build =====
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================================
    // 🔥 آپلود در Vercel Blob
    // ============================================================
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error('Missing BLOB_READ_WRITE_TOKEN');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Blob token' },
        { status: 500 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `avatars/${slug}-${Date.now()}.${fileExtension}`;

    const { url } = await put(fileName, buffer, {
      access: 'public',
      contentType: file.type,
      token: blobToken,
    });

    // ============================================================
    // 🔥 ذخیره لینک در دیتابیس
    // ============================================================
    const { data, error } = await supabaseAdmin
      .from('snippets')
      .update({ avatar_url: url })
      .eq('slug', slug)
      .select('avatar_url')
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to save avatar URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl: data?.avatar_url || url,
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}