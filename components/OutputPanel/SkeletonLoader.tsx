// components/OutputPanel/SkeletonLoader.tsx

'use client';

export default function SkeletonLoader() {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border-2 border-[#d0d0d8] overflow-hidden shadow-sm animate-pulse">
      {/* ===== Header ===== */}
      <div className="flex items-center border-b-2 border-[#d0d0d8] flex-wrap bg-[#f1f3f5] px-2 py-3">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-8 w-16 bg-gray-200 rounded-md" />
          ))}
        </div>
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Title */}
        <div className="h-8 w-3/4 bg-gray-200 rounded-lg" />

        {/* Summary */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>

        {/* Findings / Cards */}
        <div className="space-y-3 mt-4">
          <div className="h-6 w-1/3 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 space-y-2 border border-gray-200">
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Scorecard */}
        <div className="mt-4">
          <div className="h-6 w-1/4 bg-gray-200 rounded-lg mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-3 text-center border border-gray-200">
                <div className="h-4 w-12 bg-gray-200 rounded mx-auto" />
                <div className="h-6 w-8 bg-gray-200 rounded mx-auto mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Footer ===== */}
      <div className="border-t border-[#d0d0d8] p-4 bg-[#f8f9fa]">
        <div className="h-4 w-48 bg-gray-200 rounded mx-auto" />
      </div>
    </div>
  );
}