import type { Ghost } from "../ghost-detection/types.js";
import type { ExorcismProgress } from "./types.js";

function hauntedPaths(progress: ExorcismProgress): Set<string> {
  return new Set(
    progress.ghosts.filter((g) => g.state === "haunted").map((g) => g.path),
  );
}

/** The haunted ghost with the lowest score; ties go to the smallest path. */
export function suggestGhost(
  ghosts: readonly Ghost[],
  progress: ExorcismProgress,
): Ghost | null {
  const haunted = hauntedPaths(progress);
  let best: Ghost | null = null;
  for (const ghost of ghosts) {
    if (!haunted.has(ghost.path)) continue;
    if (
      best === null ||
      ghost.difficultyScore < best.difficultyScore ||
      (ghost.difficultyScore === best.difficultyScore && ghost.path < best.path)
    ) {
      best = ghost;
    }
  }
  return best;
}

/** True only for a haunted ghost that is in the list. */
export function isPickable(
  ghosts: readonly Ghost[],
  progress: ExorcismProgress,
  path: string,
): boolean {
  return (
    ghosts.some((g) => g.path === path) && hauntedPaths(progress).has(path)
  );
}
