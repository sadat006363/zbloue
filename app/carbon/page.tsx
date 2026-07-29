// app/carbon/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { CarbonTab } from '@/components/Carbon/CarbonTab';

export default function CarbonPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0f0f14] p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-white">🎨 Carbon - Code Snapshot</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-md transition text-sm"
        >
          ✕ بازگشت
        </button>
      </div>
      <div className="h-[calc(100vh-100px)]">
        <CarbonTab
          initialCode="// کد خود را اینجا وارد کنید..."
          initialLanguage="javascript"
        />
      </div>
    </main>
  );
}