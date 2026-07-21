// context/AppContext.tsx

'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  AppState,
  OutputsByMode,
  PromptInfo,
  ModeOutput,
  Snippet,
  GenerateResponse,
  LineExplanation,
} from '@/types';

// ============================================================
// 🔥 تایپ‌های Context
// ============================================================

type Action =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SET_MODE'; payload: 'simple' | 'medium' | 'advanced' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONVERTING'; payload: boolean }
  | { type: 'SET_EXPLAINING'; payload: boolean }
  | { type: 'SET_GENERATING_PROMPT'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONVERT_ERROR'; payload: string | null }
  | { type: 'SET_EXPLAIN_ERROR'; payload: string | null }
  | { type: 'SET_PROMPT_ERROR'; payload: string | null }
  | { type: 'SET_OUTPUTS'; payload: Partial<OutputsByMode> }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_GITHUB_USERNAME'; payload: string }
  | { type: 'SET_AVATAR'; payload: string | null }
  | { type: 'SET_CONVERT_LANGUAGE'; payload: string }
  | { type: 'SET_HOVERED_LINE'; payload: number | null }
  | { type: 'SET_TOAST'; payload: string | null }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_CURRENT_OUTPUT' }
  | { type: 'SET_PROMPT_INFO'; payload: PromptInfo | null };

type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

// ============================================================
// 🔥 مقدار اولیه
// ============================================================

const initialState: AppState = {
  code: '',
  language: 'javascript',
  mode: 'simple',
  loading: false,
  isConverting: false,
  isExplaining: false,
  isGeneratingPrompt: false,
  errorMessage: null,
  convertError: null,
  explainError: null,
  promptError: null,
  outputs: {
    simple: { snippet: null, fullAnalysis: null, lineExplanations: [], generatedPrompt: '' },
    medium: { snippet: null, fullAnalysis: null, lineExplanations: [], generatedPrompt: '' },
    advanced: { snippet: null, fullAnalysis: null, lineExplanations: [], generatedPrompt: '' },
  },
  username: 'Developer',
  githubUsername: '',
  avatarUrl: null,
  convertLanguage: '',
  hoveredLine: null,
  toastMessage: null,
  promptInfo: null,
};

// ============================================================
// 🔥 Reducer
// ============================================================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CODE': return { ...state, code: action.payload };
    case 'SET_LANGUAGE': return { ...state, language: action.payload };
    case 'SET_MODE': return { ...state, mode: action.payload };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_CONVERTING': return { ...state, isConverting: action.payload };
    case 'SET_EXPLAINING': return { ...state, isExplaining: action.payload };
    case 'SET_GENERATING_PROMPT': return { ...state, isGeneratingPrompt: action.payload };
    case 'SET_ERROR': return { ...state, errorMessage: action.payload };
    case 'SET_CONVERT_ERROR': return { ...state, convertError: action.payload };
    case 'SET_EXPLAIN_ERROR': return { ...state, explainError: action.payload };
    case 'SET_PROMPT_ERROR': return { ...state, promptError: action.payload };
    case 'SET_OUTPUTS': {
      const newOutputs = { ...state.outputs };
      const payload = action.payload as Partial<OutputsByMode>;
      (Object.keys(payload) as Array<keyof OutputsByMode>).forEach((key) => {
        newOutputs[key] = { ...newOutputs[key], ...payload[key] };
      });
      return { ...state, outputs: newOutputs };
    }
    case 'SET_USERNAME': return { ...state, username: action.payload };
    case 'SET_GITHUB_USERNAME': return { ...state, githubUsername: action.payload };
    case 'SET_AVATAR': return { ...state, avatarUrl: action.payload };
    case 'SET_CONVERT_LANGUAGE': return { ...state, convertLanguage: action.payload };
    case 'SET_HOVERED_LINE': return { ...state, hoveredLine: action.payload };
    case 'SET_TOAST': return { ...state, toastMessage: action.payload };
    case 'SET_PROMPT_INFO': return { ...state, promptInfo: action.payload };
    case 'CLEAR_ALL':
      return {
        ...state,
        code: '',
        language: 'javascript',
        errorMessage: null,
        convertError: null,
        explainError: null,
        promptError: null,
        outputs: {
          simple: { snippet: null, fullAnalysis: null, lineExplanations: [], generatedPrompt: '' },
          medium: { snippet: null, fullAnalysis: null, lineExplanations: [], generatedPrompt: '' },
          advanced: { snippet: null, fullAnalysis: null, lineExplanations: [], generatedPrompt: '' },
        },
        convertLanguage: '',
        hoveredLine: null,
        loading: false,
        isConverting: false,
        isExplaining: false,
        isGeneratingPrompt: false,
        promptInfo: null,
      };
    case 'CLEAR_CURRENT_OUTPUT': {
      const mode = state.mode;
      return {
        ...state,
        errorMessage: null,
        convertError: null,
        explainError: null,
        promptError: null,
        outputs: {
          ...state.outputs,
          [mode]: {
            snippet: null,
            fullAnalysis: null,
            lineExplanations: [],
            generatedPrompt: '',
          }
        },
        convertLanguage: '',
        hoveredLine: null,
      };
    }
    default: return state;
  }
}

// ============================================================
// 🔥 Context
// ============================================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================
// 🔥 Provider
// ============================================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================================
// 🔥 Hook سفارشی برای استفاده از Context
// ============================================================

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}