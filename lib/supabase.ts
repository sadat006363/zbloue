// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ===== متغیرهای محیطی =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ===== کلاینت سمت سرور (با Service Role Key) =====
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// ===== کلاینت سمت کلاینت (با Anon Key) =====
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);