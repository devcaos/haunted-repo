/// <reference types="node" />
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserAction } from "../../../logic/actions.js";
import { parseDemoScript } from "../../../logic/demoScript.js";
import { createPage } from "../../../logic/page.js";
import type { DetectFn } from "../../../logic/page.js";
import { createRecordingRenderer } from "../../../logic/recordingRenderer.testutil.js";
import type { ViewModel } from "../../../logic/viewModel.js";
import { loadSample } from "../../../sample/sampleData.js";
import { focusAfterRender } from "../../shared/focus.js";
import type { FocusBefore } from "../../shared/focus.js";
import { sceneLayout } from "./sceneLayout.js";
import { scenicFocusAfterRender } from "./scenicFocus.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const sample = loadSample(
  readCommitted("../../../sample/report.json"),
  readCommitted("../../../sample/files.json"),
);
const script = parseDemoScript(
  readCommitted("../../../sample/demo-script.json"),
);
const EASIEST = "bench/static.js"; // attic, scripted
const IN_MAIN: FocusBefore = { where: "main", key: null };

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

function focusFor(
  prev: ViewModel | null,
  next: ViewModel,
  before: FocusBefore,
) {
  return scenicFocusAfterRender(prev, next, before, sceneLayout(next));
}

describe("scenicFocusAfterRender (Requirements 17.7, 17.8)", () => {
  it("goes to the Scene_Heading from the house to a floor", async () => {
    const page = setup();
    const [prev, next] = await page.step({
      type: "go-to-floor",
      floor: "attic",
    });
    expect(next.transition).not.toBeNull();
    expect(focusFor(prev, next, IN_MAIN)).toEqual({ kind: "scene-heading" });
  });

  it("goes to the start button of the ghost when leaving it", async () => {
    const page = setup();
    await page.step({ type: "go-to-floor", floor: "attic" });
    await page.step({ type: "start-ghost", path: EASIEST });
    const [prev, next] = await page.step({ type: "leave-ghost" });
    expect(next.transition?.from.kind).toBe("ghost");
    expect(focusFor(prev, next, IN_MAIN)).toEqual({
      kind: "key",
      key: `start-ghost:${EASIEST}`,
    });
  });

  it("goes to the Scene_Heading after an exorcism, when the ghost has no start control", async () => {
    const page = setup();
    await page.step({ type: "go-to-floor", floor: "attic" });
    await page.step({ type: "start-ghost", path: EASIEST });
    await page.step({ type: "explanation-continue" });
    for (let i = 0; i < 3; i += 1) {
      await page.step({ type: "show-model-answer" });
      await page.step({ type: "rate", rating: "right" });
    }
    const [prev, next] = await page.step({ type: "self-check", answer: "yes" });
    expect(next.transition?.from.kind).toBe("ghost");
    expect(sceneLayout(next).startControls).not.toContain(EASIEST);
    expect(focusFor(prev, next, IN_MAIN)).toEqual({ kind: "scene-heading" });
  });

  it("follows the shared rule when there is no transition", async () => {
    const page = setup();
    const [, floor] = await page.step({
      type: "go-to-floor",
      floor: "attic",
    });
    // The same Scene drawn again: no transition.
    const same: ViewModel = { ...floor, transition: null };
    for (const before of [
      { where: "outside" },
      IN_MAIN,
      { where: "main", key: `start-ghost:${EASIEST}` },
    ] satisfies FocusBefore[]) {
      const shared = focusAfterRender(floor, same, before);
      const expected =
        shared.kind === "ghost-heading" || shared.kind === "list-heading"
          ? { kind: "scene-heading" }
          : shared;
      expect(focusFor(floor, same, before)).toEqual(expected);
    }
  });

  it("keeps focus on the first render", () => {
    const { first } = setup();
    expect(first.transition).toBeNull();
    expect(focusFor(null, first, IN_MAIN)).toEqual({ kind: "keep" });
  });
});
