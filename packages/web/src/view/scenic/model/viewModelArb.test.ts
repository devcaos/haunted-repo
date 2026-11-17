/// <reference types="node" />
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Scene } from "../../../logic/viewModel.js";
import {
  pageRunArb,
  playPageRun,
  viewModelArb,
} from "./viewModelArb.testutil.js";

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

describe("viewModelArb", () => {
  it("covers every house source, Scene kind and Ghost state", () => {
    const seen = new Set<string>();
    fc.assert(
      fc.property(viewModelArb, (model) => {
        seen.add(`source:${model.house?.source ?? "none"}`);
        seen.add(`scene:${model.scene.kind}`);
        for (const floor of model.house?.floors ?? []) {
          for (const card of floor.ghosts) seen.add(`state:${card.state}`);
        }
      }),
      { numRuns: 300 },
    );
    const sceneKinds: Scene["kind"][] = ["house", "floor", "ghost"];
    const expected = [
      "source:live",
      "source:sample",
      "source:none",
      ...sceneKinds.map((kind) => `scene:${kind}`),
      "state:haunted",
      "state:exorcised",
      "state:locked",
    ];
    // Share of each value, printed with fc.statistics.
    fc.statistics(
      viewModelArb,
      (model) =>
        `${model.house?.source ?? "none"} / ${model.scene.kind} / ${[
          ...new Set(
            (model.house?.floors ?? []).flatMap((f) =>
              f.ghosts.map((c) => c.state),
            ),
          ),
        ]
          .sort()
          .join("+")}`,
      { numRuns: 300 },
    );
    expect(expected.filter((value) => !seen.has(value))).toEqual([]);
  });
});

describe("pageRunArb", () => {
  it("plays the real page and every model is consistent", async () => {
    await fc.assert(
      fc.asyncProperty(pageRunArb, async (run) => {
        const models = await playPageRun(run, read);
        expect(models.length).toBeGreaterThan(0);
        for (const model of models) {
          expect(model.house?.source).toMatch(/^(sample|live)$/);
        }
      }),
      { numRuns: 30 },
    );
  });
});
