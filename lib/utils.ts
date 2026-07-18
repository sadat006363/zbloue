// lib/utils.ts

/**
 * Safely convert any value to a string
 */
export function safeString(value: unknown): string {
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
}

/**
 * Check if the input looks like source code (not plain text)
 */
export function isCodeLike(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  const codeIndicators = [
    /[{}[\]()]/,
    /function\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /=>/,
    /if\s*\(/,
    /for\s*\(/,
    /while\s*\(/,
    /class\s+\w+/,
    /import\s+/,
    /export\s+/,
    /return\s+/,
    /console\.log/,
    /print\(/,
    /#include/,
    /using\s+namespace/,
    /def\s+\w+\s*\(/,
  ];

  let matches = 0;
  for (const pattern of codeIndicators) {
    if (pattern.test(text)) matches++;
  }
  return matches >= 2;
}

/**
 * Convert a numeric score to a friendly label with emoji and color
 * Used for the beginner-friendly scorecard
 */
export function getScoreLabel(score: number): {
  label: string;
  emoji: string;
  description: string;
  color: string;
} {
  if (score >= 9) {
    return {
      label: 'Excellent!',
      emoji: '🌟',
      description: 'This part is great. Keep it up!',
      color: 'text-green-600',
    };
  }
  if (score >= 7) {
    return {
      label: 'Good',
      emoji: '👍',
      description: 'Well done, but there is room for improvement.',
      color: 'text-blue-600',
    };
  }
  if (score >= 5) {
    return {
      label: 'Needs Work',
      emoji: '📈',
      description: 'This section needs more practice.',
      color: 'text-yellow-600',
    };
  }
  if (score >= 3) {
    return {
      label: 'Fixable',
      emoji: '🔧',
      description: 'There are issues that can be fixed with some attention.',
      color: 'text-orange-600',
    };
  }
  return {
    label: 'Needs Rework',
    emoji: '🚨',
    description: 'This section needs a complete rewrite.',
    color: 'text-red-600',
  };
}

// ============================================================
// 🔥 NEW: Remove comments from source code
// ============================================================

/**
 * Removes comments from source code based on language.
 * Supports: JavaScript, TypeScript, Python, Java, C, C++, C#, Rust, Go, PHP, etc.
 */
export function removeComments(code: string, language: string): string {
  const lines = code.split('\n');
  const result: string[] = [];

  let inMultiLineComment = false;

  for (const line of lines) {
    // Handle multi-line comments for C-style languages (/* ... */)
    if (['javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php'].includes(language)) {
      if (inMultiLineComment) {
        const endIndex = line.indexOf('*/');
        if (endIndex !== -1) {
          const afterComment = line.substring(endIndex + 2);
          inMultiLineComment = false;
          if (afterComment.trim().length > 0) {
            result.push(afterComment);
          }
          continue;
        } else {
          continue;
        }
      }

      const startIndex = line.indexOf('/*');
      if (startIndex !== -1) {
        const endIndex = line.indexOf('*/', startIndex + 2);
        if (endIndex !== -1) {
          const beforeComment = line.substring(0, startIndex);
          const afterComment = line.substring(endIndex + 2);
          const combined = beforeComment + afterComment;
          if (combined.trim().length > 0) {
            result.push(combined);
          }
          continue;
        } else {
          const beforeComment = line.substring(0, startIndex);
          if (beforeComment.trim().length > 0) {
            result.push(beforeComment);
          }
          inMultiLineComment = true;
          continue;
        }
      }

      // Single-line comments (//) - handle strings properly
      let strippedLine = line;
      let inString = false;
      let inChar = false;
      let escape = false;
      for (let i = 0; i < strippedLine.length; i++) {
        const char = strippedLine[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"' && !inChar) {
          inString = !inString;
          continue;
        }
        if (char === "'" && !inString) {
          inChar = !inChar;
          continue;
        }
        if (!inString && !inChar && char === '/' && i + 1 < strippedLine.length && strippedLine[i + 1] === '/') {
          strippedLine = strippedLine.substring(0, i);
          break;
        }
      }
      if (strippedLine.trim().length > 0) {
        result.push(strippedLine);
      }
    } else if (language === 'python') {
      // Python: handle strings and # comments
      let strippedLine = line;
      let inString = false;
      let escape = false;
      for (let i = 0; i < strippedLine.length; i++) {
        const char = strippedLine[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"' || char === "'") {
          inString = !inString;
          continue;
        }
        if (!inString && char === '#') {
          strippedLine = strippedLine.substring(0, i);
          break;
        }
      }
      if (strippedLine.trim().length > 0) {
        result.push(strippedLine);
      }
    } else {
      // Default: keep line as is
      if (line.trim().length > 0) {
        result.push(line);
      }
    }
  }

  return result.join('\n');
}