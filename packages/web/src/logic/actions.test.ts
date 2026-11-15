import { ALLOWED_EVENTS } from "@haunted-repo/core";
import type { ExorcismStep, SessionState } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import { isAvailable } from "./actions.js";
import type { AvailableAction } from "./actions.js";
import type { GhostContent } from "./demoScript.js";
import { eventFor, ghostActions } from "./exorcism.js";
import type { ViewModel } from "./viewModel.js";

function modelWith(available: AvailableAction[]): ViewModel {
  return {
    scene: { kind: "house" },
    transition: null,
    house: null,
    ghost: null,
    live: { formVisible: true, busy: false },
    status: { kind: "none", text: "" },
    licence: null,
    available,
  };
}

describe("isAvailable", () => {
  it("accepts any URL for submit-live", () => {
    const model = modelWith([{ type: "submit-live" }]);
    expect(isAvailable(model, { type: "submit-live", url: "" })).toBe(true);
    expect(
      isAvailable(model, {
        type: "submit-live",
        url: "https://github.com/lukeed/sirv",
      }),
    ).toBe(true);
  });

  it("needs the same floor for go-to-floor", () => {
    const model = modelWith([{ type: "go-to-floor", floor: "attic" }]);
    expect(isAvailable(model, { type: "go-to-floor", floor: "attic" })).toBe(
      true,
    );
    expect(isAvailable(model, { type: "go-to-floor", floor: "basement" })).toBe(
      false,
    );
  });

  it("needs the same path for start-ghost", () => {
    const model = modelWith([{ type: "start-ghost", path: "src/a.ts" }]);
    expect(isAvailable(model, { type: "start-ghost", path: "src/a.ts" })).toBe(
      true,
    );
    expect(isAvailable(model, { type: "start-ghost", path: "src/b.ts" })).toBe(
      false,
    );
  });

  it("needs the same rating for rate", () => {
    const model = modelWith([{ type: "rate", rating: "right" }]);
    expect(isAvailable(model, { type: "rate", rating: "right" })).toBe(true);
    expect(isAvailable(model, { type: "rate", rating: "wrong" })).toBe(false);
  });

  it("needs the same answer for self-check", () => {
    const model = modelWith([{ type: "self-check", answer: "half" }]);
    expect(isAvailable(model, { type: "self-check", answer: "half" })).toBe(
      true,
    );
    expect(isAvailable(model, { type: "self-check", answer: "yes" })).toBe(
      false,
    );
  });

  it("needs the same type for actions without parameters", () => {
    const model = modelWith([{ type: "show-sample" }]);
    expect(isAvailable(model, { type: "show-sample" })).toBe(true);
    expect(isAvailable(model, { type: "go-to-house" })).toBe(false);
  });

  it("rejects everything when nothing is available", () => {
    const model = modelWith([]);
    expect(isAvailable(model, { type: "submit-live", url: "x" })).toBe(false);
    expect(isAvailable(model, { type: "show-sample" })).toBe(false);
    expect(isAvailable(model, { type: "go-to-floor", floor: "attic" })).toBe(
      false,
    );
    expect(isAvailable(model, { type: "start-ghost", path: "a" })).toBe(false);
    expect(isAvailable(model, { type: "leave-ghost" })).toBe(false);
  });
});

describe("ghostActions", () => {
  const STEPS: readonly ExorcismStep[] = [
    "choosing",
    "explaining",
    "asking",
    "simplifying",
    "model-answer",
    "self-check",
    "failed",
    "house-clean",
  ];
  const content: GhostContent = {
    path: "a.js",
    kind: "logic",
    explanation: "First explanation.",
    retryExplanation: "Retry explanation.",
    questions: ["Q1?", "Q2?", "Q3?"],
    simpler: ["S1.", "S2.", "S3."],
    modelAnswers: ["A1.", "A2.", "A3."],
  };

  function stateAt(step: ExorcismStep): SessionState {
    return {
      step,
      profile: { knowsJava: false },
      ghosts: [],
      progress: { ghosts: [] },
      asked: {},
      current: {
        path: "a.js",
        text: "code",
        kind: "logic",
        explanation: "",
        simpler: [],
        attemptStart: 0,
        questionIndex: 0,
        dontKnowCount: 0,
        pendingQuestion: null,
        ratings: [],
      },
    };
  }

  it("maps every action of every step to an allowed event or to null", () => {
    for (const step of STEPS) {
      for (const revealed of [false, true]) {
        for (const available of ghostActions(step, revealed)) {
          const action = available as Exclude<
            AvailableAction,
            { type: "submit-live" }
          >;
          const event = eventFor(action, stateAt(step), content, "code");
          if (event !== null) {
            expect(ALLOWED_EVENTS[step]).toContain(event.type);
          } else {
            expect(["show-model-answer", "back-to-list"]).toContain(
              action.type,
            );
          }
        }
      }
    }
  });

  it("offers no ghost action outside a ghost", () => {
    expect(ghostActions("choosing", false)).toEqual([]);
    expect(ghostActions("house-clean", true)).toEqual([]);
  });
});
