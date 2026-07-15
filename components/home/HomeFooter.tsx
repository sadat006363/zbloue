'use client';

export default function HomeFooter() {
  return (
    <footer className="mt-8 pt-4 border-t-2 border-[#d0d0d8] text-center text-[#4a4a6a] text-sm bg-white rounded-xl p-4 shadow-sm">
      <p className="font-medium">Zbloue · One-click technical content generator</p>
      <p className="text-xs mt-1 opacity-70">
        Built with Next.js, Supabase, and OpenAI
      </p>
      <p className="text-xs mt-2">
        📧 <a href="mailto:sjmousavi0066@gmail.com" className="text-[#4a86f7] hover:underline font-medium">sjmousavi0066@gmail.com</a>
      </p>
    </footer>
  );
}