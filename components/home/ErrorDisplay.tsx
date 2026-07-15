'use client';

interface ErrorDisplayProps {
  message: string | null;
}

export default function ErrorDisplay({ message }: ErrorDisplayProps) {
  if (!message) return null;
  
  return (
    <div className="bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
      {message}
    </div>
  );
}