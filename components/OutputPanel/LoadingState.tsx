export default function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-white rounded-xl border-2 border-[#d0d0d8] p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-[#4a86f7]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-[#4a86f7] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-t-transparent border-r-[#4a86f7] border-b-transparent border-l-[#4a86f7] rounded-full animate-spin animation-delay-300"></div>
          <div className="absolute inset-4 border-4 border-t-transparent border-r-transparent border-b-[#4a86f7] border-l-transparent rounded-full animate-spin animation-delay-600"></div>
        </div>
        <p className="text-[#4a4a6a] font-medium animate-pulse">⏳ Generating content...</p>
        <p className="text-xs text-[#a0a0b0]">This may take a few seconds</p>
      </div>
    </div>
  );
}