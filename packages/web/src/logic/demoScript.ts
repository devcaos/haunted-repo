import type { FileKind, Result } from "@haunted-repo/core";

export interface GhostContent {
  path: string;
  kind: FileKind; // must equal classifyFileKind(text, language); checked by a test
  explanation: string;
  retryExplanation: string;
  questions: [string, string, string]; // follow QUESTION_SETS[kind] in order
  simpler: [string, string, string]; // one per question
  modelAnswers: [string, string, string]; // one per question
}

export interface DemoScript {
  ghosts: GhostContent[];
}

const FILE_KINDS: readonly FileKind[] = [
  "data-shape",
  "logic",
  "entry-point",
  "general",
];

const CONTENT_KEYS = [
  "path",
  "kind",
  "explanation",
  "retryExplanation",
  "questions",
  "simpler",
  "modelAnswers",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isThreeTexts(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every(isText);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => key in value);
}

/** The error for one entry, or null when the entry is complete. */
function contentError(entry: unknown, index: number): string | null {
  const where = `Demo script entry ${index + 1}`;
  if (!isPlainObject(entry) || !hasExactKeys(entry, CONTENT_KEYS)) {
    return `${where} has the wrong shape.`;
  }
  if (!isText(entry.path)) return `${where} has a blank path.`;
  if (!FILE_KINDS.includes(entry.kind as FileKind)) {
    return `${where} has an unknown kind.`;
  }
  if (!isText(entry.explanation) || !isText(entry.retryExplanation)) {
    return `${where} has a blank explanation.`;
  }
  if (!isThreeTexts(entry.questions)) {
    return `${where} needs exactly 3 non-blank questions.`;
  }
  if (new Set(entry.questions).size !== 3) {
    return `${where} repeats a question.`;
  }
  if (!isThreeTexts(entry.simpler)) {
    return `${where} needs exactly 3 non-blank simpler explanations.`;
  }
  if (!isThreeTexts(entry.modelAnswers)) {
    return `${where} needs exactly 3 non-blank model answers.`;
  }
  return null;
}

/** Strict, never throws. Each Ghost_Content: every text non-blank, exactly 3 of each list, the 3 questions different, kind valid, no repeated path. */
export function parseDemoScript(jsonText: string): Result<DemoScript, string> {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "The demo script is not valid JSON." };
  }
  if (
    !isPlainObject(data) ||
    !hasExactKeys(data, ["ghosts"]) ||
    !Array.isArray(data.ghosts)
  ) {
    return { ok: false, error: "The demo script has the wrong shape." };
  }
  const entries: unknown[] = data.ghosts;
  const paths = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const error = contentError(entry, index);
    if (error !== null) return { ok: false, error };
    const { path } = entry as GhostContent;
    if (paths.has(path)) {
      return { ok: false, error: `The demo script repeats the path ${path}.` };
    }
    paths.add(path);
  }
  return { ok: true, value: { ghosts: entries as GhostContent[] } };
}

export function contentOf(
  script: DemoScript | null,
  path: string,
): GhostContent | null {
  return script?.ghosts.find((ghost) => ghost.path === path) ?? null;
}
