'use client';

type ModeType = 'simple' | 'medium' | 'advanced';

interface ModeSelectorProps {
  mode: ModeType;
  setMode: (mode: ModeType) => void;
}

export default function ModeSelector({ mode, setMode }: ModeSelectorProps) {
  const modes: { id: ModeType; label: string; description: string }[] = [
    { id: 'simple', label: 'Simple', description: '⚡ Fast & concise' },
    { id: 'medium', label: 'Medium', description: '📊 Balanced review' },
    { id: 'advanced', label: 'Advanced', description: '🔬 Deep production-grade analysis' },
  ];

  return (
    <div className="mb-4 flex items-center gap-2 flex-wrap bg-white p-3 rounded-xl border-2 border-[#d0d0d8] shadow-sm">
      <span className="text-sm font-medium text-[#1a1a2e]">Analysis Mode:</span>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-1.5 text-sm rounded-full border-2 transition ${
              mode === m.id
                ? 'bg-[#4a86f7] text-white border-[#4a86f7]'
                : 'bg-white text-[#4a4a6a] border-[#d0d0d8] hover:border-[#4a86f7]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <span className="text-sm md:text-base font-semibold text-[#4a86f7] ml-2 hidden sm:inline">
        {modes.find(m => m.id === mode)?.description}
      </span>
    </div>
  );
}