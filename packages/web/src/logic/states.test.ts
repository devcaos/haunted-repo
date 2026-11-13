/// <reference types="node" />
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSample } from "../sample/sampleData.js";
import type { SampleData } from "../sample/sampleData.js";
import { createPage } from "./page.js";
import type { DetectFn, PageDeps } from "./page.js";
import { createRecordingRenderer } from "./recordingRenderer.testutil.js";
import { TEXTS } from "./texts.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const committed = loadSample(
  readCommitted("../sample/report.json"),
  readCommitted("../sample/files.json"),
);

function sampleData(): SampleData {
  if (!committed.ok) throw new Error(committed.error);
  return committed.value;
}

let fetchCalls = 0;

beforeEach(() => {
  fetchCalls = 0;
  vi.stubGlobal("fetch", () => {
    fetchCalls += 1;
    throw new Error("network is forbidden in tests");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(sample: PageDeps["sample"] = committed) {
  const detect = vi.fn<DetectFn>(() => {
    throw new Error("detect must not be called");
  });
  const renderer = createRecordingRenderer();
  const page = createPage({ detect, sample }, renderer);
  page.start();
  return { page, renderer, detect };
}

describe("page states (PR 1)", () => {
  it("Opening on the sample", () => {
    const { renderer, detect } = setup();
    const report = sampleData().report;
    const model = renderer.last();

    expect(renderer.models).toHaveLength(1);
    expect(model.scene).toEqual({ kind: "house" });
    expect(model.transition).toBeNull();
    expect(model.house?.source).toBe("sample");
    expect(model.house?.floors.map((floor) => floor.floor)).toEqual([
      "attic",
      "middle floor",
      "basement",
    ]);
    const shownPaths = model.house?.floors.flatMap((floor) =>
      floor.ghosts.map((ghost) => ghost.path),
    );
    expect(shownPaths?.sort()).toEqual(
      report.ghosts.map((ghost) => ghost.path).sort(),
    );
    expect(model.ghost).toBeNull();
    expect(model.live).toEqual({ formVisible: true, busy: false });
    expect(model.status).toEqual({ kind: "none", text: "" });
    expect(model.licence).toEqual({
      copyright: sampleData().copyright,
      href: "sirv-license.txt",
      linkText: "Read the MIT licence of lukeed/sirv",
    });
    expect(model.available).toEqual([
      { type: "submit-live" },
      { type: "go-to-floor", floor: "attic" },
      { type: "go-to-floor", floor: "middle floor" },
      { type: "go-to-floor", floor: "basement" },
    ]);
    expect(model.available.some((a) => a.type === "show-sample")).toBe(false);
    expect(detect).not.toHaveBeenCalled();
    expect(fetchCalls).toBe(0);
  });

  it("Floor navigation", async () => {
    const { page, renderer, detect } = setup();
    const opening = renderer.last();

    await page.dispatch({ type: "go-to-floor", floor: "basement" });
    const onFloor = renderer.last();
    expect(onFloor.scene).toEqual({ kind: "floor", floor: "basement" });
    expect(onFloor.transition).toEqual({
      from: { kind: "house" },
      to: { kind: "floor", floor: "basement" },
    });
    expect(onFloor.available).toEqual([
      { type: "submit-live" },
      { type: "go-to-floor", floor: "attic" },
      { type: "go-to-floor", floor: "middle floor" },
      { type: "go-to-house" },
    ]);
    expect(onFloor.house).toEqual(opening.house);

    // The floor in focus is not available: nothing changes, nothing renders.
    await page.dispatch({ type: "go-to-floor", floor: "basement" });
    await page.dispatch({ type: "show-sample" });
    expect(renderer.models).toHaveLength(2);
    expect(page.current()).toEqual(onFloor);

    await page.dispatch({ type: "go-to-house" });
    const back = renderer.last();
    expect(back.scene).toEqual({ kind: "house" });
    expect(back.transition).toEqual({
      from: { kind: "floor", floor: "basement" },
      to: { kind: "house" },
    });
    expect(back.house).toEqual(opening.house);
    expect(back.available).toEqual(opening.available);
    expect(detect).not.toHaveBeenCalled();
    expect(fetchCalls).toBe(0);
  });

  it("Sample broken", async () => {
    const { page, renderer, detect } = setup({ ok: false, error: "broken" });
    const model = renderer.last();

    expect(model.house).toBeNull();
    expect(model.licence).toBeNull();
    expect(model.available).toEqual([]);
    expect(model.status).toEqual({ kind: "error", text: TEXTS.sampleBroken });

    await page.dispatch({ type: "submit-live", url: "https://github.com/o/r" });
    await page.dispatch({ type: "go-to-floor", floor: "attic" });
    expect(renderer.models).toHaveLength(1);
    expect(detect).not.toHaveBeenCalled();
  });
});
