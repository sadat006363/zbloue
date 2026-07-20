// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ===== متغیرهای محیطی با fallback برای جلوگیری از خطا در زمان build =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// ===== کلاینت سمت سرور با تایپ Database =====
// در زمان build، مقادیر placeholder استفاده می‌شوند و در زمان اجرا (runtime) مقادیر واقعی جایگزین می‌شوند.
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);