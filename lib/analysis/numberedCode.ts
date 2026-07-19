// lib/analysis/numberedCode.ts

export function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  const maxDigits = String(lines.length).length;
  return lines
    .map((line, index) => {
      const lineNum = String(index + 1).padStart(maxDigits, ' ');
      return `${lineNum} | ${line}`;
    })
    .join('\n');
}

export function getLineCount(code: string): number {
  return code.split('\n').length;
}

export function isValidLineRange(
  code: string,
  startLine: number,
  endLine: number
): boolean {
  const totalLines = getLineCount(code);
  return startLine >= 1 && endLine <= totalLines && startLine <= endLine;
}