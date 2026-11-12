import type { Ghost, Result } from "../ghost-detection/types.js";
import { fail, ok } from "./errors.js";
import type {
  ExorcismErrorInfo,
  ExorcismProgress,
  GhostProgress,
  Rating,
  SelfCheck,
} from "./types.js";

const RATINGS: readonly string[] = ["right", "half-right", "wrong"];
const SELF_CHECKS: readonly string[] = ["yes", "half", "no"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns an English problem description, or null when the entry is valid. */
function entryProblem(entry: unknown, index: number): string | null {
  const where = `ghosts[${index}]`;
  if (!isRecord(entry)) return `${where} must be an object.`;
  if (typeof entry["path"] !== "string")
    return `${where}.path must be a string.`;
  if (entry["state"] !== "haunted" && entry["state"] !== "exorcised") {
    return `${where}.state must be "haunted" or "exorcised".`;
  }
  const ratings = entry["ratings"];
  if (
    !Array.isArray(ratings) ||
    (ratings.length !== 0 && ratings.length !== 3)
  ) {
    return `${where}.ratings must be a list of 0 or 3 ratings.`;
  }
  if (!ratings.every((r) => typeof r === "string" && RATINGS.includes(r))) {
    return `${where}.ratings must only contain "right", "half-right" or "wrong".`;
  }
  const selfCheck = entry["selfCheck"];
  if (
    selfCheck !== null &&
    !(typeof selfCheck === "string" && SELF_CHECKS.includes(selfCheck))
  ) {
    return `${where}.selfCheck must be "yes", "half", "no" or null.`;
  }
  return null;
}

function progressProblem(value: unknown): string | null {
  if (!isRecord(value)) return "The progress must be an object.";
  const ghosts = value["ghosts"];
  if (!Array.isArray(ghosts)) return "The progress must have a ghosts list.";
  const seen = new Set<string>();
  for (const [index, entry] of ghosts.entries()) {
    const problem = entryProblem(entry, index);
    if (problem !== null) return problem;
    const path = (entry as GhostProgress).path;
    if (seen.has(path)) return `The path "${path}" appears more than once.`;
    seen.add(path);
  }
  return null;
}

/** Type guard for an Exorcism_Progress value (used by parseRecording too). */
export function isExorcismProgress(value: unknown): value is ExorcismProgress {
  return progressProblem(value) === null;
}

export function normaliseProgress(
  ghosts: readonly Ghost[],
  progress: ExorcismProgress | null,
): ExorcismProgress {
  const known = new Map<string, GhostProgress>();
  for (const entry of progress?.ghosts ?? []) {
    if (!known.has(entry.path)) known.set(entry.path, entry);
  }
  return {
    ghosts: ghosts.map((ghost) => {
      const entry = known.get(ghost.path);
      if (entry === undefined) {
        return {
          path: ghost.path,
          state: "haunted",
          ratings: [],
          selfCheck: null,
        };
      }
      return {
        path: entry.path,
        state: entry.state,
        ratings: [...entry.ratings] as Rating[],
        selfCheck: entry.selfCheck as SelfCheck | null,
      };
    }),
  };
}

export function parseProgress(
  jsonText: string,
): Result<ExorcismProgress, ExorcismErrorInfo> {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return fail("INVALID_PROGRESS", "The progress is not valid JSON text.");
  }
  const problem = progressProblem(raw);
  if (problem !== null) return fail("INVALID_PROGRESS", problem);
  const value = raw as ExorcismProgress;
  return ok({
    ghosts: value.ghosts.map((g) => ({
      path: g.path,
      state: g.state,
      ratings: [...g.ratings],
      selfCheck: g.selfCheck,
    })),
  });
}

export function formatProgress(progress: ExorcismProgress): string {
  return JSON.stringify(progress);
}

/** Share of ghosts still haunted, from 0 to 1. It is 0 when there are no ghosts. */
export function hauntedShare(
  report: { readonly ghosts: readonly Ghost[] },
  progress: ExorcismProgress | null,
): number {
  if (report.ghosts.length === 0) return 0;
  const normalised = normaliseProgress(report.ghosts, progress);
  const haunted = normalised.ghosts.filter((g) => g.state === "haunted").length;
  return haunted / normalised.ghosts.length;
}
