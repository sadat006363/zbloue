// test-supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabase() {
  console.log("🧪 شروع تست Supabase...");
  console.log("====================================");
  
  // خواندن متغیرهای محیطی
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log("📋 متغیرهای محیطی:");
  console.log(`  - URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '❌ پیدا نشد'}`);
  console.log(`  - Anon Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : '❌ پیدا نشد'}`);
  console.log("====================================");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ متغیرهای محیطی پیدا نشدند!");
    return;
  }
  
  // ایجاد کلاینت Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("✅ کلاینت Supabase ساخته شد.");
  
  try {
    // تست 1: اتصال به دیتابیس
    console.log("\n🔍 تست 1: بررسی وجود جدول...");
    const { data: tableCheck, error: tableError } = await supabase
      .from('snippets')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error("❌ خطا در بررسی جدول:", tableError);
      console.error("  - کد خطا:", tableError.code);
      console.error("  - پیام:", tableError.message);
      console.error("  - جزئیات:", tableError.details);
    } else {
      console.log("✅ جدول 'snippets' وجود دارد!");
    }
    
    // تست 2: درج داده
    console.log("\n🔍 تست 2: درج یک رکورد تستی...");
    const testData = {
      slug: 'test-' + Date.now(),
      code: 'console.log("test")',
      language: 'javascript',
      title: 'Test Snippet',
      explanation: 'This is a test snippet',
      key_points: ['test point 1', 'test point 2'],
      linkedin_caption: 'Test LinkedIn post'
    };
    
    console.log("📝 داده تستی:", JSON.stringify(testData, null, 2));
    
    const { data: insertData, error: insertError } = await supabase
      .from('snippets')
      .insert([testData])
      .select()
      .single();
    
    if (insertError) {
      console.error("❌ خطا در درج داده:", insertError);
      console.error("  - کد خطا:", insertError.code);
      console.error("  - پیام:", insertError.message);
      console.error("  - جزئیات:", insertError.details);
      console.error("  - راهنمایی:", insertError.hint);
    } else {
      console.log("✅ درج داده با موفقیت انجام شد!");
      console.log("📦 داده ذخیره شده:", JSON.stringify(insertData, null, 2));
    }
    
    // تست 3: خواندن داده
    console.log("\n🔍 تست 3: خواندن داده...");
    const { data: readData, error: readError } = await supabase
      .from('snippets')
      .select('*')
      .limit(3);
    
    if (readError) {
      console.error("❌ خطا در خواندن داده:", readError);
    } else {
      console.log(`✅ ${readData.length} رکورد خوانده شد.`);
      console.log("📦 داده:", JSON.stringify(readData, null, 2));
    }
    
  } catch (error) {
    console.error("💥 خطای غیرمنتظره:", error);
  }
  
  console.log("\n====================================");
  console.log("🏁 تست به پایان رسید.");
}

testSupabase();
