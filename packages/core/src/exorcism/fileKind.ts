import { measureFactors } from "../ghost-detection/factors.js";
import type { Language } from "../ghost-detection/types.js";
import type { FileKind } from "./types.js";

const MAX_LINE_LENGTH = 500;

interface LanguagePatterns {
  entryMarkers: string[];
  functionLike: RegExp[];
  typeDeclaration: RegExp[];
}

const TS_JS_FUNCTION_LIKE = [
  /\bfunction\b/,
  /=>/,
  /^\s*(public|private|protected|static|async)\s+\w+.*\(/,
];

const PATTERNS: Record<Language, LanguagePatterns> = {
  TypeScript: {
    entryMarkers: ["process.argv", "createServer(", ".listen(", "createRoot("],
    functionLike: TS_JS_FUNCTION_LIKE,
    typeDeclaration: [/^(export\s+)?(declare\s+)?(interface|type|enum)\s+\w+/],
  },
  JavaScript: {
    entryMarkers: ["process.argv", "createServer(", ".listen(", "createRoot("],
    functionLike: TS_JS_FUNCTION_LIKE,
    typeDeclaration: [],
  },
  Java: {
    entryMarkers: ["public static void main("],
    functionLike: [
      /^\s*(?:(?:public|private|protected|static|final|abstract|synchronized)\s+)*(?!(?:else|return|new|throw)\b)[\w<>[\],.?]+\s+\w+\s*\([^)]*\)\s*(?:throws\s+[\w., ]+)?\{\s*$/,
    ],
    typeDeclaration: [/\b(record|enum|interface)\s+\w+/],
  },
  Python: {
    entryMarkers: ['if __name__ == "__main__"', "if __name__ == '__main__'"],
    functionLike: [/^\s*(async\s+)?def\s+\w+/],
    typeDeclaration: [
      /^\s*@dataclass/,
      /^\s*class\s+\w+\s*\(.*\b(TypedDict|NamedTuple|Enum)\b.*\)/,
    ],
  },
};

const IMPORT_LINE = /^(import\b|from\s+\S+\s+import\b)/;
const REEXPORT_LINE = /^export\b.*\bfrom\b/;
const TS_TYPE_LINE = /^(export\s+)?type\s/;
const PROPERTY_SIGNATURE = /^(readonly\s+)?[\w$]+\??\s*:\s*\(.*\)\s*=>/;

// Same comment rule as measureFactors in ghost detection.
function isCommentLine(trimmed: string): boolean {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*")
  );
}

function codeLinesOf(text: string): string[] {
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const result: string[] = [];
  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.slice(0, MAX_LINE_LENGTH);
    const trimmed = line.trim();
    if (trimmed === "" || isCommentLine(trimmed)) continue;
    result.push(line);
  }
  return result;
}

function isFunctionLike(line: string, language: Language): boolean {
  const trimmed = line.trim();
  const isTs = language === "TypeScript";
  const ignoreArrow =
    isTs && (TS_TYPE_LINE.test(trimmed) || PROPERTY_SIGNATURE.test(trimmed));
  for (const pattern of PATTERNS[language].functionLike) {
    if (ignoreArrow && pattern.source === "=>") continue;
    if (pattern.test(line)) return true;
  }
  return false;
}

/** Deterministic, tunable guess of what kind of file this is. */
export function classifyFileKind(text: string, language: Language): FileKind {
  const factors = measureFactors(text);
  if (factors.lines === 0) return "general";

  const patterns = PATTERNS[language];
  const lines = codeLinesOf(text);
  const trimmedLines = lines.map((l) => l.trim());

  const hasMarker = lines.some((l) =>
    patterns.entryMarkers.some((m) => l.includes(m)),
  );
  const isBarrel =
    trimmedLines.length > 0 &&
    trimmedLines.every((l) => IMPORT_LINE.test(l) || REEXPORT_LINE.test(l));
  if (hasMarker || isBarrel) return "entry-point";

  const hasFunction = lines.some((l) => isFunctionLike(l, language));
  const hasType = trimmedLines.some((l) =>
    patterns.typeDeclaration.some((p) => p.test(l)),
  );
  if (factors.branches === 0 && !hasFunction && hasType) return "data-shape";
  if (hasFunction) return "logic";
  return "general";
}
