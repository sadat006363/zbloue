import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // 1. بررسی متغیرهای محیطی
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("🔍 [V2] Environment Variables:");
    console.log("  URL:", supabaseUrl);
    console.log("  KEY:", supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT FOUND');

    // 2. ایجاد کلاینت جدید (مستقل از lib/supabase)
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: "Missing environment variables"
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. تست با نام جدول 'snippets'
    const testData = {
      slug: 'debug-v2-' + Date.now(),
      code: 'console.log("debug v2")',
      language: 'javascript',
      title: 'Debug V2 Snippet',
      explanation: 'Debug test v2',
      key_points: ['point 1', 'point 2'],
      linkedin_caption: 'Debug v2 post'
    };

    console.log("📝 Inserting into 'snippets' table:", testData);

    const { data, error } = await supabase
      .from('snippets')
      .insert([testData])
      .select()
      .single();

    if (error) {
      console.error("❌ Error inserting:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        // اضافه کردن لاگ کامل برای دیباگ
        debug: {
          supabaseUrl: supabaseUrl,
          tableName: 'snippets'
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    console.error("💥 Unexpected error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
