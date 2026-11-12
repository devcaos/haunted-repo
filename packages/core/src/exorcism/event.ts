import type { Result } from "../ghost-detection/types.js";
import { fail, ok } from "./errors.js";
import type {
  ExorcismErrorInfo,
  ExorcismEvent,
  ExorcismStep,
  Rating,
  SelfCheck,
} from "./types.js";

/** Events accepted in each step (Requirement 10.4). */
export const ALLOWED_EVENTS: Readonly<
  Record<ExorcismStep, readonly ExorcismEvent["type"][]>
> = {
  choosing: ["pick-ghost"],
  explaining: ["explanation-done", "leave-ghost"],
  asking: ["answer-rated", "dont-know", "leave-ghost"],
  simplifying: ["explanation-done", "leave-ghost"],
  "model-answer": ["explanation-done", "leave-ghost"],
  "self-check": ["self-check-answered"],
  failed: ["retry-ghost", "pick-ghost"],
  "house-clean": [],
};

const RATINGS: readonly string[] = ["right", "half-right", "wrong"];
const SELF_CHECKS: readonly string[] = ["yes", "half", "no"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function invalid(message: string): Result<ExorcismEvent, ExorcismErrorInfo> {
  return fail("INVALID_EVENT", message);
}

/** Validates an unknown value as an event. Copies known fields only. Never throws. */
export function parseEvent(
  raw: unknown,
): Result<ExorcismEvent, ExorcismErrorInfo> {
  try {
    if (!isRecord(raw)) return invalid("The event must be an object.");
    const type = raw["type"];
    switch (type) {
      case "pick-ghost": {
        const path = raw["path"];
        const text = raw["text"];
        if (typeof path !== "string") {
          return invalid('The event "pick-ghost" needs a string "path".');
        }
        if (typeof text !== "string") {
          return invalid('The event "pick-ghost" needs a string "text".');
        }
        return ok({ type, path, text });
      }
      case "explanation-done": {
        const text = raw["text"];
        if (!isNotBlank(text)) {
          return invalid(
            'The event "explanation-done" needs a "text" that is not blank.',
          );
        }
        return ok({ type, text });
      }
      case "answer-rated": {
        const rating = raw["rating"];
        const question = raw["question"];
        if (typeof rating !== "string" || !RATINGS.includes(rating)) {
          return invalid(
            'The event "answer-rated" needs a "rating" of right, half-right or wrong.',
          );
        }
        if (!isNotBlank(question)) {
          return invalid(
            'The event "answer-rated" needs a "question" that is not blank.',
          );
        }
        return ok({ type, rating: rating as Rating, question });
      }
      case "dont-know": {
        const question = raw["question"];
        if (!isNotBlank(question)) {
          return invalid(
            'The event "dont-know" needs a "question" that is not blank.',
          );
        }
        return ok({ type, question });
      }
      case "self-check-answered": {
        const answer = raw["answer"];
        if (typeof answer !== "string" || !SELF_CHECKS.includes(answer)) {
          return invalid(
            'The event "self-check-answered" needs an "answer" of yes, half or no.',
          );
        }
        return ok({ type, answer: answer as SelfCheck });
      }
      case "retry-ghost":
        return ok({ type });
      case "leave-ghost":
        return ok({ type });
      default:
        return invalid("The event has an unknown or missing type.");
    }
  } catch {
    return invalid("The event could not be read.");
  }
}
