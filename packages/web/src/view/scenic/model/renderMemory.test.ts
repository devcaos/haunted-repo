/// <reference types="node" />
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPage } from "../../../logic/page.js";
import { createRecordingRenderer } from "../../../logic/recordingRenderer.testutil.js";
import type {
  GhostState,
  ProgressView,
  Scene,
  ViewModel,
} from "../../../logic/viewModel.js";
import { loadSample } from "../../../sample/sampleData.js";
import { EMPTY_MEMORY, meterScale, nextMemory } from "./renderMemory.js";
import type { RenderEffects, VisualMemory } from "./renderMemory.js";
import { pageRunArb, playPageRun } from "./viewModelArb.testutil.js";

function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const sample = loadSample(
  read("../../../sample/report.json"),
  read("../../../sample/files.json"),
);

/** The first model of the real page on the committed sample. */
function sampleModel(): ViewModel {
  const renderer = createRecordingRenderer();
  const page = createPage(
    {
      detect: () => Promise.reject(new Error("no network in tests")),
      sample,
      script: null,
    },
    renderer,
  );
  page.start();
  return renderer.last();
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("fetch is not allowed in unit tests");
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function paths(model: ViewModel): string[] {
  return (model.house?.floors ?? []).flatMap((floor) =>
    floor.ghosts.map((card) => card.path),
  );
}

/** The same model with the given Card states and the matching progress. */
function withStates(
  model: ViewModel,
  states: Record<string, GhostState>,
  scene: Scene = model.scene,
): ViewModel {
  const house = model.house;
  if (house === null) throw new Error("the sample has a house");
  const floors = house.floors.map((floor) => ({
    ...floor,
    ghosts: floor.ghosts.map((card) => ({
      ...card,
      state: states[card.path] ?? card.state,
    })),
  })) as typeof house.floors;
  const all = floors.flatMap((floor) => floor.ghosts);
  const haunted = all.filter((card) => card.state === "haunted").length;
  const progress: ProgressView | null =
    house.progress === null
      ? null
      : {
          line: `${haunted} of ${all.length} ghosts still haunting`,
          haunted,
          total: all.length,
          share: all.length === 0 ? 0 : haunted / all.length,
        };
  return {
    ...model,
    scene,
    transition: null,
    house: { ...house, floors, progress },
  };
}

function allAs(model: ViewModel, state: GhostState): ViewModel {
  const states: Record<string, GhostState> = {};
  for (const path of paths(model)) states[path] = state;
  return withStates(model, states);
}

function feed(models: ViewModel[]): RenderEffects[] {
  let memory: VisualMemory = EMPTY_MEMORY;
  return models.map((model) => {
    const step = nextMemory(memory, model);
    memory = step.memory;
    return step.effects;
  });
}

describe("nextMemory", () => {
  const base = allAs(sampleModel(), "haunted");
  const [first] = paths(base);
  if (first === undefined) throw new Error("the sample has ghosts");
  const ghostScene: Scene = {
    kind: "ghost",
    floor: base.house?.floors[0].ghosts[0]?.floor ?? "attic",
    path: first,
  };

  it("does not change the memory it receives", () => {
    const frozen = Object.freeze({
      ...EMPTY_MEMORY,
      visitMoments: Object.freeze([]) as unknown as string[],
    });
    const result = nextMemory(frozen, base);
    expect(result.memory).not.toBe(frozen);
    expect(frozen).toEqual(EMPTY_MEMORY);
  });

  it("shows the model's own progress in a list render, with no move", () => {
    const [effects] = feed([base]);
    expect(effects?.meter?.view.share).toBe(base.house?.progress?.share);
    expect(effects?.meter?.from).toBeNull();
    expect(effects?.exorcisedMoments).toEqual([]);
    expect(effects?.returnGlow).toEqual([]);
    expect(effects?.sceneChanged).toBe(false);
  });

  it("freezes the meter in the Ghost_Scene and moves it after an exorcism (12.6)", () => {
    const opened = withStates(base, {}, ghostScene);
    const exorcised = withStates(base, { [first]: "exorcised" }, ghostScene);
    const back = withStates(base, { [first]: "exorcised" });
    const [listE, openE, doneE, backE] = feed([base, opened, exorcised, back]);
    const oldShare = listE?.meter?.view.share;
    expect(openE?.meter?.view.share).toBe(oldShare);
    expect(doneE?.exorcisedMoments).toEqual([first]);
    expect(doneE?.meter?.view.share).toBe(oldShare);
    expect(doneE?.meter?.view.haunted).toBe(base.house?.progress?.haunted);
    expect(backE?.meter?.view.share).toBe(back.house?.progress?.share);
    expect(backE?.meter?.from).toBe(oldShare);
    expect(backE?.returnGlow).toEqual([first]);
  });

  it("gives each Exorcised_Moment once (12.8)", () => {
    const opened = withStates(base, {}, ghostScene);
    const exorcised = withStates(base, { [first]: "exorcised" }, ghostScene);
    const effects = feed([base, opened, exorcised, exorcised]);
    expect(effects[2]?.exorcisedMoments).toEqual([first]);
    expect(effects[3]?.exorcisedMoments).toEqual([]);
  });

  it("shows the Cards lit with no moment and no meter move after Show the sample again", () => {
    const live: ViewModel = {
      ...base,
      house:
        base.house === null
          ? null
          : { ...base.house, source: "live", progress: null },
    };
    const lit = allAs(base, "exorcised");
    const effects = feed([live, lit]);
    expect(effects[1]?.exorcisedMoments).toEqual([]);
    expect(effects[1]?.returnGlow).toEqual([]);
    expect(effects[1]?.meter?.from).toBeNull();
    expect(effects[0]?.meter).toBeNull();
  });

  it("keeps the Card Exorcised on Not yet and still gives a Return_Glow", () => {
    const opened = withStates(base, {}, ghostScene);
    const exorcised = withStates(base, { [first]: "exorcised" }, ghostScene);
    const notYet = { ...exorcised }; // the engine only records the answer
    const back = withStates(base, { [first]: "exorcised" });
    const effects = feed([base, opened, exorcised, notYet, back]);
    expect(effects[3]?.exorcisedMoments).toEqual([]);
    expect(effects[4]?.returnGlow).toEqual([first]);
    expect(effects[4]?.exorcisedMoments).toEqual([]);
  });

  it("shows the new share without moving when the list progress was null (12.7)", () => {
    const live: ViewModel = {
      ...base,
      house: base.house === null ? null : { ...base.house, progress: null },
    };
    const opened = withStates(live, {}, ghostScene);
    const back = withStates(base, {});
    const effects = feed([live, opened, back]);
    expect(effects[1]?.meter).toBeNull();
    expect(effects[2]?.meter?.from).toBeNull();
  });

  it("animates the Finale once, when the last ghost is exorcised", () => {
    const done = allAs(base, "exorcised");
    const nearly = withStates(done, { [first]: "haunted" });
    const effects = feed([nearly, done, done]);
    expect(effects[0]?.finale).toEqual({
      shown: false,
      animate: false,
      announce: false,
    });
    expect(effects[1]?.finale).toEqual({
      shown: true,
      animate: true,
      announce: true,
    });
    expect(effects[2]?.finale).toEqual({
      shown: true,
      animate: false,
      announce: false,
    });
  });

  it("announces a Finale that is already there but does not animate it (13.7, 13.8)", () => {
    const done = allAs(base, "exorcised");
    const [effects] = feed([done]);
    expect(effects?.finale).toEqual({
      shown: true,
      animate: false,
      announce: true,
    });
  });

  it("marks a Scene change from the transition", () => {
    const moved: ViewModel = {
      ...base,
      scene: { kind: "floor", floor: "attic" },
      transition: { from: base.scene, to: { kind: "floor", floor: "attic" } },
    };
    expect(feed([base, moved])[1]?.sceneChanged).toBe(true);
  });
});

describe("Properties", () => {
  // Feature: scenic-web, Property 10: The Haunt_Meter shows the last list values while a ghost is open
  // **Validates: Requirements 4.3, 4.4, 4.17, 12.6, 12.7**
  it("Property 10: The Haunt_Meter shows the last list values while a ghost is open", async () => {
    let ghostRenders = 0;
    await fc.assert(
      fc.asyncProperty(pageRunArb, async (run) => {
        const models = await playPageRun(run, read);
        let memory: VisualMemory = EMPTY_MEMORY;
        // What the property says, tracked apart from nextMemory.
        let lastList: ProgressView | null = null;
        let visitHadMoment = false;
        let prev: ViewModel | null = null;
        for (const model of models) {
          const step = nextMemory(memory, model);
          memory = step.memory;
          const { effects } = step;
          const progress = model.house?.progress ?? null;
          if (model.scene.kind === "ghost") {
            ghostRenders += 1;
            if (prev === null || prev.scene.kind !== "ghost") {
              visitHadMoment = false;
            }
            if (effects.exorcisedMoments.length > 0) visitHadMoment = true;
            if (lastList === null) {
              expect(effects.meter).toBeNull();
            } else {
              expect(effects.meter?.view).toEqual({
                line: lastList.line,
                haunted: lastList.haunted,
                total: lastList.total,
                share: lastList.share,
              });
              expect(effects.meter?.from).toBeNull();
            }
          } else {
            if (progress === null) {
              expect(effects.meter).toBeNull();
            } else {
              const view = effects.meter?.view;
              expect(view?.line).toBe(progress.line);
              expect(view?.haunted).toBe(progress.haunted);
              expect(view?.total).toBe(progress.total);
              expect(view?.share).toBe(progress.share);
              const scale = Number(
                /scaleX\(([\d.]+)\)/.exec(meterScale(progress.share))?.[1],
              );
              expect(Math.abs(scale - progress.share)).toBeLessThanOrEqual(
                0.01,
              );
              const mustAnimate =
                prev !== null &&
                prev.scene.kind === "ghost" &&
                visitHadMoment &&
                lastList !== null;
              if (mustAnimate) {
                expect(effects.meter?.from).toBe(lastList?.share);
              } else {
                expect(effects.meter?.from).toBeNull();
              }
            }
            lastList = progress;
            visitHadMoment = false;
          }
          prev = model;
        }
      }),
      { numRuns: 100 },
    );
    expect(ghostRenders).toBeGreaterThan(0);
  });
});
