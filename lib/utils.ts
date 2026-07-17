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