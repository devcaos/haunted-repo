/// <reference types="node" />
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailableAction } from "../../../logic/actions.js";
import { parseDemoScript } from "../../../logic/demoScript.js";
import { fromAvailable } from "./viewModelArb.testutil.js";
import { createPage } from "../../../logic/page.js";
import { createRecordingRenderer } from "../../../logic/recordingRenderer.testutil.js";
import { TEXTS } from "../../../logic/texts.js";
import type { ViewModel } from "../../../logic/viewModel.js";
import { loadSample } from "../../../sample/sampleData.js";
import { grimoireView } from "./grimoireView.js";
import type { GrimoireBlock } from "./grimoireView.js";

function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

beforeEach(() => {
  // A controller must never reach the network in a unit test.
  vi.stubGlobal("fetch", () => {
    throw new Error("fetch is not allowed in unit tests");
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const sample = loadSample(
  read("../../../sample/report.json"),
  read("../../../sample/files.json"),
);
const script = parseDemoScript(read("../../../sample/demo-script.json"));

/** The type of each block, in order. */
function kinds(blocks: GrimoireBlock[]): string[] {
  return blocks.map((block) => block.kind);
}

/** Each strategy lists the actions it prefers, first match wins. */
const STRATEGIES: string[][] = [
  ["explanation-continue", "show-model-answer", "rate:right", "self-check:yes"],
  ["explanation-continue", "dont-know", "show-model-answer"],
  ["explanation-continue", "show-model-answer", "rate:wrong", "retry"],
  ["explanation-continue", "show-model-answer", "rate:right", "self-check:no"],
  ["explanation-continue", "dont-know", "explanation-continue", "leave-ghost"],
];

function nameOf(entry: AvailableAction): string {
  if (entry.type === "rate") return `rate:${entry.rating}`;
  if (entry.type === "self-check") return `self-check:${entry.answer}`;
  return entry.type;
}

/**
 * Plays the real page on the committed sample and script, opening the first
 * startable ghost and following one strategy. Returns every ghost model.
 */
async function walk(strategy: string[]): Promise<ViewModel[]> {
  if (!sample.ok || !script.ok) throw new Error("the committed data is bad");
  const renderer = createRecordingRenderer();
  const page = createPage(
    {
      detect: () => Promise.reject(new Error("no network in tests")),
      sample,
      script: script.value,
    },
    renderer,
  );
  page.start();
  const start = page
    .current()
    .available.find((entry) => entry.type === "start-ghost");
  if (start === undefined) throw new Error("no ghost can be started");
  await page.dispatch(fromAvailable(start));
  const seen: ViewModel[] = [];
  for (let i = 0; i < 40; i += 1) {
    const model = page.current();
    if (model.scene.kind !== "ghost") break;
    seen.push(model);
    const entry = strategy
      .map((name) => model.available.find((e) => nameOf(e) === name))
      .find((e) => e !== undefined);
    if (entry === undefined) break;
    await page.dispatch(fromAvailable(entry));
  }
  return seen;
}

/** The ghost models of every strategy, with one more step each. */
async function committedGhostModels(): Promise<ViewModel[]> {
  const all: ViewModel[] = [];
  for (const strategy of STRATEGIES) all.push(...(await walk(strategy)));
  return all;
}

describe("grimoireView", () => {
  it("is null outside the Ghost_Scene", async () => {
    if (!sample.ok) throw new Error(sample.error);
    const renderer = createRecordingRenderer();
    createPage(
      {
        detect: () => Promise.reject(new Error("no network in tests")),
        sample,
        script: null,
      },
      renderer,
    ).start();
    expect(grimoireView(renderer.last())).toBeNull();
  });

  it("reaches every ghost step with the committed script", async () => {
    const steps = new Set(
      (await committedGhostModels()).map((model) => model.ghost?.step),
    );
    for (const step of [
      "explaining",
      "asking",
      "simplifying",
      "model-answer",
      "self-check",
      "failed",
    ]) {
      expect(steps.has(step as never), step).toBe(true);
    }
  });

  it("shows the texts, titles and Answer_Box of every step (10.2, 10.3)", async () => {
    for (const model of await committedGhostModels()) {
      const ghost = model.ghost;
      const view = grimoireView(model);
      if (ghost === null || view === null) throw new Error("no ghost");
      expect(view.heading).toBe(TEXTS.ghostHeading(ghost.path));
      const find = (kind: GrimoireBlock["kind"]): GrimoireBlock | undefined =>
        view.blocks.find((block) => block.kind === kind);
      expect(find("judge-line")).toEqual({
        kind: "judge-line",
        text: ghost.judgeLine,
      });
      const reading = find("reading");
      if (ghost.reading === null) expect(reading).toBeUndefined();
      else
        expect(reading).toEqual({
          kind: "reading",
          title: TEXTS.readingTitles[ghost.reading.kind],
          text: ghost.reading.text,
        });
      const question = find("question");
      if (ghost.question === null) expect(question).toBeUndefined();
      else
        expect(question).toEqual({
          kind: "question",
          title: TEXTS.questionTitle(ghost.questionNumber ?? 0),
          text: ghost.question,
        });
      const revealed = find("revealed");
      if (ghost.revealedAnswer === null) expect(revealed).toBeUndefined();
      else
        expect(revealed).toEqual({
          kind: "revealed",
          title: TEXTS.revealedTitle,
          text: ghost.revealedAnswer,
        });
      const prompt = find("prompt");
      if (ghost.prompt === null) expect(prompt).toBeUndefined();
      else expect(prompt).toEqual({ kind: "prompt", text: ghost.prompt });
      const box = find("answer-box");
      if (ghost.showAnswerBox)
        expect(box).toMatchObject({
          kind: "answer-box",
          label: TEXTS.answerLabel,
        });
      else expect(box).toBeUndefined();
    }
  });

  it("shows the whole code, and the licence right after it (10.6, 10.7, 25.5)", async () => {
    let withCode = 0;
    let withoutCode = 0;
    for (const model of await committedGhostModels()) {
      const ghost = model.ghost;
      const view = grimoireView(model);
      if (ghost === null || view === null) throw new Error("no ghost");
      const index = view.blocks.findIndex((block) => block.kind === "code");
      if (ghost.code === null) {
        withoutCode += 1;
        expect(index).toBe(-1);
        expect(kinds(view.blocks)).not.toContain("licence");
        continue;
      }
      withCode += 1;
      expect(view.blocks[index]).toEqual({ kind: "code", text: ghost.code });
      expect(model.licence).not.toBeNull();
      expect(ghost.licenceNextToCode).toBe(true);
      expect(view.blocks[index + 1]).toEqual({
        kind: "licence",
        licence: model.licence,
      });
      expect(index + 2).toBe(view.blocks.length);
    }
    expect(withCode).toBeGreaterThan(0);
    expect(withoutCode).toBeGreaterThan(0);
  });

  it("lights the candles by the step (10.9)", async () => {
    const seen = new Set<string>();
    for (const model of await committedGhostModels()) {
      const ghost = model.ghost;
      const view = grimoireView(model);
      if (ghost === null || view === null) throw new Error("no ghost");
      const n = ghost.questionNumber ?? 0;
      const expected =
        ghost.step === "asking" || ghost.step === "simplifying"
          ? n - 1
          : ghost.step === "model-answer"
            ? n
            : ghost.step === "self-check"
              ? 3
              : 0;
      expect(view.litCandles, ghost.step).toBe(expected);
      seen.add(`${ghost.step}:${String(expected)}`);
    }
    // Question 2 and 3 are reached too, so the counts 0 to 3 all appear.
    expect(seen.has("asking:0")).toBe(true);
    expect(seen.has("asking:1")).toBe(true);
    expect(seen.has("self-check:3")).toBe(true);
    expect(seen.has("explaining:0")).toBe(true);
    expect(seen.has("failed:0")).toBe(true);
  });

  it("builds the Answer_Box key from the path and the question number (10.10)", async () => {
    let boxes = 0;
    for (const model of await committedGhostModels()) {
      const ghost = model.ghost;
      const box = grimoireView(model)?.blocks.find(
        (block) => block.kind === "answer-box",
      );
      if (ghost === null) throw new Error("no ghost");
      if (box?.kind !== "answer-box") continue;
      boxes += 1;
      expect(box.key).toBe(`${ghost.path}\n${String(ghost.questionNumber)}`);
    }
    expect(boxes).toBeGreaterThan(0);
  });

  it("gives another key for another question or another path (10.10)", () => {
    const base = {
      kind: "ghost",
      floor: "attic",
      path: "a.js",
    } as const;
    const model = (path: string, q: 1 | 2 | 3): ViewModel => ({
      scene: { ...base, path },
      transition: null,
      house: null,
      ghost: {
        path,
        floor: "attic",
        step: "asking",
        code: null,
        licenceNextToCode: false,
        judgeLine: "j",
        reading: null,
        questionNumber: q,
        question: "q",
        revealedAnswer: null,
        showAnswerBox: true,
        prompt: null,
      },
      live: { formVisible: false, busy: false },
      status: { kind: "none", text: "" },
      licence: null,
      available: [],
    });
    const keyOf = (m: ViewModel): string | undefined => {
      const box = grimoireView(m)?.blocks.find((b) => b.kind === "answer-box");
      return box?.kind === "answer-box" ? box.key : undefined;
    };
    expect(keyOf(model("a.js", 1))).toBe(keyOf(model("a.js", 1)));
    expect(keyOf(model("a.js", 1))).not.toBe(keyOf(model("a.js", 2)));
    expect(keyOf(model("a.js", 1))).not.toBe(keyOf(model("b.js", 1)));
  });
});
