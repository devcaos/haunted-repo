import type { Floor, Rating, SelfCheck } from "@haunted-repo/core";
import type { ViewModel } from "./viewModel.js";

// No action carries the Answer_Box text, so the Logic_Layer never receives it (Requirement 6.23).
export type UserAction =
  | { type: "submit-live"; url: string }
  | { type: "show-sample" }
  | { type: "go-to-house" }
  | { type: "go-to-floor"; floor: Floor }
  | { type: "start-ghost"; path: string } // PR 2 from here
  | { type: "explanation-continue" }
  | { type: "show-model-answer" }
  | { type: "rate"; rating: Rating }
  | { type: "dont-know" }
  | { type: "self-check"; answer: SelfCheck }
  | { type: "retry" }
  | { type: "back-to-list" }
  | { type: "leave-ghost" };

/** Same as UserAction, but submit-live is listed without a URL: any URL is allowed. */
export type AvailableAction =
  Exclude<UserAction, { type: "submit-live" }> | { type: "submit-live" };

export type ActionSink = (action: UserAction) => void;

function matches(entry: AvailableAction, action: UserAction): boolean {
  switch (action.type) {
    case "submit-live":
      return entry.type === "submit-live"; // the URL is free
    case "go-to-floor":
      return entry.type === "go-to-floor" && entry.floor === action.floor;
    case "start-ghost":
      return entry.type === "start-ghost" && entry.path === action.path;
    case "rate":
      return entry.type === "rate" && entry.rating === action.rating;
    case "self-check":
      return entry.type === "self-check" && entry.answer === action.answer;
    default:
      return entry.type === action.type;
  }
}

/** True when the action matches an entry of model.available (same type and same parameters; the URL is free). */
export function isAvailable(model: ViewModel, action: UserAction): boolean {
  return model.available.some((entry) => matches(entry, action));
}
