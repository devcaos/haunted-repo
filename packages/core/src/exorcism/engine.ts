import type { Ghost, HauntedReport } from "../ghost-detection/types.js";
import { buildInstructions } from "./instructions.js";
import { normaliseProgress } from "./progress.js";
import { suggestGhost } from "./suggest.js";
import type {
  ExorcismProgress,
  Rating,
  SessionState,
  StudentProfile,
  TutorInstructions,
} from "./types.js";

export interface StartOptions {
  progress?: ExorcismProgress;
  profile?: StudentProfile;
}

/** Keeps the first ghost of each path, in report order, and copies it. */
function dedupeByPath(ghosts: readonly Ghost[]): Ghost[] {
  const seen = new Set<string>();
  const result: Ghost[] = [];
  for (const ghost of ghosts) {
    if (seen.has(ghost.path)) continue;
    seen.add(ghost.path);
    result.push({ ...ghost, factors: { ...ghost.factors } });
  }
  return result;
}

export function startSession(
  report: HauntedReport,
  options?: StartOptions,
): { state: SessionState; instructions: TutorInstructions } {
  const ghosts = dedupeByPath(report.ghosts);
  const progress = normaliseProgress(ghosts, options?.progress ?? null);
  const state: SessionState = {
    step: suggestGhost(ghosts, progress) === null ? "house-clean" : "choosing",
    profile: { knowsJava: options?.profile?.knowsJava ?? false },
    ghosts,
    progress,
    asked: {},
    current: null,
  };
  return { state, instructions: buildInstructions(state) };
}

/** True (exorcised) iff at least 2 ratings are good and the Core_Question (first) is not wrong. */
export function decide(ratings: readonly Rating[]): boolean {
  const good = ratings.filter((r) => r !== "wrong").length;
  return good >= 2 && ratings[0] !== "wrong";
}
