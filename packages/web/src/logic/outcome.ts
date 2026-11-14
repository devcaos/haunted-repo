import type { ErrorCode } from "@haunted-repo/core";

/** What the page does with a Core error: show its message, or fall back to the sample. */
export type Outcome = "show-message" | "fallback";

/** One outcome per Core error code. A missing code is a compile error. */
export const OUTCOME_BY_CODE: Readonly<Record<ErrorCode, Outcome>> = {
  INVALID_URL: "show-message",
  REPO_NOT_FOUND: "show-message",
  EMPTY_REPO: "show-message",
  NO_SUPPORTED_FILES: "show-message",
  RATE_LIMITED: "fallback",
  NETWORK_ERROR: "fallback",
  INVALID_REPORT: "fallback", // detectGhosts never returns it (Requirement 5.3)
};

export function outcomeOf(code: ErrorCode): Outcome {
  return OUTCOME_BY_CODE[code];
}
