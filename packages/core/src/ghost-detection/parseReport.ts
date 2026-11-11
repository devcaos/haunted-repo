import { fail, ok } from "./errors.js";
import type { HauntedReport, Result } from "./types.js";

const LANGUAGES = ["TypeScript", "JavaScript", "Java", "Python"];
const FLOORS = ["attic", "middle floor", "basement"];
const SKIP_REASONS = ["TOO_LARGE", "NOT_TEXT"];

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isOneOf(value: unknown, options: string[]): boolean {
  return typeof value === "string" && options.includes(value);
}

function isFactors(value: unknown): boolean {
  return (
    isObj(value) &&
    isCount(value.lines) &&
    isCount(value.branches) &&
    isCount(value.maxIndent) &&
    isCount(value.imports)
  );
}

function isGhost(value: unknown): boolean {
  if (!isObj(value)) return false;
  const score = value.difficultyScore;
  return (
    typeof value.path === "string" &&
    isOneOf(value.language, LANGUAGES) &&
    Number.isInteger(score) &&
    (score as number) >= 0 &&
    (score as number) <= 100 &&
    isOneOf(value.floor, FLOORS) &&
    isFactors(value.factors) &&
    typeof value.reason === "string"
  );
}

function isSkipped(value: unknown): boolean {
  return (
    isObj(value) &&
    typeof value.path === "string" &&
    isOneOf(value.reason, SKIP_REASONS)
  );
}

function isOverview(value: unknown): boolean {
  return (
    isObj(value) &&
    typeof value.owner === "string" &&
    typeof value.repo === "string" &&
    typeof value.ref === "string" &&
    isCount(value.analysed) &&
    isCount(value.picked) &&
    typeof value.truncated === "boolean" &&
    typeof value.fewFiles === "boolean" &&
    typeof value.partial === "boolean" &&
    Array.isArray(value.skipped) &&
    value.skipped.every(isSkipped) &&
    (value.message === null || typeof value.message === "string")
  );
}

function isReport(value: unknown): value is HauntedReport {
  return (
    isObj(value) &&
    isOverview(value.overview) &&
    Array.isArray(value.ghosts) &&
    value.ghosts.every(isGhost)
  );
}

/** Parses the JSON text of a report. Never throws. */
export function parseReport(jsonText: string): Result<HauntedReport> {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return invalid();
  }
  return isReport(data) ? ok(data) : invalid();
}

function invalid(): Result<HauntedReport> {
  return fail(
    "INVALID_REPORT",
    "This text is not a valid Haunted Repo report.",
  );
}
