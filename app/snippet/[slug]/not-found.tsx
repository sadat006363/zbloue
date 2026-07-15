import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#f38ba8] mb-4">۴۰۴</h1>
        <h2 className="text-2xl text-white mb-2">اسنیپت پیدا نشد</h2>
        <p className="text-[#a6adc8] mb-6">
          لینکی که دنبالش بودید وجود ندارد یا حذف شده است.
        </p>
        <Link
          href="/"
          className="bg-[#89b4fa] hover:bg-[#74c7ec] text-black font-bold py-2 px-6 rounded-md transition"
        >
          بازگشت به خانه
        </Link>
      </div>
    </main>
  );
}