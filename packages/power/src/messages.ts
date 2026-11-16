// Every English text the Power_Server writes for the Student or the Tutor
// (design section 4). Pure module: no SDK, no disk.

export const NO_SESSION_MESSAGE =
  "There is no exorcism session yet. Call find_ghosts with a public GitHub repository URL, or continue_house to continue a saved house.";

export const INTERNAL_MESSAGE =
  "Something went wrong inside Haunted Repo. Please try again.";

/** REPO_NOT_FOUND (Requirement 2.4): public repositories only, never a token. */
export const REPO_NOT_FOUND_MESSAGE =
  "Repository not found. Haunted Repo only works with public GitHub repositories, so the repository may be private, or the URL may be wrong. Check the URL and try again.";

/** Warning of a partial report (Requirement 2.5). */
export const PARTIAL_WARNING =
  "The ghost list is incomplete: GitHub's rate limit was reached while reading the files. Try again later for the full list.";

/** Added to a refusal when a saved file exists (Requirements 2.7, 7.5). */
const ASK_BEFORE_REPLACE =
  "Ask the Student before calling find_ghosts again with replace: true, which replaces the saved ghosts and progress of this repository.";

export function dataExistsMessage(fileName: string): string {
  return `A saved house already exists for this repository (file "${fileName}"). Use continue_house to continue it. ${ASK_BEFORE_REPLACE}`;
}

export function brokenDataMessage(problem: string): string {
  return `${problem} ${ASK_BEFORE_REPLACE}`;
}

/** NO_DATA: continue_house without a saved file (design section 4). */
export function noDataMessage(fileName: string): string {
  return `There is no saved house for this repository (file "${fileName}"). Call find_ghosts with its URL to find its ghosts.`;
}

export function houseContinuedMessage(owner: string, repo: string): string {
  return `Continuing the saved house of ${owner}/${repo}. Exorcised ghosts stay exorcised; an unfinished attempt starts again.`;
}

export function saveFailedWarning(problem: string): string {
  return `Your progress will not be saved: ${problem}`;
}

/** Text of house_status (Requirement 10.1), e.g. "3 of 5 ghosts still haunt this house." */
export function houseStatusMessage(haunted: number, total: number): string {
  if (haunted === 0) {
    return `No ghost haunts this house any more: all ${total} are exorcised.`;
  }
  const ghosts = total === 1 ? "ghost" : "ghosts";
  const verb = haunted === 1 ? "haunts" : "haunt";
  return `${haunted} of ${total} ${ghosts} still ${verb} this house.`;
}

export function ghostsFoundMessage(
  owner: string,
  repo: string,
  count: number,
  suggested: string | null,
): string {
  const ghosts = count === 1 ? "1 ghost" : `${count} ghosts`;
  const start =
    suggested === null ? "" : ` The easiest one to start with is ${suggested}.`;
  return `Found ${ghosts} in ${owner}/${repo}, from easy to hard.${start}`;
}
