/**
 * Safely converts any value to a string for rendering in JSX.
 * If the value is an object, it will be JSON.stringify'd.
 * If the value is null or undefined, returns an empty string.
 */
export const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

/**
 * Checks if the input text is likely to be source code.
 * Uses a combination of keyword detection and symbol ratio analysis.
 * 
 * @param text - The input text to check
 * @returns true if the text appears to be code, false otherwise
 */
export const isCodeLike = (text: string): boolean => {
  // Return false for empty or whitespace-only input
  if (!text || text.trim().length === 0) return false;

  // ===== 1. Common programming keywords =====
  const codeKeywords = [
    // JavaScript / TypeScript
    'function', 'const', 'let', 'var', 'return', 'export', 'import', 'class',
    'console.log', 'async', 'await', 'try', 'catch', 'throw', 'new', 'Promise',
    'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
    'typeof', 'instanceof', 'void', 'delete', 'in', 'of',
    'this', 'super', 'extends', 'implements', 'interface', 'type',
    // Java
    'public', 'private', 'protected', 'static', 'void', 'main',
    'String', 'Integer', 'Boolean', 'List', 'ArrayList', 'HashMap',
    // Python
    'def', 'self', '__init__', 'with', 'open', 'except',
    'True', 'False', 'None', 'elif', 'lambda', 'yield', 'global',
    // Rust
    'fn', 'pub', 'mut', 'println!', 'let', 'match', 'trait', 'impl',
    // Go
    'package', 'func', 'fmt.Println', 'go', 'chan', 'defer',
    'map', 'interface{}', 'nil', 'range',
    // HTML/CSS
    '<html', '<div', '<span', '<p', '<h1', '<h2', '<h3', '<ul', '<li',
    'class=', 'id=', 'style=', 'margin:', 'padding:', 'display:',
    'flex', 'grid', 'position:', 'background:', 'color:', 'font-',
    'width:', 'height:', 'border:', 'box-shadow', 'transform',
    // SQL
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'JOIN',
    'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'GROUP BY',
    'ORDER BY', 'HAVING', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
    // Shell / Bash
    '#!/bin', 'echo', 'export', 'npm', 'pip', 'git', 'sudo', 'apt-get',
    'yarn', 'npx', 'docker', 'kubectl', 'terraform', 'aws',
    // C / C++ / C#
    '#include', '#define', '#ifdef', '#ifndef', '#endif', 'using namespace',
    'printf', 'scanf', 'cout', 'cin', 'std::', 'vector', 'template',
    // PHP
    '<?php', 'echo', 'print_r', 'var_dump', 'function', 'class',
    // Ruby
    'def', 'end', 'puts', 'print', 'require', 'include', 'attr_accessor',
    // Swift
    'let', 'var', 'func', 'print', 'if let', 'guard let', 'class', 'struct',
    // Kotlin
    'fun', 'val', 'var', 'class', 'object', 'when', 'data class',
    // Dart
    'void', 'main', 'class', 'const', 'final', 'var', 'static',
    // R
    'function', 'library', 'require', 'ggplot', 'data.frame',
  ];

  // Convert text to lowercase and check for keywords
  const lowerText = text.toLowerCase();
  const hasKeyword = codeKeywords.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );

  // ===== 2. Special character ratio analysis =====
  // Code contains more special characters like { } ( ) ; = + - * / %
  const specialChars = (text.match(/[{}[\]();=<>+*/%&|^~!?:]/g) || []).length;
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const ratio = letters > 0 ? specialChars / letters : 0;

  // A text with many special characters is likely code
  const hasHighSymbolRatio = ratio > 0.12;

  // ===== 3. Line structure analysis =====
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const hasMultipleLines = lines.length > 2;
  const hasIndentation = lines.some(line => /^\s+/.test(line));

  // ===== 4. Common code patterns =====
  const codePatterns = [
    // Function calls with parentheses and arguments
    /[a-zA-Z_][\w$]*\s*\([^)]*\)/,
    // Assignments with = or += etc.
    /[a-zA-Z_][\w$]*\s*[+\-*/%]?=\s*[^;]+/,
    // Comparison operators
    /[!=]==?\s*[^;]+/,
    // JSON-like structure
    /"[a-zA-Z_][\w$]*"\s*:/,
    // HTML tags with attributes
    /<[a-zA-Z_][\w$]*(?:\s+[a-zA-Z_][\w$]*\s*=\s*["'][^"']*["'])*>/,
  ];

  const hasCodePattern = codePatterns.some(pattern => pattern.test(text));

  // ===== 5. Final decision =====
  return (
    hasKeyword ||
    hasHighSymbolRatio ||
    (hasMultipleLines && hasIndentation) ||
    hasCodePattern
  );
};