import { createClient } from '@supabase/supabase-js';

// ===== خواندن متغیرهای محیطی با fallback =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ===== فقط در زمان اجرا (Runtime) چک شود، نه در زمان build =====
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Missing Supabase environment variables in production');
  }
}

// ===== کلاینت با fallback (برای build بدون خطا) =====
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);