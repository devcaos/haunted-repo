// The strict verdict gate of judge_answer (design section 7). Pure module:
// no SDK, no disk, no session. HauntedPower keeps the count and the state;
// these functions only decide what one judgement means.
import { parseVerdict } from "@haunted-repo/core";
import type { ExorcismEvent, Verdict } from "@haunted-repo/core";

/** The largest number of Verdict_Retries in a row (Requirement 5.4). */
export const MAX_VERDICT_RETRIES = 2;

/** The four last lines parseVerdict accepts, in the order the Tutor sees them. */
export const ALLOWED_VERDICT_LINES = [
  "VERDICT: right",
  "VERDICT: half-right",
  "VERDICT: wrong",
  "VERDICT: dont-know",
] as const;

/** What one judgement means, given the Invalid_Judgement_Count before it. */
export type GateDecision =
  /** parseVerdict accepted the text: the count goes back to 0. */
  | { kind: "accepted"; verdict: Verdict; count: 0 }
  /** Rejected, count at most MAX_VERDICT_RETRIES: ask the Tutor again. */
  | { kind: "retry"; count: number; triesLeft: number; reason: string }
  /** Rejected for the (MAX_VERDICT_RETRIES + 1)th time in a row. */
  | { kind: "failure"; count: number; reason: string };

/**
 * Decides one judgement (Requirements 5.1, 5.2, 5.4, 5.6, 5.7). The text
 * goes to parseVerdict exactly as received: no trim, no search, no default.
 */
export function gateJudgement(judgement: string, count: number): GateDecision {
  const parsed = parseVerdict(judgement);
  if (parsed.ok) {
    return { kind: "accepted", verdict: parsed.value, count: 0 };
  }
  const next = count + 1;
  if (next <= MAX_VERDICT_RETRIES) {
    return {
      kind: "retry",
      count: next,
      triesLeft: MAX_VERDICT_RETRIES + 1 - next,
      reason: parsed.error.message,
    };
  }
  const afterFailure = 0; // Verdict_Failure resets the count (5.6, 5.7).
  return { kind: "failure", count: afterFailure, reason: parsed.error.message };
}

/**
 * The question sent to the Engine (Requirement 4.6): the pendingQuestion
 * when a question is repeated after a Simpler_Explanation, otherwise the
 * Tutor's text.
 */
export function questionFor(
  pendingQuestion: string | null,
  tutorQuestion: string,
): string {
  return pendingQuestion ?? tutorQuestion;
}

/** The Event of an accepted Verdict (Requirement 5.3). */
export function verdictEvent(
  verdict: Verdict,
  question: string,
): ExorcismEvent {
  if (verdict === "dont-know") return { type: "dont-know", question };
  return { type: "answer-rated", rating: verdict, question };
}
