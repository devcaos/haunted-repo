import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { UserAction } from "../../../logic/actions.js";
import type { GhostView, ViewModel } from "../../../logic/viewModel.js";
import {
  REACTION_MS,
  VIGOUR_START,
  reactionFor,
  vigourAfterAction,
  vigourAfterRender,
  vigourStyle,
} from "./reactions.js";
import type { Vigour } from "./reactions.js";
import { actionArb } from "./viewModelArb.testutil.js";

/** Only the field vigourAfterRender reads is filled in. */
function modelAtStep(step: GhostView["step"] | null): ViewModel {
  const ghost = step === null ? null : ({ step } as GhostView);
  return { ghost } as ViewModel;
}

describe("reactionFor", () => {
  it("gives a Reaction for the three ratings and for dont-know (11.2 to 11.5)", () => {
    expect(reactionFor({ type: "rate", rating: "right" })).toBe("recoil");
    expect(reactionFor({ type: "rate", rating: "half-right" })).toBe("shudder");
    expect(reactionFor({ type: "rate", rating: "wrong" })).toBe("laugh");
    expect(reactionFor({ type: "dont-know" })).toBe("puzzle");
  });

  it("gives none for self-check half, even though its label is also Partly", () => {
    expect(reactionFor({ type: "self-check", answer: "half" })).toBeNull();
  });

  it("gives none for every other action", () => {
    const others: UserAction[] = [
      { type: "submit-live", url: "x" },
      { type: "show-sample" },
      { type: "go-to-house" },
      { type: "go-to-floor", floor: "attic" },
      { type: "start-ghost", path: "a.js" },
      { type: "explanation-continue" },
      { type: "show-model-answer" },
      { type: "self-check", answer: "yes" },
      { type: "self-check", answer: "no" },
      { type: "retry" },
      { type: "back-to-list" },
      { type: "leave-ghost" },
    ];
    for (const action of others) expect(reactionFor(action)).toBeNull();
  });
});

describe("REACTION_MS", () => {
  it("ends every Reaction within 1000 ms (11.10)", () => {
    for (const ms of Object.values(REACTION_MS)) {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(1000);
    }
  });
});

describe("vigourAfterAction", () => {
  it("fades on Got it, grows on Missed it, and keeps both on Partly", () => {
    const right = vigourAfterAction(VIGOUR_START, {
      type: "rate",
      rating: "right",
    });
    expect(right).toEqual({ grow: 0, fade: 1 });
    const wrong = vigourAfterAction(right, { type: "rate", rating: "wrong" });
    expect(wrong).toEqual({ grow: 1, fade: 1 });
    expect(
      vigourAfterAction(wrong, { type: "rate", rating: "half-right" }),
    ).toEqual(wrong);
    expect(vigourAfterAction(wrong, { type: "dont-know" })).toEqual(wrong);
  });

  it("stops at the limits", () => {
    let v: Vigour = VIGOUR_START;
    for (let i = 0; i < 10; i += 1) {
      v = vigourAfterAction(v, { type: "rate", rating: "right" });
      v = vigourAfterAction(v, { type: "rate", rating: "wrong" });
    }
    expect(v).toEqual({ grow: 3, fade: 4 });
    expect(vigourStyle(v)).toEqual({ scale: 1.3, opacity: 0.4 });
  });

  it("does not change the Vigour it receives", () => {
    const v: Vigour = { grow: 1, fade: 1 };
    vigourAfterAction(v, { type: "rate", rating: "right" });
    vigourAfterAction(v, { type: "retry" });
    expect(v).toEqual({ grow: 1, fade: 1 });
  });
});

describe("vigourAfterRender", () => {
  const worn: Vigour = { grow: 2, fade: 3 };

  it("resets on entering failed (11.6)", () => {
    expect(
      vigourAfterRender(worn, modelAtStep("asking"), modelAtStep("failed")),
    ).toEqual(VIGOUR_START);
    expect(vigourAfterRender(worn, null, modelAtStep("failed"))).toEqual(
      VIGOUR_START,
    );
    expect(
      vigourAfterRender(worn, modelAtStep(null), modelAtStep("failed")),
    ).toEqual(VIGOUR_START);
  });

  it("keeps the Vigour while failed stays and in every other step", () => {
    expect(
      vigourAfterRender(worn, modelAtStep("failed"), modelAtStep("failed")),
    ).toEqual(worn);
    expect(
      vigourAfterRender(worn, modelAtStep("asking"), modelAtStep("asking")),
    ).toEqual(worn);
    expect(
      vigourAfterRender(worn, modelAtStep("asking"), modelAtStep("self-check")),
    ).toEqual(worn);
    expect(vigourAfterRender(worn, null, modelAtStep(null))).toEqual(worn);
  });
});

describe("vigourStyle", () => {
  it("gives scale 1 + 0.1 x grow and opacity 1 - 0.15 x fade", () => {
    expect(vigourStyle(VIGOUR_START)).toEqual({ scale: 1, opacity: 1 });
    expect(vigourStyle({ grow: 2, fade: 3 })).toEqual({
      scale: 1.2,
      opacity: 0.55,
    });
  });
});

describe("Properties", () => {
  // Feature: scenic-web, Property 14: The close-up ghost stays within its size and opacity limits
  // **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.7**
  it("Property 14: The close-up ghost stays within its size and opacity limits", () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 40 }), (actions) => {
        let v: Vigour = VIGOUR_START;
        for (const action of actions) {
          const before = vigourStyle(v);
          const after = vigourAfterAction(v, action);
          const style = vigourStyle(after);
          expect(style.opacity).toBeGreaterThanOrEqual(0.4);
          expect(style.opacity).toBeLessThanOrEqual(1);
          expect(style.scale).toBeGreaterThanOrEqual(1);
          expect(style.scale).toBeLessThanOrEqual(1.3);
          if (action.type === "rate" && action.rating === "right") {
            expect(style.opacity).toBeLessThanOrEqual(before.opacity);
            if (before.opacity > 0.4) {
              expect(style.opacity).toBeLessThan(before.opacity);
            }
            expect(style.scale).toBe(before.scale);
          } else if (action.type === "rate" && action.rating === "wrong") {
            expect(style.scale).toBeGreaterThanOrEqual(before.scale);
            if (before.scale < 1.3) {
              expect(style.scale).toBeGreaterThan(before.scale);
            }
            expect(style.opacity).toBe(before.opacity);
          } else if (action.type === "start-ghost" || action.type === "retry") {
            expect(style).toEqual({ scale: 1, opacity: 1 });
          } else {
            expect(style).toEqual(before);
          }
          v = after;
        }
      }),
      { numRuns: 100 },
    );
  });
});
