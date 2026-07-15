import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;

export const getHighlighterInstance = async () => {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['dark-plus'],
      langs: [
        'javascript',
        'typescript',
        'python',
        'java',
        'rust',
        'go',
        'html',
        'css',
        'json',
        'bash',
        // ===== زبان‌های جدید =====
        'c',              // C
        'cpp',            // C++
        'csharp',         // C#
        'php',            // PHP
        'ruby',           // Ruby
        'swift',          // Swift
        'kotlin',         // Kotlin
        'dart',           // Dart
        'r',              // R
        'sql',            // SQL
        'yaml',           // YAML
        'toml',           // TOML
        'xml',            // XML
        'markdown',       // Markdown
        'shell',          // Shell Script
        'powershell',     // PowerShell
        'dockerfile',     // Dockerfile
        'graphql',        // GraphQL
        'vue',            // Vue.js
        'svelte',         // Svelte
      ],
    });
  }
  return highlighter;
};

export const highlightCode = async (code: string, language: string) => {
  const shiki = await getHighlighterInstance();
  return shiki.codeToHtml(code, { lang: language, theme: 'dark-plus' });
};