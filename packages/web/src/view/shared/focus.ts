import type { AvailableAction } from "../../logic/actions.js";
import type { GhostView, ViewModel } from "../../logic/viewModel.js";

/**
 * Where keyboard focus was just before a render. `main` means inside the part
 * the renderer rebuilds; `key` is the focus key of that element, or null when
 * it has none (for example the Code_Block).
 */
export type FocusBefore =
  { where: "outside" } | { where: "main"; key: string | null };

/** Where the renderer puts keyboard focus after a render. */
export type FocusTarget =
  | { kind: "keep" } // do nothing: focus is outside the rebuilt part
  | { kind: "ghost-heading" } // heading of the Exorcism_Panel
  | { kind: "list-heading" } // heading of the Ghost_List
  | { kind: "key"; key: string }; // the element with this focus key

/** A stable key for the button of an action, the same in every render. */
export function focusKeyOf(action: AvailableAction): string {
  switch (action.type) {
    case "go-to-floor":
      return `go-to-floor:${action.floor}`;
    case "start-ghost":
      return `start-ghost:${action.path}`;
    case "rate":
      return `rate:${action.rating}`;
    case "self-check":
      return `self-check:${action.answer}`;
    default:
      return action.type;
  }
}

/** What the judge sees in the panel: a new value means a new screen. */
function screenOf(ghost: GhostView): string {
  return [
    ghost.path,
    ghost.step,
    String(ghost.questionNumber),
    String(ghost.revealedAnswer !== null),
  ].join("\n");
}

function hasKey(model: ViewModel, key: string): boolean {
  return model.available.some((action) => focusKeyOf(action) === key);
}

/**
 * Decides where focus goes after `next` is drawn, so it never falls back to
 * <body> when the element that had it is rebuilt or removed (Requirements 6.7, 12.1).
 *
 * - First render, or focus outside the rebuilt part: keep.
 * - A new panel screen (panel opens, new step, new question, model answer shown): panel heading.
 * - Leaving the panel: the start button of that ghost if it is still offered, else the list heading.
 * - Same screen: the same button if it is still offered, else the heading of what is shown.
 */
export function focusAfterRender(
  prev: ViewModel | null,
  next: ViewModel,
  before: FocusBefore,
): FocusTarget {
  if (prev === null) return { kind: "keep" };

  if (next.ghost !== null) {
    if (prev.ghost === null || screenOf(prev.ghost) !== screenOf(next.ghost)) {
      return { kind: "ghost-heading" };
    }
  } else if (prev.ghost !== null) {
    const startKey = `start-ghost:${prev.ghost.path}`;
    return hasKey(next, startKey)
      ? { kind: "key", key: startKey }
      : { kind: "list-heading" };
  }

  if (before.where === "outside") return { kind: "keep" };
  if (before.key !== null && hasKey(next, before.key)) {
    return { kind: "key", key: before.key };
  }
  return next.ghost !== null
    ? { kind: "ghost-heading" }
    : { kind: "list-heading" };
}
