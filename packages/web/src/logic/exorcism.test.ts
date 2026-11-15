/// <reference types="node" />
import { readFileSync } from "node:fs";
import { advance, startSession } from "@haunted-repo/core";
import type { SessionState } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import type { UserAction } from "./actions.js";
import { parseDemoScript } from "./demoScript.js";
import type { GhostContent } from "./demoScript.js";
import { buildGhostView, eventFor, readingText } from "./exorcism.js";
import { loadSample } from "../sample/sampleData.js";
import type { SampleData } from "../sample/sampleData.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

function committed(): { sample: SampleData; content: GhostContent } {
  const sample = loadSample(
    readCommitted("../sample/report.json"),
    readCommitted("../sample/files.json"),
  );
  const script = parseDemoScript(readCommitted("../sample/demo-script.json"));
  if (!sample.ok || !script.ok) throw new Error("Committed data is broken.");
  const content = script.value.ghosts[0];
  if (content === undefined) throw new Error("The demo script is empty.");
  return { sample: sample.value, content };
}

const { sample, content } = committed();
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
