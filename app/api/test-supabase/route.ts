import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // تست ۱: بررسی متغیرهای محیطی
    const envCheck = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ موجود' : '❌ گم شده',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ موجود' : '❌ گم شده',
    };

    // تست ۲: اتصال به دیتابیس (یک کوئری ساده)
    const { data, error } = await supabase
      .from('snippets')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        success: false,
        envCheck,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      envCheck,
      message: '✅ اتصال به Supabase برقرار است!',
      tableExists: data !== null,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}