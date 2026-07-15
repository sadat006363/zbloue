// lib/languageDetector.ts

type LanguageResult = {
  language: string;
  confidence: 'high' | 'medium' | 'low';
};

export function detectLanguage(code: string): LanguageResult {
  if (!code || code.trim().length === 0) {
    return { language: 'javascript', confidence: 'low' };
  }

  const lines = code.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0] || '';
  const firstFewLines = lines.slice(0, 10).join('\n');

  // === Java ===
  if (/public\s+class\s+\w+/.test(firstFewLines) ||
      /System\.out\.println/.test(firstFewLines) ||
      /public\s+static\s+void\s+main/.test(firstFewLines) ||
      /import\s+java\./.test(firstFewLines)) {
    return { language: 'java', confidence: 'high' };
  }

  // === Python ===
  if (/^def\s+\w+\s*\(/.test(firstFewLines) ||
      /^class\s+\w+\s*:/.test(firstFewLines) ||
      (/^import\s+\w+/.test(firstFewLines) &&
      !/^import\s+java\./.test(firstFewLines) &&
      !/^import\s+react/.test(firstFewLines) &&
      !/^import\s+{/.test(firstFewLines))) {
    return { language: 'python', confidence: 'high' };
  }

  // === TypeScript ===
  if (/: string\b/.test(firstFewLines) ||
      /: number\b/.test(firstFewLines) ||
      /interface\s+\w+/.test(firstFewLines) ||
      /type\s+\w+\s*=/.test(firstFewLines) ||
      (/export\s+(default\s+)?(class|interface|type|function|const)/.test(firstFewLines) &&
      !/export\s+default\s+function/.test(firstFewLines))) {
    return { language: 'typescript', confidence: 'high' };
  }

  // === JavaScript ===
  if (/function\s+\w+\s*\(/.test(firstFewLines) ||
      /const\s+\w+\s*=\s*\(/.test(firstFewLines) ||
      /let\s+\w+\s*=\s*/.test(firstFewLines) ||
      /console\.log/.test(firstFewLines) ||
      /=>/.test(firstFewLines) ||
      (/^import\s+.*from\s+['"]/.test(firstFewLines) &&
      !/^import\s+java\./.test(firstFewLines) &&
      !/^import\s+react/.test(firstFewLines))) {
    return { language: 'javascript', confidence: 'medium' };
  }

  // === Rust ===
  if (/^fn\s+\w+\s*\(/.test(firstFewLines) ||
      /^pub\s+fn/.test(firstFewLines) ||
      /^let\s+mut\s+\w+/.test(firstFewLines) ||
      /println!/.test(firstFewLines)) {
    return { language: 'rust', confidence: 'high' };
  }

  // === Go ===
  if (/^package\s+main/.test(firstFewLines) ||
      (/^func\s+\w+\s*\(/.test(firstFewLines) &&
      !/^fn\s+\w+\s*\(/.test(firstFewLines)) ||
      /fmt\.Println/.test(firstFewLines)) {
    return { language: 'go', confidence: 'high' };
  }

  // === HTML ===
  if (/<!DOCTYPE\s+html/.test(firstFewLines) ||
      /<html/.test(firstFewLines) ||
      /<div/.test(firstFewLines) ||
      /<body/.test(firstFewLines) ||
      /<head/.test(firstFewLines)) {
    return { language: 'html', confidence: 'high' };
  }

  // === CSS ===
  if (/^[.#][\w-]+\s*{/.test(firstFewLines) ||
      /@media/.test(firstFewLines) ||
      /font-family/.test(firstFewLines) ||
      /margin:\s*\d+/.test(firstFewLines) ||
      /padding:\s*\d+/.test(firstFewLines)) {
    return { language: 'css', confidence: 'high' };
  }

  // === Bash ===
  // ===== FIX: استفاده از regex بدون '#!/bin' مستقیم =====
  if (/(^#!\/bin\/)/.test(firstFewLines) ||
      /^echo\s+/.test(firstFewLines) ||
      /^export\s+\w+/.test(firstFewLines) ||
      /^if\s+\[\[/.test(firstFewLines)) {
    return { language: 'bash', confidence: 'high' };
  }

  // === JSON ===
  if (/^\{/.test(firstFewLines) && /\}$/.test(firstFewLines) ||
      /^\[\s*\{/.test(firstFewLines)) {
    return { language: 'json', confidence: 'high' };
  }

  // ===== زبان‌های جدید =====

  // === C ===
  if (/^#include\s+<[^>]+>/.test(firstFewLines) &&
      !/^#include\s+<iostream>/.test(firstFewLines) &&
      !/^#include\s+<vector>/.test(firstFewLines) &&
      !/^#include\s+<string>/.test(firstFewLines)) {
    return { language: 'c', confidence: 'high' };
  }

  // === C++ ===
  if (/^#include\s+<iostream>/.test(firstFewLines) ||
      /^#include\s+<vector>/.test(firstFewLines) ||
      /^#include\s+<string>/.test(firstFewLines) ||
      /using\s+namespace\s+std/.test(firstFewLines) ||
      /std::cout/.test(firstFewLines)) {
    return { language: 'cpp', confidence: 'high' };
  }

  // === C# ===
  if (/using\s+System/.test(firstFewLines) ||
      /namespace\s+\w+\s*{/.test(firstFewLines) ||
      /public\s+class\s+\w+/.test(firstFewLines) ||
      /Console\.WriteLine/.test(firstFewLines)) {
    return { language: 'csharp', confidence: 'high' };
  }

  // === PHP ===
  if (/^<\?php/.test(firstFewLines) ||
      /^<?php/.test(firstFewLines) ||
      /\$[a-zA-Z_][\w]*\s*=/.test(firstFewLines) ||
      /echo\s+['"]/.test(firstFewLines)) {
    return { language: 'php', confidence: 'high' };
  }

  // === Ruby ===
  if (/^def\s+\w+\s*\(/.test(firstFewLines) ||
      /^class\s+\w+/.test(firstFewLines) ||
      /puts\s+['"]/.test(firstFewLines) ||
      /require\s+['"]/.test(firstFewLines)) {
    return { language: 'ruby', confidence: 'high' };
  }

  // === Swift ===
  if (/^import\s+Foundation/.test(firstFewLines) ||
      /^class\s+\w+\s*{/.test(firstFewLines) ||
      /^struct\s+\w+\s*{/.test(firstFewLines) ||
      /print\(/.test(firstFewLines)) {
    return { language: 'swift', confidence: 'high' };
  }

  // === Kotlin ===
  if (/^fun\s+main/.test(firstFewLines) ||
      /^class\s+\w+\s*\(/.test(firstFewLines) ||
      /println\(/.test(firstFewLines) ||
      /^import\s+kotlin\./.test(firstFewLines)) {
    return { language: 'kotlin', confidence: 'high' };
  }

  // === Dart ===
  if (/^void\s+main/.test(firstFewLines) ||
      /^class\s+\w+\s*{/.test(firstFewLines) ||
      /print\(/.test(firstFewLines)) {
    return { language: 'dart', confidence: 'high' };
  }

  // === R ===
  if (/^library\(/.test(firstFewLines) ||
      /^require\(/.test(firstFewLines) ||
      /<-/.test(firstFewLines) ||
      /ggplot/.test(firstFewLines)) {
    return { language: 'r', confidence: 'high' };
  }

  // === SQL ===
  if (/^SELECT\s+.*\s+FROM/i.test(firstFewLines) ||
      /^INSERT\s+INTO/i.test(firstFewLines) ||
      /^UPDATE\s+.*\s+SET/i.test(firstFewLines) ||
      /^CREATE\s+TABLE/i.test(firstFewLines)) {
    return { language: 'sql', confidence: 'high' };
  }

  // === YAML ===
  if (/^[a-zA-Z_][\w-]*:\s*/.test(firstFewLines) ||
      /^-\s+/.test(firstFewLines) ||
      /^---/.test(firstFewLines)) {
    return { language: 'yaml', confidence: 'medium' };
  }

  // === XML ===
  if (/^<\?xml/.test(firstFewLines) ||
      /<[a-zA-Z_][\w]*>/.test(firstFewLines) &&
      /<\/[a-zA-Z_][\w]*>/.test(firstFewLines)) {
    return { language: 'xml', confidence: 'high' };
  }

  // === Markdown ===
  if (/^#{1,6}\s+/.test(firstFewLines) ||
      /^\[.*\]\(.*\)/.test(firstFewLines) ||
      /^```/.test(firstFewLines)) {
    return { language: 'markdown', confidence: 'medium' };
  }

  // === Shell ===
  if (/(^#!\/bin\/)/.test(firstFewLines) ||
      /^echo\s+/.test(firstFewLines) ||
      /^export\s+/.test(firstFewLines) ||
      /^for\s+\w+\s+in/.test(firstFewLines)) {
    return { language: 'shell', confidence: 'high' };
  }

  // === Dockerfile ===
  if (/^FROM\s+/.test(firstFewLines) ||
      /^RUN\s+/.test(firstFewLines) ||
      /^CMD\s+/.test(firstFewLines) ||
      /^COPY\s+/.test(firstFewLines)) {
    return { language: 'dockerfile', confidence: 'high' };
  }

  // === GraphQL ===
  if (/^type\s+\w+\s*{/.test(firstFewLines) ||
      /^query\s+\w+\s*{/.test(firstFewLines) ||
      /^mutation\s+\w+\s*{/.test(firstFewLines)) {
    return { language: 'graphql', confidence: 'high' };
  }

  // === Vue ===
  if (/<template>/.test(firstFewLines) ||
      /<script\s+setup/.test(firstFewLines) ||
      /<style\s+scoped/.test(firstFewLines)) {
    return { language: 'vue', confidence: 'high' };
  }

  // === Svelte ===
  if (/<script\s+lang="ts">/.test(firstFewLines) ||
      /<script\s+context="module">/.test(firstFewLines) ||
      /svelte/.test(firstFewLines)) {
    return { language: 'svelte', confidence: 'medium' };
  }

  // Default fallback
  return { language: 'javascript', confidence: 'low' };
}