import type { Factors } from "./types.js";

const MAX_LINE_LENGTH = 500;
const BRANCH_PATTERN = /\b(if|elif|for|while|switch|case|catch)\b/g;
const IMPORT_PATTERN = /^(import\b|from\s+\S+\s+import\b)/;

function isCommentLine(trimmed: string): boolean {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*")
  );
}

function indentOf(line: string): number {
  let tabs = 0;
  let spaces = 0;
  for (const ch of line) {
    if (ch === "\t") tabs++;
    else if (ch === " ") spaces++;
    else break;
  }
  return tabs + Math.floor(spaces / 4);
}

export function measureFactors(text: string): Factors {
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const factors: Factors = { lines: 0, branches: 0, maxIndent: 0, imports: 0 };

  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.slice(0, MAX_LINE_LENGTH);
    const trimmed = line.trim();
    if (trimmed === "") continue;

    factors.maxIndent = Math.max(factors.maxIndent, indentOf(line));
    if (IMPORT_PATTERN.test(trimmed) || trimmed.includes("require(")) {
      factors.imports++;
    }
    if (isCommentLine(trimmed)) continue;

    factors.lines++;
    factors.branches += trimmed.match(BRANCH_PATTERN)?.length ?? 0;
  }

  return factors;
}
