// components/snippet/SnippetJsonDropdown.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Snippet } from '@/types';

interface SnippetJsonDropdownProps {
  snippet: Snippet | null;
}

type JsonViewMode =
  | 'full'
  | 'findings'
  | 'scorecard'
  | 'verdict'
  | 'complexity'
  | 'recommendedActions'
  | 'improvedCode'
  | 'linkedinPost'
  | 'executionOverview'
  | 'architecturalObservations'
  | 'limitations'
  | 'debugTrace';

const viewModes: { id: JsonViewMode; label: string; icon: string }[] = [
  { id: 'full', label: 'Full Snippet JSON', icon: '📦' },
  { id: 'findings', label: 'Findings', icon: '🔍' },
  { id: 'scorecard', label: 'Scorecard', icon: '📊' },
  { id: 'verdict', label: 'Verdict', icon: '🏁' },
  { id: 'complexity', label: 'Complexity', icon: '📈' },
  { id: 'recommendedActions', label: 'Recommended Actions', icon: '🔧' },
  { id: 'improvedCode', label: 'Improved Code', icon: '✨' },
  { id: 'linkedinPost', label: 'LinkedIn Post', icon: '💼' },
  { id: 'executionOverview', label: 'Execution Overview', icon: '⚡' },
  { id: 'architecturalObservations', label: 'Architectural Observations', icon: '🏗️' },
  { id: 'limitations', label: 'Limitations', icon: '⚠️' },
  { id: 'debugTrace', label: 'Pipeline Trace (Full Chain)', icon: '🔬' },
];

export default function SnippetJsonDropdown({ snippet }: SnippetJsonDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('Full Snippet JSON');
  const [selectedIcon, setSelectedIcon] = useState('📦');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!snippet) return null;

  const getJsonData = (mode: JsonViewMode): { label: string; data: unknown } => {
    const dataMap: Record<JsonViewMode, { label: string; data: unknown }> = {
      full: { label: 'Full Snippet Data', data: snippet },
      findings: { label: 'Findings', data: snippet.findings || [] },
      scorecard: {
        label: 'Scorecard',
        data: snippet.scorecard_new || snippet.scorecard || {},
      },
      verdict: { label: 'Verdict', data: snippet.verdict || {} },
      complexity: { label: 'Complexity', data: snippet.complexity || {} },
      recommendedActions: {
        label: 'Recommended Actions',
        data: snippet.recommended_actions || [],
      },
      improvedCode: {
        label: 'Improved Code',
        data: snippet.improved_code || null,
      },
      linkedinPost: {
        label: 'LinkedIn Post',
        data: snippet.linkedin_post || null,
      },
      executionOverview: {
        label: 'Execution Overview',
        data: snippet.execution_overview || {},
      },
      architecturalObservations: {
        label: 'Architectural Observations',
        data: snippet.architectural_observations || [],
      },
      limitations: {
        label: 'Limitations',
        data: snippet.limitations || [],
      },
      debugTrace: {
        label: 'Pipeline Trace - Full Analysis Chain',
        data: snippet.debug_trace || null,
      },
    };
    return dataMap[mode];
  };

  const handleSelect = async (mode: JsonViewMode) => {
    const { label, data } = getJsonData(mode);
    const jsonString = JSON.stringify(data, null, 2);

    const modeInfo = viewModes.find((m) => m.id === mode);
    setSelectedLabel(modeInfo?.label || label);
    setSelectedIcon(modeInfo?.icon || '📦');
    setIsOpen(false);
    setIsCopying(true);

    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
      alert('❌ Failed to copy JSON');
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyFull = async () => {
    const jsonString = JSON.stringify(snippet, null, 2);
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
      alert('❌ Failed to copy JSON');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* ===== دکمه کشویی ===== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${isOpen
            ? 'bg-[#4a86f7] text-white border border-[#4a86f7]'
            : 'bg-[#4a86f7]/10 text-[#89b4fa] border border-[#4a86f7]/30 hover:bg-[#4a86f7]/20 hover:border-[#4a86f7]/50'
          }
        `}
        title="Select JSON view to copy"
      >
        <span>{selectedIcon}</span>
        <span className="hidden sm:inline">{selectedLabel}</span>
        <span className="sm:hidden">📋</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ===== دکمه کپی کامل ===== */}
      <button
        onClick={handleCopyFull}
        disabled={isCopying}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${copied
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-[#4a86f7]/10 text-[#89b4fa] border border-[#4a86f7]/30 hover:bg-[#4a86f7]/20 hover:border-[#4a86f7]/50'
          }
          ${isCopying && 'opacity-50 cursor-not-allowed'}
        `}
        title="Copy full JSON to clipboard"
      >
        {isCopying ? (
          <div className="w-4 h-4 border-2 border-[#89b4fa]/30 border-t-[#89b4fa] rounded-full animate-spin" />
        ) : copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
        <span className="hidden sm:inline">
          {copied ? '✅ Copied!' : isCopying ? 'Copying...' : 'Copy All'}
        </span>
      </button>

      {/* ===== منوی کشویی ===== */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#1e1e2e] rounded-xl border border-[#313244] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-2 border-b border-[#313244] bg-[#11111b]">
            <span className="text-xs font-medium text-[#6c7086] uppercase tracking-wider">
              📊 JSON Views
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {viewModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode.id)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-[#a6adc8] hover:bg-[#2a2a3e]"
              >
                <span className="text-base">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== استایل اسکرول‌بار ===== */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e1e2e;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a86f7;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3b6fd4;
        }
      `}</style>
    </div>
  );
}