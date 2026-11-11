import type { Language } from "./types.js";

const LANGUAGE_BY_EXTENSION: Record<string, Language> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".java": "Java",
  ".py": "Python",
};

const EXCLUDED_FOLDERS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "vendor",
  "target",
  "coverage",
  ".git",
  "__pycache__",
  ".next",
]);

const TEST_FOLDERS = new Set(["test", "tests", "__tests__", "spec"]);

function splitPath(path: string): { folders: string[]; name: string } {
  const parts = path.split("/");
  const name = parts.pop() ?? "";
  return { folders: parts, name };
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** Language of a file, from its extension (case-insensitive), or null. */
export function languageOf(path: string): Language | null {
  const { name } = splitPath(path);
  return LANGUAGE_BY_EXTENSION[extensionOf(name)] ?? null;
}

/** True when the file is a supported source file that is worth analysing. */
export function isEligible(path: string): boolean {
  if (languageOf(path) === null) return false;

  const { folders, name } = splitPath(path);
  const lowerFolders = folders.map((f) => f.toLowerCase());
  if (lowerFolders.some((f) => EXCLUDED_FOLDERS.has(f))) return false;

  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(".d.ts") || lowerName.endsWith(".min.js")) {
    return false;
  }
  if (
    lowerName.includes(".generated.") ||
    lowerName.includes(".gen.") ||
    lowerName.includes(".config.")
  ) {
    return false;
  }
  if (lowerName.startsWith(".eslintrc.") || lowerName === "setup.py") {
    return false;
  }

  if (lowerName.includes(".test.") || lowerName.includes(".spec.")) {
    return false;
  }
  if (lowerName.startsWith("test_") || name.endsWith("Test.java")) {
    return false;
  }
  if (lowerFolders.some((f) => TEST_FOLDERS.has(f))) return false;

  return true;
}
