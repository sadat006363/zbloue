'use client';

interface CardBackgroundProps {
  theme: string;
}

export default function CardBackground({ theme }: CardBackgroundProps) {
  return (
    <>
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="absolute top-[-150px] right-[-150px] w-[400px] h-[400px] bg-[#4a86f7]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#a855f7]/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-2xl" />
    </>
  );
}