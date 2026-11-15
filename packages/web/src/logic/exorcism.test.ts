/// <reference types="node" />
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { ALLOWED_EVENTS, advance, startSession } from "@haunted-repo/core";
import type {
  ExorcismEvent,
  ExorcismStep,
  SessionState,
} from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { choicesArb } from "../../../core/src/exorcism/sessionArb.testutil.js";
import type { AvailableAction, UserAction } from "./actions.js";
import { parseDemoScript } from "./demoScript.js";
import type { DemoScript, GhostContent } from "./demoScript.js";
import { fullScriptFor } from "./demoScript.testutil.js";
import { buildGhostView, eventFor, readingText } from "./exorcism.js";
import { createPage } from "./page.js";
import type { DetectFn, EngineFns } from "./page.js";
import { createRecordingRenderer } from "./recordingRenderer.testutil.js";
import type { ViewModel } from "./viewModel.js";
import { loadSample } from "../sample/sampleData.js";
import type { SampleData } from "../sample/sampleData.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

function committed(): {
  sample: SampleData;
  script: DemoScript;
  content: GhostContent;
} {
  const sample = loadSample(
    readCommitted("../sample/report.json"),
    readCommitted("../sample/files.json"),
  );
  const script = parseDemoScript(readCommitted("../sample/demo-script.json"));
  if (!sample.ok || !script.ok) throw new Error("Committed data is broken.");
  const content = script.value.ghosts[0];
  if (content === undefined) throw new Error("The demo script is empty.");
  return { sample: sample.value, script: script.value, content };
}

const { sample, script: committedScript, content } = committed();
const text = sample.texts[content.path] ?? "";

/** Sends one action through eventFor and advance; fails the test on a refusal. */
function act(state: SessionState, action: UserAction): SessionState {
  const event = eventFor(action, state, content, text);
  if (event === null) throw new Error(`No event for ${action.type}.`);
  const result = advance(state, event);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function explaining(): SessionState {
  const start = startSession(sample.report).state;
  return act(start, { type: "start-ghost", path: content.path });
}

function asking(): SessionState {
  return act(explaining(), { type: "explanation-continue" });
}

describe("eventFor", () => {
  it("sends the full Ghost_Text in pick-ghost", () => {
    const start = startSession(sample.report).state;
    expect(
      eventFor(
        { type: "start-ghost", path: content.path },
        start,
        content,
        text,
      ),
    ).toEqual({ type: "pick-ghost", path: content.path, text });
  });

  it("maps each rating to answer-rated with the current question", () => {
    const state = asking();
    for (const rating of ["right", "half-right", "wrong"] as const) {
      expect(eventFor({ type: "rate", rating }, state, content, text)).toEqual({
        type: "answer-rated",
        rating,
        question: content.questions[0],
      });
    }
  });

  it("maps each self-check answer to self-check-answered", () => {
    const state = asking();
    for (const answer of ["yes", "half", "no"] as const) {
      expect(
        eventFor({ type: "self-check", answer }, state, content, text),
      ).toEqual({ type: "self-check-answered", answer });
    }
  });

  it("sends the shown reading text in explanation-done", () => {
    const state = explaining();
    const event = eventFor(
      { type: "explanation-continue" },
      state,
      content,
      text,
    );
    expect(event).toEqual({
      type: "explanation-done",
      text: readingText(state, content)?.text,
    });
    expect(buildGhostView(state, content, text, false).reading).toEqual(
      readingText(state, content),
    );
  });

  it("sends no event for show-model-answer and back-to-list", () => {
    const state = asking();
    expect(
      eventFor({ type: "show-model-answer" }, state, content, text),
    ).toBeNull();
    expect(eventFor({ type: "back-to-list" }, state, content, text)).toBeNull();
  });
});

describe("readingText", () => {
  it("shows the first explanation, then the retry explanation after a retry", () => {
    expect(readingText(explaining(), content)).toEqual({
      kind: "explanation",
      text: content.explanation,
    });
    let state = asking();
    for (let i = 0; i < 3; i += 1) {
      state = act(state, { type: "rate", rating: "wrong" });
    }
    expect(state.step).toBe("failed");
    state = act(state, { type: "retry" });
    expect(state.current?.explanation).not.toBe("");
    expect(readingText(state, content)).toEqual({
      kind: "retry-explanation",
      text: content.retryExplanation,
    });
  });

  it("shows the simpler explanation and the model answer of the current question", () => {
    const simplifying = act(asking(), { type: "dont-know" });
    expect(readingText(simplifying, content)).toEqual({
      kind: "simpler",
      text: content.simpler[0],
    });
    const again = act(simplifying, { type: "explanation-continue" });
    const modelAnswer = act(again, { type: "dont-know" });
    expect(readingText(modelAnswer, content)).toEqual({
      kind: "model-answer",
      text: content.modelAnswers[0],
    });
  });
});

describe("buildGhostView", () => {
  it("shows the code and the question in asking, and the answer after reveal", () => {
    const state = asking();
    const view = buildGhostView(state, content, text, false);
    expect(view.code).toBe(text);
    expect(view.licenceNextToCode).toBe(true);
    expect(view.question).toBe(content.questions[0]);
    expect(view.questionNumber).toBe(1);
    expect(view.showAnswerBox).toBe(true);
    expect(view.revealedAnswer).toBeNull();
    expect(buildGhostView(state, content, text, true).revealedAnswer).toBe(
      content.modelAnswers[0],
    );
  });

  it("hides the code and shows the prompt in self-check", () => {
    let state = asking();
    for (let i = 0; i < 3; i += 1) {
      state = act(state, { type: "rate", rating: "right" });
    }
    const view = buildGhostView(state, content, text, false);
    expect(view.step).toBe("self-check");
    expect(view.code).toBeNull();
    expect(view.licenceNextToCode).toBe(false);
    expect(view.reading).toBeNull();
    expect(view.prompt).not.toBeNull();
  });
});

// ---- Property 1: the engine walk through the page controller ----

type WalkAction = Exclude<AvailableAction, { type: "submit-live" }>;

/** The rows of the design table in actions.ts, written apart from ghostActions. */
function expectedGhostActions(
  step: ExorcismStep,
  revealed: boolean,
): AvailableAction[] {
  const leave = { type: "leave-ghost" } as const;
  const next = { type: "explanation-continue" } as const;
  switch (step) {
    case "explaining":
    case "simplifying":
    case "model-answer":
      return [next, leave];
    case "asking":
      return revealed
        ? [
            { type: "rate", rating: "right" },
            { type: "rate", rating: "half-right" },
            { type: "rate", rating: "wrong" },
            { type: "dont-know" },
            leave,
          ]
        : [{ type: "show-model-answer" }, { type: "dont-know" }, leave];
    case "self-check":
      return [
        { type: "self-check", answer: "yes" },
        { type: "self-check", answer: "half" },
        { type: "self-check", answer: "no" },
      ];
    case "failed":
      return [{ type: "retry" }, { type: "back-to-list" }];
    default:
      return [];
  }
}

const CODE_STEPS: readonly ExorcismStep[] = [
  "explaining",
  "asking",
  "simplifying",
  "model-answer",
];

interface AdvanceCall {
  step: ExorcismStep;
  event: unknown; // Core's advance takes unknown; the page sends ExorcismEvent values
  ok: boolean;
  next: ExorcismStep | null;
}

function recordingEngine(calls: AdvanceCall[]): EngineFns {
  return {
    startSession,
    advance: (state, event) => {
      const result = advance(state, event);
      calls.push({
        step: state.step,
        event,
        ok: result.ok,
        next: result.ok ? result.state.step : null,
      });
      return result;
    },
  };
}

function setupWalk(script: DemoScript) {
  const calls: AdvanceCall[] = [];
  const detect = vi.fn<DetectFn>(() => {
    throw new Error("detect must not be called");
  });
  const renderer = createRecordingRenderer();
  const page = createPage(
    {
      detect,
      sample: { ok: true, value: sample },
      script,
      engine: recordingEngine(calls),
    },
    renderer,
  );
  page.start();
  return { page, renderer, calls, detect };
}

/** The checks of P1 on one rendered model. */
function checkModel(model: ViewModel): void {
  if (model.scene.kind === "ghost") {
    const ghost = model.ghost;
    expect(ghost).not.toBeNull();
    if (ghost === null) return;
    expect(model.live.formVisible).toBe(false);
    const revealed = ghost.revealedAnswer !== null;
    expect(model.available).toEqual(expectedGhostActions(ghost.step, revealed));
    expect(ghost.code).toBe(
      CODE_STEPS.includes(ghost.step)
        ? (sample.texts[ghost.path] ?? "missing")
        : null,
    );
    return;
  }
  // P8 link: canStart of a card is true exactly when start-ghost for it is available.
  for (const floor of model.house?.floors ?? []) {
    for (const card of floor.ghosts) {
      expect(
        model.available.some(
          (a) => a.type === "start-ghost" && a.path === card.path,
        ),
      ).toBe(card.canStart);
    }
  }
}

async function walk(script: DemoScript, choices: number[]): Promise<void> {
  const { page, renderer, calls, detect } = setupWalk(script);
  for (const choice of choices) {
    const before = page.current();
    const options = before.available.filter(
      (a): a is WalkAction => a.type !== "submit-live",
    );
    const picked = options[choice % Math.max(options.length, 1)];
    if (picked === undefined) break;
    const callsBefore = calls.length;

    await page.dispatch(picked);

    const after = page.current();
    const newCalls = calls.slice(callsBefore);
    for (const call of newCalls) {
      expect(ALLOWED_EVENTS[call.step]).toContain(
        (call.event as ExorcismEvent).type,
      );
      expect(call.ok).toBe(true);
    }
    if (picked.type === "explanation-continue") {
      expect(newCalls).toHaveLength(1);
      expect(newCalls[0]?.event).toEqual({
        type: "explanation-done",
        text: before.ghost?.reading?.text,
      });
    }
    // Every attempt ends in self-check, in failed, or in choosing after leave-ghost.
    if (before.scene.kind === "ghost" && after.scene.kind !== "ghost") {
      expect(["self-check", "back-to-list", "leave-ghost"]).toContain(
        picked.type,
      );
      if (picked.type === "back-to-list") {
        expect(before.ghost?.step).toBe("failed");
        expect(newCalls).toHaveLength(0);
      }
      if (picked.type === "leave-ghost") {
        expect(newCalls[0]?.next).toBe("choosing");
      }
    }
  }
  for (const model of renderer.models) checkModel(model);
  expect(detect).not.toHaveBeenCalled();
}

describe("engine walk through the page (Property 1)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => {
      throw new Error("network is forbidden in tests");
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the files.json text in pick-ghost", async () => {
    const { page, calls } = setupWalk(committedScript);
    await page.dispatch({ type: "start-ghost", path: content.path });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.event).toEqual({
      type: "pick-ghost",
      path: content.path,
      text: sample.texts[content.path],
    });
  });

  it("accepts every available action with the committed script", async () => {
    // Feature: web-demo, Property 1: Every available action is accepted by the engine
    // **Validates: Requirements 6.5, 6.6, 6.8, 6.9, 6.15, 6.17, 6.20, 6.25, 4.10, 18.3**
    await fc.assert(
      fc.asyncProperty(choicesArb, (choices) => walk(committedScript, choices)),
      { numRuns: 100 },
    );
  });

  it("accepts every available action with a script for every ghost", async () => {
    // Feature: web-demo, Property 1: Every available action is accepted by the engine
    // **Validates: Requirements 6.5, 6.6, 6.8, 6.9, 6.15, 6.17, 6.20, 6.25, 4.10, 18.3**
    const full = fullScriptFor(sample.report);
    await fc.assert(
      fc.asyncProperty(choicesArb, (choices) => walk(full, choices)),
      { numRuns: 100 },
    );
  });
});
