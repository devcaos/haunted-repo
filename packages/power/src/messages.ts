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

/** Warning of a run that starts in memory mode (Requirement 7.10). */
export const MEMORY_MODE_WARNING = saveFailedWarning(
  "Kiro gave Haunted Repo no folder it can write to, so your ghosts and progress stay in memory only until Kiro or the Power restarts.",
);

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

/** INVALID_EVENT of pick_ghost when the step does not allow pick-ghost. */
export function pickNotAllowedMessage(step: string): string {
  return `A ghost cannot be picked in the step "${step}". Send one of the allowed events instead.`;
}

/** INVALID_EVENT of pick_ghost for a path that is not a haunted ghost. */
export function notPickableMessage(path: string): string {
  return `"${path}" is not a haunted ghost of this house. Pick one of the haunted ghosts that find_ghosts or house_status lists.`;
}

/** GHOST_TEXT_UNREADABLE (Requirement 3.2): the core message when there is one. */
export function ghostTextUnreadableMessage(
  path: string,
  problem: string | null,
): string {
  const detail = problem ?? `Could not read the file "${path}" from GitHub.`;
  // Some core messages already say when to try again: say it only once.
  const next = /\btry again\b/i.test(detail)
    ? "You can also pick another ghost."
    : "Try again in a moment, or pick another ghost.";
  return `${detail} The ghost stays haunted. ${next}`;
}

export function ghostPickedMessage(path: string): string {
  return `The ghost ${path} is ready. Explain it to the Student now.`;
}

/** INVALID_EVENT of send_event for a type it never sends (Requirement 5.2). */
export function sendEventTypeMessage(type: string): string {
  return `send_event does not send "${type}". It sends only explanation-done, self-check-answered, retry-ghost and leave-ghost; judgements go to judge_answer.`;
}

/** `failed` (Requirement 4.11): the two options of the Engine. */
export const GHOST_FAILED_MESSAGE =
  "The ghost stays haunted for now. Let the Student choose: try the same ghost again after a new explanation (send_event with retry-ghost), or pick another ghost (pick_ghost).";

/** `house-clean` (Requirement 4.12). */
export const HOUSE_CLEAN_MESSAGE =
  "The house is clean: no haunted ghost is left.";

/** The message of an accepted send_event, by the step it leads to. */
export function eventAcceptedMessage(step: string): string {
  switch (step) {
    case "explaining":
      return "Explain the ghost to the Student again, in a new way.";
    case "asking":
      return "Ask the Student the question the instructions describe, then wait for the answer.";
    case "self-check":
      return "The ghost is exorcised. Ask the Student the self-check question.";
    case "choosing":
      return "Let the Student pick the next ghost.";
    case "failed":
      return GHOST_FAILED_MESSAGE;
    case "house-clean":
      return HOUSE_CLEAN_MESSAGE;
    default:
      return "Follow the instructions of this step.";
  }
}

/** INVALID_EVENT of judge_answer outside `asking` (Requirement 5.11). */
export function judgeNotAllowedMessage(step: string): string {
  return `A judgement cannot be sent in the step "${step}". Send one of the allowed events instead.`;
}

/**
 * Verdict_Retry (Requirements 5.4, 5.5): the message of parseVerdict, the
 * four allowed last lines and the tries left. It asks the Tutor, never the
 * Student.
 */
export function verdictRetryMessage(
  problem: string,
  lines: readonly string[],
  triesLeft: number,
): string {
  return [
    `Your judgement was not accepted. ${problem}`,
    "Write the judgement again (do not ask the Student again). Allowed last lines:",
    lines.join(" | "),
    `Tries left: ${triesLeft}.`,
  ].join("\n");
}

/** Verdict_Failure (Requirement 5.6). */
export const VERDICT_FAILED_MESSAGE = [
  "The Tutor could not give a valid verdict for this answer. No rating was recorded.",
  'The step is still "asking". The Student can continue with the same question or leave the ghost.',
].join("\n");

/** The message of an accepted judgement, by the step it leads to. */
export function judgementAcceptedMessage(step: string): string {
  switch (step) {
    case "simplifying":
      return "The Student does not know yet. Give a simpler explanation, then ask the same question again.";
    case "model-answer":
      return "Give the Student a short model answer to the question.";
    case "asking":
      return "Ask the Student the next question the instructions describe, then wait for the answer.";
    default:
      return eventAcceptedMessage(step);
  }
}
