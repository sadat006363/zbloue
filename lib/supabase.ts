import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ===== فقط در زمان اجرا (Runtime) چک کن، نه در زمان build =====
// ===== در محیط build، از placeholder استفاده کن =====
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// ===== فقط در محیط production (واقعی) اخطار بده =====
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Missing Supabase environment variables in production');
  }
}