// app/api/upload-avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ===== نام bucket (می‌توانید از env هم بخوانید) =====
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

export async function POST(req: NextRequest) {
  try {
    // ===== 1. دریافت فایل و slug =====
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    const slug = formData.get('slug') as string;

    if (!file || !slug) {
      return NextResponse.json(
        { error: 'Avatar file and snippet slug are required' },
        { status: 400 }
      );
    }

    // ===== 2. اعتبارسنجی فایل =====
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (jpeg, png, gif, etc.)' },
        { status: 400 }
      );
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 2MB' },
        { status: 400 }
      );
    }

    // ===== 3. اتصال به Supabase (با Service Role Key) =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error: Missing Supabase credentials',
          details: 'Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ===== 4. تبدیل File به Buffer =====
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ===== 5. ساخت نام فایل یکتا =====
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${slug}-${Date.now()}.${fileExtension}`;

    // ===== 6. آپلود به Supabase Storage =====
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      
      // اگر bucket وجود نداشته باشد، پیام واضح بده
      if (uploadError.message?.includes('bucket not found')) {
        return NextResponse.json(
          { 
            error: `Storage bucket "${STORAGE_BUCKET}" not found in Supabase.`,
            details: `Please create a public bucket named "${STORAGE_BUCKET}" in Supabase Dashboard → Storage.`
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed due to storage error' },
        { status: 500 }
      );
    }

    // ===== 7. دریافت URL عمومی =====
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    // ===== 8. ذخیره لینک در دیتابیس =====
    const { error: updateError } = await supabaseAdmin
      .from('snippets')
      .update({ avatar_url: avatarUrl })
      .eq('slug', slug);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save avatar URL in database' },
        { status: 500 }
      );
    }

    console.log(`✅ Avatar uploaded successfully for snippet: ${slug}`);
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