/// <reference types="node" />
import { readFileSync } from "node:fs";
import { advance, detectGhosts, startSession } from "@haunted-repo/core";
import type { HauntedReport, Result } from "@haunted-repo/core";
import { contentOf, parseDemoScript } from "./demoScript.js";
import type { DemoScript, GhostContent } from "./demoScript.js";
import { fullScriptFor } from "./demoScript.testutil.js";
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
import type { ViewModel } from "./viewModel.js";

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

const parsedScript = parseDemoScript(
  readCommitted("../sample/demo-script.json"),
);

function committedScript(): DemoScript {
  if (!parsedScript.ok) throw new Error(parsedScript.error);
  return parsedScript.value;
}

const EASIEST = "bench/static.js"; // attic, scripted
const LOCKED = "packages/sirv-cli/index.js"; // attic, no Ghost_Content

function contentFor(path: string): GhostContent {
  const content = contentOf(committedScript(), path);
  if (content === null) throw new Error(`no content for ${path}`);
  return content;
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
  const page = createPage({ detect, sample, script: null }, renderer);
  page.start();
  return { page, renderer, detect };
}

/** Committed data and committed Demo_Script; Core's engine wrapped to count calls. */
function setupGhost(
  script: DemoScript = committedScript(),
  engine = { startSession: vi.fn(startSession), advance: vi.fn(advance) },
) {
  const detect = vi.fn<DetectFn>(() => {
    throw new Error("detect must not be called");
  });
  const renderer = createRecordingRenderer();
  const page = createPage(
    { detect, sample: committed, script, engine },
    renderer,
  );
  page.start();
  return { page, renderer, detect, engine };
}

/** Real detectGhosts against Core's strict fake GitHub. */
function setupLive(repos: FakeRepo[], options: FakeGitHubOptions = {}) {
  const fake = createFakeFetch(repos, options);
  const detect = vi.fn<DetectFn>((url) =>
    detectGhosts(url, { fetch: fake.fetch }),
  );
  const renderer = createRecordingRenderer();
  const page = createPage(
    { detect, sample: committed, script: null },
    renderer,
  );
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
    const page = createPage(
      { detect, sample: committed, script: committedScript() },
      renderer,
    );
    page.start();
    await page.dispatch({ type: "go-to-floor", floor: "attic" });
    const sampleCards = (model: ViewModel) =>
      model.house?.floors.flatMap((floor) => floor.ghosts) ?? [];
    expect(sampleCards(renderer.last()).some((c) => c.canStart)).toBe(true);

    const running = page.dispatch({ type: "submit-live", url: LIVE_URL });
    const busy = renderer.last();
    // PR 2: while busy, no sample ghost can be started.
    expect(busy.house?.source).toBe("sample");
    for (const card of sampleCards(busy)) expect(card.canStart).toBe(false);
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

function cardOf(model: ViewModel, path: string) {
  return model.house?.floors
    .flatMap((floor) => floor.ghosts)
    .find((card) => card.path === path);
}

describe("page states (PR 2, reading and asking)", () => {
  it("Ghost explaining", async () => {
    const { page, renderer } = setupGhost();
    expect(renderer.last().available).toContainEqual({
      type: "start-ghost",
      path: EASIEST,
    });

    await page.dispatch({ type: "start-ghost", path: EASIEST });
    const model = renderer.last();
    expect(model.scene).toEqual({
      kind: "ghost",
      floor: "attic",
      path: EASIEST,
    });
    expect(model.transition).toEqual({
      from: { kind: "house" },
      to: { kind: "ghost", floor: "attic", path: EASIEST },
    });
    expect(model.live.formVisible).toBe(false);
    expect(model.ghost?.step).toBe("explaining");
    expect(model.ghost?.path).toBe(EASIEST);
    expect(model.ghost?.reading).toEqual({
      kind: "explanation",
      text: contentFor(EASIEST).explanation,
    });
    expect(model.ghost?.code).toBe(sampleData().texts[EASIEST]);
    expect(model.ghost?.licenceNextToCode).toBe(true);
    expect(model.ghost?.judgeLine).toBe(TEXTS.judgeLine);
    expect(model.available).toEqual([
      { type: "explanation-continue" },
      { type: "leave-ghost" },
    ]);
  });

  it("Asking, not revealed", async () => {
    const { page, renderer } = setupGhost();
    await page.dispatch({ type: "start-ghost", path: EASIEST });
    await page.dispatch({ type: "explanation-continue" });
    const ghost = renderer.last().ghost;

    expect(ghost?.step).toBe("asking");
    expect(ghost?.questionNumber).toBe(1);
    expect(ghost?.question).toBe(contentFor(EASIEST).questions[0]);
    expect(ghost?.showAnswerBox).toBe(true);
    expect(ghost?.revealedAnswer).toBeNull();
    expect(ghost?.reading).toBeNull();
    expect(ghost?.code).toBe(sampleData().texts[EASIEST]);
    expect(renderer.last().available).toEqual([
      { type: "show-model-answer" },
      { type: "dont-know" },
      { type: "leave-ghost" },
    ]);
  });

  it("Asking, revealed", async () => {
    const { page, renderer, engine } = setupGhost();
    await page.dispatch({ type: "start-ghost", path: EASIEST });
    await page.dispatch({ type: "explanation-continue" });
    const calls = engine.advance.mock.calls.length;

    await page.dispatch({ type: "show-model-answer" });
    const model = renderer.last();
    expect(engine.advance.mock.calls.length).toBe(calls);
    expect(model.ghost?.step).toBe("asking");
    expect(model.ghost?.questionNumber).toBe(1);
    expect(model.ghost?.revealedAnswer).toBe(
      contentFor(EASIEST).modelAnswers[0],
    );
    expect(model.available).toEqual([
      { type: "rate", rating: "right" },
      { type: "rate", rating: "half-right" },
      { type: "rate", rating: "wrong" },
      { type: "dont-know" },
      { type: "leave-ghost" },
    ]);
  });

  it("Simplifying", async () => {
    const { page, renderer } = setupGhost();
    const content = contentFor(EASIEST);
    await page.dispatch({ type: "start-ghost", path: EASIEST });
    await page.dispatch({ type: "explanation-continue" });

    await page.dispatch({ type: "dont-know" });
    const simpler = renderer.last();
    expect(simpler.ghost?.step).toBe("simplifying");
    expect(simpler.ghost?.reading).toEqual({
      kind: "simpler",
      text: content.simpler[0],
    });
    expect(simpler.ghost?.questionNumber).toBe(1);
    expect(simpler.ghost?.code).toBe(sampleData().texts[EASIEST]);
    expect(simpler.available).toEqual([
      { type: "explanation-continue" },
      { type: "leave-ghost" },
    ]);

    await page.dispatch({ type: "explanation-continue" });
    const again = renderer.last().ghost;
    expect(again?.step).toBe("asking");
    expect(again?.questionNumber).toBe(1);
    expect(again?.question).toBe(content.questions[0]);
    expect(again?.revealedAnswer).toBeNull();
  });

  it("Model answer", async () => {
    const { page, renderer } = setupGhost();
    await page.dispatch({ type: "start-ghost", path: EASIEST });
    await page.dispatch({ type: "explanation-continue" });
    await page.dispatch({ type: "dont-know" });
    await page.dispatch({ type: "explanation-continue" });

    await page.dispatch({ type: "dont-know" });
    const model = renderer.last();
    expect(model.ghost?.step).toBe("model-answer");
    expect(model.ghost?.reading).toEqual({
      kind: "model-answer",
      text: contentFor(EASIEST).modelAnswers[0],
    });
    expect(model.ghost?.questionNumber).toBe(1);
    expect(model.ghost?.code).toBe(sampleData().texts[EASIEST]);
    expect(model.available).toEqual([
      { type: "explanation-continue" },
      { type: "leave-ghost" },
    ]);
  });

  it("Leave", async () => {
    const { page, renderer } = setupGhost();
    await page.dispatch({ type: "start-ghost", path: EASIEST });
    await page.dispatch({ type: "explanation-continue" });

    await page.dispatch({ type: "leave-ghost" });
    const model = renderer.last();
    expect(model.scene).toEqual({ kind: "floor", floor: "attic" });
    expect(model.transition).toEqual({
      from: { kind: "ghost", floor: "attic", path: EASIEST },
      to: { kind: "floor", floor: "attic" },
    });
    expect(model.ghost).toBeNull();
    expect(model.live.formVisible).toBe(true);
    expect(cardOf(model, EASIEST)?.state).toBe("haunted");
    expect(cardOf(model, EASIEST)?.canStart).toBe(true);
    expect(model.available).toContainEqual({
      type: "start-ghost",
      path: EASIEST,
    });
  });

  it("Locked ghost", async () => {
    const { page, renderer, engine } = setupGhost();
    const model = renderer.last();
    const card = cardOf(model, LOCKED);

    expect(card?.state).toBe("locked");
    expect(card?.lockedLine).toBe(POWER_TEXTS.lockedGhost);
    expect(card?.canStart).toBe(false);
    expect(model.available).not.toContainEqual({
      type: "start-ghost",
      path: LOCKED,
    });

    const calls = engine.advance.mock.calls.length;
    await page.dispatch({ type: "start-ghost", path: LOCKED });
    expect(renderer.models).toHaveLength(1);
    expect(engine.advance.mock.calls.length).toBe(calls);
  });
});

type Page = ReturnType<typeof setupGhost>["page"];

/** Starts a ghost and rates its 3 questions (each after the reveal). */
async function rateAll(
  page: Page,
  path: string,
  ratings: readonly ("right" | "half-right" | "wrong")[],
): Promise<void> {
  await page.dispatch({ type: "start-ghost", path });
  await page.dispatch({ type: "explanation-continue" });
  for (const rating of ratings) {
    await page.dispatch({ type: "show-model-answer" });
    await page.dispatch({ type: "rate", rating });
  }
}

const RIGHT = ["right", "right", "right"] as const;
const CORE_WRONG = ["wrong", "right", "right"] as const;

/** A valid Demo_Script with content for every sample ghost (to reach house-clean). */
function fullScript(): DemoScript {
  return fullScriptFor(sampleData().report);
}

describe("page states (PR 2, end states)", () => {
  it("Self-check", async () => {
    const { page, renderer } = setupGhost();
    await rateAll(page, EASIEST, RIGHT);
    const model = renderer.last();

    expect(model.scene).toEqual({
      kind: "ghost",
      floor: "attic",
      path: EASIEST,
    });
    expect(model.ghost?.step).toBe("self-check");
    expect(model.ghost?.prompt).toBe(TEXTS.selfCheck);
    expect(model.ghost?.code).toBeNull();
    expect(model.ghost?.reading).toBeNull();
    expect(model.available).toEqual([
      { type: "self-check", answer: "yes" },
      { type: "self-check", answer: "half" },
      { type: "self-check", answer: "no" },
    ]);
    expect(model.available).not.toContainEqual({ type: "leave-ghost" });
  });

  it("Exorcised", async () => {
    const { page, renderer } = setupGhost();
    const total = sampleData().report.ghosts.length;
    const before = renderer.last().house?.progress;
    expect(before?.haunted).toBe(total);
    await rateAll(page, EASIEST, RIGHT);

    await page.dispatch({ type: "self-check", answer: "yes" });
    const model = renderer.last();
    expect(model.scene).toEqual({ kind: "floor", floor: "attic" });
    expect(model.ghost).toBeNull();
    const card = cardOf(model, EASIEST);
    expect(card?.state).toBe("exorcised");
    expect(card?.canStart).toBe(false);
    expect(card?.lockedLine).toBeNull();
    expect(model.available).not.toContainEqual({
      type: "start-ghost",
      path: EASIEST,
    });
    const progress = model.house?.progress;
    expect(progress?.haunted).toBe(total - 1);
    expect(progress?.total).toBe(total);
    expect(progress?.line).toBe(TEXTS.progress(total - 1, total));
    expect(progress?.share).toBeLessThan(before?.share ?? 0);
    expect(model.house?.houseClean).toBeNull();
  });

  it("Failed", async () => {
    const { page, renderer } = setupGhost();
    await rateAll(page, EASIEST, CORE_WRONG);
    const model = renderer.last();

    expect(model.scene.kind).toBe("ghost");
    expect(model.ghost?.step).toBe("failed");
    expect(model.ghost?.prompt).toBe(TEXTS.stillHaunted);
    expect(model.ghost?.code).toBeNull();
    expect(model.available).toEqual([
      { type: "retry" },
      { type: "back-to-list" },
    ]);
    expect(cardOf(model, EASIEST)?.state).toBe("haunted");
  });

  it("Retry", async () => {
    const { page, renderer } = setupGhost();
    const content = contentFor(EASIEST);
    await rateAll(page, EASIEST, CORE_WRONG);

    await page.dispatch({ type: "retry" });
    const retry = renderer.last();
    expect(retry.ghost?.step).toBe("explaining");
    expect(retry.ghost?.reading).toEqual({
      kind: "retry-explanation",
      text: content.retryExplanation,
    });
    expect(retry.ghost?.code).toBe(sampleData().texts[EASIEST]);

    await page.dispatch({ type: "explanation-continue" });
    for (const [index, question] of content.questions.entries()) {
      const ghost = renderer.last().ghost;
      expect(ghost?.step).toBe("asking");
      expect(ghost?.questionNumber).toBe(index + 1);
      expect(ghost?.question).toBe(question);
      await page.dispatch({ type: "show-model-answer" });
      await page.dispatch({ type: "rate", rating: "right" });
    }
    expect(renderer.last().ghost?.step).toBe("self-check");
  });

  it("Back to the list", async () => {
    const { page, renderer, engine } = setupGhost();
    await rateAll(page, EASIEST, CORE_WRONG);
    const calls = engine.advance.mock.calls.length;

    await page.dispatch({ type: "back-to-list" });
    const model = renderer.last();
    expect(engine.advance.mock.calls.length).toBe(calls);
    expect(model.scene).toEqual({ kind: "floor", floor: "attic" });
    expect(model.ghost).toBeNull();
    expect(model.live.formVisible).toBe(true);
    const card = cardOf(model, EASIEST);
    expect(card?.state).toBe("haunted");
    expect(card?.canStart).toBe(true);
    expect(model.available).toContainEqual({
      type: "start-ghost",
      path: EASIEST,
    });

    // Starting again sends pick-ghost and shows the first explanation.
    await page.dispatch({ type: "start-ghost", path: EASIEST });
    expect(renderer.last().ghost?.reading?.kind).toBe("explanation");
  });

  it("House clean", async () => {
    const { page, renderer } = setupGhost(fullScript());
    const paths = sampleData().report.ghosts.map((ghost) => ghost.path);
    for (const path of paths) {
      await rateAll(page, path, RIGHT);
      await page.dispatch({ type: "self-check", answer: "yes" });
    }
    const model = renderer.last();

    expect(model.scene).toEqual({ kind: "house" });
    expect(model.ghost).toBeNull();
    expect(model.house?.houseClean).toBe(TEXTS.houseClean);
    expect(model.house?.progress?.haunted).toBe(0);
    expect(model.house?.progress?.line).toBe(TEXTS.progress(0, paths.length));
    expect(model.house?.progress?.share).toBe(0);
    for (const path of paths) {
      expect(cardOf(model, path)?.state).toBe("exorcised");
    }
    expect(model.available.some((a) => a.type === "start-ghost")).toBe(false);
  });

  it("Engine error", async () => {
    let fail = false;
    const engine = {
      startSession: vi.fn(startSession),
      advance: vi.fn<typeof advance>((state, event) =>
        fail
          ? {
              ok: false,
              error: { code: "INVALID_EVENT", message: "injected" },
              state,
            }
          : advance(state, event),
      ),
    };
    const { page, renderer } = setupGhost(committedScript(), engine);
    await rateAll(page, EASIEST, RIGHT);
    await page.dispatch({ type: "self-check", answer: "yes" });
    const restarts = engine.startSession.mock.calls.length;

    await page.dispatch({ type: "start-ghost", path: "builder.js" });
    fail = true;
    await page.dispatch({ type: "explanation-continue" });
    const model = renderer.last();
    expect(model.status).toEqual({ kind: "error", text: TEXTS.engineError });
    expect(model.scene).toEqual({ kind: "house" });
    expect(model.ghost).toBeNull();
    expect(engine.startSession.mock.calls.length).toBe(restarts + 1);
    expect(cardOf(model, EASIEST)?.state).toBe("exorcised");
    expect(cardOf(model, "builder.js")?.state).toBe("haunted");
    expect(cardOf(model, "builder.js")?.canStart).toBe(true);
  });

  it("Reload", async () => {
    const first = setupGhost();
    await rateAll(first.page, EASIEST, RIGHT);
    await first.page.dispatch({ type: "self-check", answer: "yes" });
    expect(cardOf(first.renderer.last(), EASIEST)?.state).toBe("exorcised");

    const second = setupGhost();
    const model = second.renderer.last();
    const total = sampleData().report.ghosts.length;
    expect(cardOf(model, EASIEST)?.state).toBe("haunted");
    expect(model.house?.progress?.haunted).toBe(total);
    for (const card of model.house?.floors.flatMap((f) => f.ghosts) ?? []) {
      expect(card.state).not.toBe("exorcised");
    }
  });
});
