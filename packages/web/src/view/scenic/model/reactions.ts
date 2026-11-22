import type { UserAction } from "../../../logic/actions.js";
import type { ViewModel } from "../../../logic/viewModel.js";

// Pure rules of the close-up ghost's Reactions (Requirement 11). No DOM, no
// clock and no randomness: the renderer plays the animation, this file only decides.

export type ReactionKind = "recoil" | "shudder" | "laugh" | "puzzle";

/** How far the ghost has grown (wrong answers) and faded (right answers). */
export interface Vigour {
  grow: 0 | 1 | 2 | 3;
  fade: 0 | 1 | 2 | 3 | 4;
}

export const VIGOUR_START: Vigour = { grow: 0, fade: 0 };

/** Every Reaction ends within 1,000 ms (11.10). */
export const REACTION_MS: Readonly<Record<ReactionKind, number>> = {
  recoil: 400,
  shudder: 500,
  laugh: 600,
  puzzle: 700,
};

/**
 * Only `rate` and `dont-know` start a Reaction (11.2 to 11.5). `self-check`
 * `half` has the same label "Partly" but starts none.
 */
export function reactionFor(action: UserAction): ReactionKind | null {
  if (action.type === "dont-know") return "puzzle";
  if (action.type === "rate") {
    switch (action.rating) {
      case "right":
        return "recoil";
      case "half-right":
        return "shudder";
      case "wrong":
        return "laugh";
    }
  }
  return null;
}

/** "Got it" fades the ghost, "Missed it" grows it, a new attempt resets it (11.2 to 11.5, 11.7). */
export function vigourAfterAction(v: Vigour, action: UserAction): Vigour {
  if (action.type === "start-ghost" || action.type === "retry") {
    return { ...VIGOUR_START };
  }
  if (action.type === "rate") {
    if (action.rating === "right") {
      return { grow: v.grow, fade: Math.min(4, v.fade + 1) as Vigour["fade"] };
    }
    if (action.rating === "wrong") {
      return { grow: Math.min(3, v.grow + 1) as Vigour["grow"], fade: v.fade };
    }
  }
  return { ...v };
}

/** Entering the "failed" step puts the ghost back to full size and opacity (11.6). */
export function vigourAfterRender(
  v: Vigour,
  prev: ViewModel | null,
  next: ViewModel,
): Vigour {
  const entering =
    next.ghost?.step === "failed" && prev?.ghost?.step !== "failed";
  return entering ? { ...VIGOUR_START } : { ...v };
}

/** Scale 1.0 to 1.3 and opacity 1.00 to 0.40 (11.2, 11.4). */
export function vigourStyle(v: Vigour): { scale: number; opacity: number } {
  return {
    scale: Number((1 + 0.1 * v.grow).toFixed(2)),
    opacity: Number((1 - 0.15 * v.fade).toFixed(2)),
  };
}
