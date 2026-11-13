/// <reference types="node" />
import { readFileSync } from "node:fs";
import { detectGhosts } from "@haunted-repo/core";
import type { HauntedReport, Result } from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFetch } from "./fakeDetect.testutil.js";
import type { FakeGitHubOptions, FakeRepo } from "./fakeDetect.testutil.js";
import { POWER_TEXTS } from "./powerTexts.js";
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

/** Real detectGhosts against Core's strict fake GitHub. */
function setupLive(repos: FakeRepo[], options: FakeGitHubOptions = {}) {
  const fake = createFakeFetch(repos, options);
  const detect = vi.fn<DetectFn>((url) =>
    detectGhosts(url, { fetch: fake.fetch }),
  );
  const renderer = createRecordingRenderer();
  const page = createPage({ detect, sample: committed }, renderer);
  page.start();
  return { page, renderer, detect, fake };
}

const ts = (n: number): string => "const a = 1;\n".repeat(n);

function repoWith(files: FakeRepo["files"], truncated = false): FakeRepo {
  return { owner: "o", repo: "r", files, truncated };
}

const threeGhosts = repoWith({
  "src/a.ts": ts(30),
  "src/b.ts": ts(60),
  "src/c.ts": ts(90),
});

const LIVE_URL = "https://github.com/o/r";

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

  it("Live analysis running", async () => {
    let finish: (result: Result<HauntedReport>) => void = () => undefined;
    const pending = new Promise<Result<HauntedReport>>((resolve) => {
      finish = resolve;
    });
    const detect = vi.fn<DetectFn>(() => pending);
    const renderer = createRecordingRenderer();
    const page = createPage({ detect, sample: committed }, renderer);
    page.start();
    await page.dispatch({ type: "go-to-floor", floor: "attic" });

    const running = page.dispatch({ type: "submit-live", url: LIVE_URL });
    const busy = renderer.last();
    expect(busy.live.busy).toBe(true);
    expect(busy.status).toEqual({ kind: "busy", text: TEXTS.busy });
    const types = busy.available.map((a) => a.type);
    expect(types).not.toContain("submit-live");
    expect(types).not.toContain("show-sample");
    expect(types).not.toContain("start-ghost");
    expect(busy.scene).toEqual({ kind: "floor", floor: "attic" });

    // A second submit while busy is ignored.
    const count = renderer.models.length;
    await page.dispatch({ type: "submit-live", url: LIVE_URL });
    expect(renderer.models).toHaveLength(count);
    expect(detect).toHaveBeenCalledTimes(1);

    finish({ ok: false, error: { code: "NETWORK_ERROR", message: "down" } });
    await running;
    expect(renderer.last().live.busy).toBe(false);
    expect(renderer.last().available[0]).toEqual({ type: "submit-live" });
  });

  it("Live list", async () => {
    const { page, renderer, detect, fake } = setupLive([threeGhosts]);
    await page.dispatch({ type: "submit-live", url: LIVE_URL });
    const model = renderer.last();

    expect(detect).toHaveBeenCalledWith(LIVE_URL);
    expect(model.scene).toEqual({ kind: "house" });
    expect(model.live.busy).toBe(false);
    expect(model.house?.source).toBe("live");
    expect(model.house?.repoName).toBe("o/r");
    expect(model.house?.powerLine).toBe(POWER_TEXTS.liveReport);
    expect(model.house?.progress).toBeNull();
    const cards = model.house?.floors.flatMap((floor) => floor.ghosts) ?? [];
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.state).toBe("haunted");
      expect(card.canStart).toBe(false);
    }
    expect(model.status).toEqual({
      kind: "done",
      text: "Found 3 ghosts in o/r.",
    });
    expect(model.available).toContainEqual({ type: "show-sample" });
    expect(fake.requestCount()).toBeGreaterThan(0);
    expect(fetchCalls).toBe(0);

    const one = setupLive([repoWith({ "src/a.ts": ts(30) })]);
    await one.page.dispatch({ type: "submit-live", url: LIVE_URL });
    expect(one.renderer.last().status.text).toBe("Found 1 ghost in o/r.");
  });

  it("Message error", async () => {
    const { page, renderer } = setupLive([threeGhosts]);
    await page.dispatch({ type: "go-to-floor", floor: "basement" });
    const before = renderer.last();

    await page.dispatch({
      type: "submit-live",
      url: "https://github.com/o/missing",
    });
    const model = renderer.last();
    expect(model.status.kind).toBe("error");
    const expected = await detectGhosts("https://github.com/o/missing", {
      fetch: createFakeFetch([threeGhosts]).fetch,
    });
    expect(expected.ok ? null : expected.error.code).toBe("REPO_NOT_FOUND");
    expect(model.status.text).toBe(expected.ok ? "" : expected.error.message);
    expect(model.house).toEqual(before.house);
    expect(model.scene).toEqual(before.scene);
    expect(model.live.busy).toBe(false);
  });

  it("Fallback", async () => {
    const { page, renderer } = setupLive([threeGhosts], { rateLimitAfter: 0 });
    await page.dispatch({ type: "go-to-floor", floor: "attic" });

    await page.dispatch({ type: "submit-live", url: LIVE_URL });
    const model = renderer.last();
    expect(model.house?.source).toBe("sample");
    expect(model.scene).toEqual({ kind: "house" });
    expect(model.status).toEqual({ kind: "fallback", text: TEXTS.fallback });
    expect(model.live.busy).toBe(false);
    expect(fetchCalls).toBe(0);
  });

  it("Show the sample again", async () => {
    const { page, renderer } = setupLive([threeGhosts]);
    await page.dispatch({ type: "submit-live", url: LIVE_URL });
    await page.dispatch({ type: "go-to-floor", floor: "attic" });

    await page.dispatch({ type: "show-sample" });
    const model = renderer.last();
    expect(model.house?.source).toBe("sample");
    expect(model.house?.powerLine).toBeNull();
    expect(model.scene).toEqual({ kind: "house" });
    expect(model.transition).toEqual({
      from: { kind: "floor", floor: "attic" },
      to: { kind: "house" },
    });
    expect(model.status).toEqual({ kind: "none", text: "" });
    expect(model.available.some((a) => a.type === "show-sample")).toBe(false);
  });

  it("Report warnings", async () => {
    const binary = new Uint8Array(30_000).fill(0xff);
    const repo = repoWith(
      { "src/index.ts": binary, "src/a.ts": ts(30), "src/b.ts": ts(60) },
      true,
    );
    const { page, renderer } = setupLive([repo]);
    await page.dispatch({ type: "submit-live", url: LIVE_URL });
    const warnings = renderer.last().house?.warnings;

    expect(renderer.last().house?.source).toBe("live");
    expect(warnings?.lines).toContain(TEXTS.truncated);
    expect(warnings?.lines).not.toContain(TEXTS.partial);
    expect(warnings?.skippedTitle).toBe(TEXTS.skippedTitle);
    expect(warnings?.skipped).toEqual([
      { path: "src/index.ts", reason: TEXTS.skippedReason.NOT_TEXT },
    ]);
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
