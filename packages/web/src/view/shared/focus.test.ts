/// <reference types="node" />
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserAction } from "../../logic/actions.js";
import { parseDemoScript } from "../../logic/demoScript.js";
import { createPage } from "../../logic/page.js";
import type { DetectFn } from "../../logic/page.js";
import { createRecordingRenderer } from "../../logic/recordingRenderer.testutil.js";
import type { ViewModel } from "../../logic/viewModel.js";
import { loadSample } from "../../sample/sampleData.js";
import { focusAfterRender, focusKeyOf } from "./focus.js";
import type { FocusBefore } from "./focus.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const sample = loadSample(
  readCommitted("../../sample/report.json"),
  readCommitted("../../sample/files.json"),
);
const script = parseDemoScript(readCommitted("../../sample/demo-script.json"));

const EASIEST = "bench/static.js"; // attic, scripted
const OUTSIDE: FocusBefore = { where: "outside" };
const IN_MAIN_NO_KEY: FocusBefore = { where: "main", key: null };

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network is forbidden in tests");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A real controller on the committed data; `step` dispatches and returns the models before and after. */
function setup() {
  if (!script.ok) throw new Error(script.error);
  const detect = vi.fn<DetectFn>(() => {
    throw new Error("detect must not be called");
  });
  const page = createPage(
    { detect, sample, script: script.value },
    createRecordingRenderer(),
  );
  page.start();
  return {
    first: page.current(),
    async step(action: UserAction): Promise<[ViewModel, ViewModel]> {
      const prev = page.current();
      await page.dispatch(action);
      return [prev, page.current()];
    },
  };
}

describe("focusKeyOf", () => {
  it("gives one stable key per action and parameter", () => {
    expect(focusKeyOf({ type: "start-ghost", path: "a/b.js" })).toBe(
      "start-ghost:a/b.js",
    );
    expect(focusKeyOf({ type: "rate", rating: "half-right" })).toBe(
      "rate:half-right",
    );
    expect(focusKeyOf({ type: "self-check", answer: "no" })).toBe(
      "self-check:no",
    );
    expect(focusKeyOf({ type: "go-to-floor", floor: "basement" })).toBe(
      "go-to-floor:basement",
    );
    expect(focusKeyOf({ type: "dont-know" })).toBe("dont-know");
  });
});

describe("focusAfterRender", () => {
  it("keeps focus on the first render", () => {
    const { first } = setup();
    expect(focusAfterRender(null, first, IN_MAIN_NO_KEY)).toEqual({
      kind: "keep",
    });
  });

  it("moves to the panel heading when the panel opens", async () => {
    const page = setup();
    const [prev, next] = await page.step({
      type: "start-ghost",
      path: EASIEST,
    });
    expect(
      focusAfterRender(prev, next, {
        where: "main",
        key: `start-ghost:${EASIEST}`,
      }),
    ).toEqual({ kind: "ghost-heading" });
  });

  it("moves to the panel heading on a new step, a revealed answer and a new question", async () => {
    const page = setup();
    await page.step({ type: "start-ghost", path: EASIEST });
    const pairs = [
      await page.step({ type: "explanation-continue" }), // explaining -> asking
      await page.step({ type: "show-model-answer" }), // same step, answer shown
      await page.step({ type: "rate", rating: "right" }), // question 1 -> 2
    ];
    for (const [prev, next] of pairs) {
      expect(next.ghost?.step).toBe("asking");
      expect(focusAfterRender(prev, next, OUTSIDE)).toEqual({
        kind: "ghost-heading",
      });
    }
  });

  it("re-focuses the same button when the panel screen did not change", async () => {
    const page = setup();
    await page.step({ type: "start-ghost", path: EASIEST });
    const [, asking] = await page.step({ type: "explanation-continue" });
    expect(
      focusAfterRender(asking, asking, { where: "main", key: "dont-know" }),
    ).toEqual({ kind: "key", key: "dont-know" });
    expect(
      focusAfterRender(asking, asking, { where: "main", key: "retry" }),
    ).toEqual({ kind: "ghost-heading" });
    expect(focusAfterRender(asking, asking, IN_MAIN_NO_KEY)).toEqual({
      kind: "ghost-heading",
    });
    expect(focusAfterRender(asking, asking, OUTSIDE)).toEqual({
      kind: "keep",
    });
  });

  it("goes back to the start button of the ghost after leaving it", async () => {
    const page = setup();
    await page.step({ type: "start-ghost", path: EASIEST });
    const [prev, next] = await page.step({ type: "leave-ghost" });
    expect(next.ghost).toBeNull();
    expect(focusAfterRender(prev, next, IN_MAIN_NO_KEY)).toEqual({
      kind: "key",
      key: `start-ghost:${EASIEST}`,
    });
  });

  it("goes to the list heading when the ghost was exorcised", async () => {
    const page = setup();
    await page.step({ type: "start-ghost", path: EASIEST });
    await page.step({ type: "explanation-continue" });
    for (let i = 0; i < 3; i += 1) {
      await page.step({ type: "show-model-answer" });
      await page.step({ type: "rate", rating: "right" });
    }
    const [prev, next] = await page.step({ type: "self-check", answer: "yes" });
    expect(next.ghost).toBeNull();
    expect(focusAfterRender(prev, next, OUTSIDE)).toEqual({
      kind: "list-heading",
    });
  });

  it("on the list, keeps an offered button and otherwise uses the list heading", () => {
    const { first } = setup();
    const startKey = `start-ghost:${EASIEST}`;
    expect(
      focusAfterRender(first, first, { where: "main", key: startKey }),
    ).toEqual({ kind: "key", key: startKey });
    expect(
      focusAfterRender(first, first, { where: "main", key: "show-sample" }),
    ).toEqual({ kind: "list-heading" });
    expect(focusAfterRender(first, first, OUTSIDE)).toEqual({ kind: "keep" });
  });
});
