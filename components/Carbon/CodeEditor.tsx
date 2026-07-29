// components/Carbon/CodeEditor.tsx
'use client';

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { EditorView } from '@codemirror/view';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  theme: string;
  fontSize: number;
  showLineNumbers: boolean;
}

const languageExtensions: Record<string, any> = {
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  python: python(),
  html: html(),
  css: css(),
  java: java(),
  rust: rust(),
  go: go(),
  cpp: javascript(), // fallback
  php: javascript(), // fallback
  ruby: javascript(), // fallback
};

export function CodeEditor({
  code,
  onChange,
  language,
  theme,
  fontSize,
  showLineNumbers,
}: CodeEditorProps) {
  // CodeMirror تم‌های Shiki را مستقیماً پشتیبانی نمی‌کند،
  // اما می‌توانیم از کلاس‌های CSS برای استایل‌دهی استفاده کنیم.
  // برای تم، از کلاس‌های dark/light استفاده می‌کنیم.
  const isDark = theme.includes('dark') || theme.includes('dracula') || theme.includes('nord') || theme.includes('monokai') || theme.includes('material') || theme.includes('vitesse-dark') || theme.includes('rose-pine') || theme.includes('slack-dark');

  return (
    <div className={`h-full overflow-hidden ${isDark ? 'bg-[#1e1e2e]' : 'bg-[#fafafa]'}`}>
      <CodeMirror
        value={code}
        height="100%"
        extensions={[
          languageExtensions[language] || javascript(),
          EditorView.lineWrapping,
        ]}
        onChange={onChange}
        theme={isDark ? 'dark' : 'light'}
        basicSetup={{
          lineNumbers: showLineNumbers,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: true,
          tabSize: 2,
        }}
        style={{
          fontSize: `${fontSize}px`,
          height: '100%',
        }}
      />
    </div>
  );
}