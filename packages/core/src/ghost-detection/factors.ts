import { floorOf } from "./floor.js";
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

function part(value: number, cap: number, weight: number): number {
  return (Math.min(value, cap) / cap) * weight;
}

export function difficultyScore(f: Factors): number {
  return Math.round(
    part(f.lines, 400, 40) +
      part(f.branches, 60, 30) +
      part(f.maxIndent, 8, 20) +
      part(f.imports, 20, 10),
  );
}

type Winner = "lines" | "branches" | "maxIndent" | "imports";

const DECISIONS = "if/elif/for/while/switch/case/catch";

type FloorName = "attic" | "middle floor" | "basement";

const SENTENCES: Record<FloorName, Record<Winner, (f: Factors) => string>> = {
  attic: {
    lines: (f) =>
      `It is easy to read; the part that weighs most is its length (${f.lines} lines of code).`,
    branches: (f) =>
      `It is easy to read; the part that weighs most is the number of decisions it makes (${f.branches} ${DECISIONS}).`,
    maxIndent: (f) =>
      `It is easy to read; the part that weighs most is how nested the code is (${f.maxIndent} levels).`,
    imports: (f) =>
      `It is easy to read; the part that weighs most is the number of other files it depends on (${f.imports} imports).`,
  },
  "middle floor": {
    lines: (f) =>
      `It is of medium difficulty, mostly because it is fairly long (${f.lines} lines of code).`,
    branches: (f) =>
      `It is of medium difficulty, mostly because it makes several decisions (${f.branches} ${DECISIONS}).`,
    maxIndent: (f) =>
      `It is of medium difficulty, mostly because the code is nested (${f.maxIndent} levels).`,
    imports: (f) =>
      `It is of medium difficulty, mostly because it depends on several other files (${f.imports} imports).`,
  },
  basement: {
    lines: (f) =>
      `It is hard, mostly because it is long (${f.lines} lines of code).`,
    branches: (f) =>
      `It is hard, mostly because it makes many decisions (${f.branches} ${DECISIONS}).`,
    maxIndent: (f) =>
      `It is hard, mostly because the code is deeply nested (${f.maxIndent} levels).`,
    imports: (f) =>
      `It is hard, mostly because it depends on many other files (${f.imports} imports).`,
  },
};
export function reasonFor(f: Factors): string {
  const candidates: { points: number; winner: Winner }[] = [
    { points: part(f.lines, 400, 40), winner: "lines" },
    { points: part(f.branches, 60, 30), winner: "branches" },
    { points: part(f.maxIndent, 8, 20), winner: "maxIndent" },
    { points: part(f.imports, 20, 10), winner: "imports" },
  ];
  let best = candidates[0]!;
  for (const c of candidates) {
    if (c.points > best.points) best = c;
  }
  if (best.points === 0)
    return "It is easy to read; it is very short and simple.";
  return SENTENCES[floorOf(difficultyScore(f))][best.winner](f);
}
