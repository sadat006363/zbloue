// app/api/upload-avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    const slug = formData.get('slug') as string;

    if (!file || !slug) {
      return NextResponse.json(
        { error: 'Avatar file and snippet slug are required' },
        { status: 400 }
      );
    }

    // اعتبارسنجی
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

    // تبدیل فایل به Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // نام فایل یکتا
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${slug}-${Date.now()}.${fileExtension}`;

    // ===== آپلود با تنظیمات explicit =====
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

    // ===== دریافت URL عمومی =====
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    // ===== ذخیره در دیتابیس =====
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

    console.log('✅ Avatar uploaded:', avatarUrl);
    return NextResponse.json({
      success: true,
      avatarUrl,
    });
  } catch (error: any) {
    console.error('❌ Avatar upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}