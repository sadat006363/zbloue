import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log("🔍 Debug API called");
    
    // تست ۱: بررسی متغیرهای محیطی
    const envCheck = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅" : "❌",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅" : "❌",
    };
    
    // تست ۲: درج یک رکورد تستی
    const testData = {
      slug: 'debug-' + Date.now(),
      code: 'console.log("debug test")',
      language: 'javascript',
      title: 'Debug Snippet',
      explanation: 'This is a debug test',
      key_points: ['debug point 1', 'debug point 2'],
      linkedin_caption: 'Debug LinkedIn post'
    };
    
    console.log("📝 Inserting test data:", testData);
    
    const { data, error } = await supabase
      .from('snippets')  // ← مطمئن شو اینجا 'snippets' است
      .insert([testData])
      .select()
      .single();
    
    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({
        success: false,
        envCheck,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      }, { status: 500 });
    }
    
    console.log("✅ Insert successful:", data);
    return NextResponse.json({
      success: true,
      envCheck,
      data
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
