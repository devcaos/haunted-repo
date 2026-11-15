import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type {
  ExorcismProgress,
  Floor,
  Ghost,
  HauntedReport,
  Overview,
} from "@haunted-repo/core";
import { reportArb } from "../../../core/src/ghost-detection/reportArb.testutil.js";
import {
  buildLiveHouse,
  buildSampleHouse,
  buildWarnings,
  type SampleExorcism,
} from "./houseView.js";
import type { HouseView } from "./viewModel.js";
import { POWER_TEXTS } from "./powerTexts.js";
import { TEXTS } from "./texts.js";

function ghost(path: string, floor: Floor, score: number): Ghost {
  return {
    path,
    language: "TypeScript",
    difficultyScore: score,
    floor,
    factors: { lines: 10, branches: 1, maxIndent: 2, imports: 0 },
    reason: `Reason for ${path}.`,
  };
}

function overview(changes: Partial<Overview> = {}): Overview {
  return {
    owner: "o",
    repo: "r",
    ref: "main",
    analysed: 3,
    picked: 3,
    truncated: false,
    fewFiles: false,
    partial: false,
    skipped: [],
    message: null,
    ...changes,
  };
}

function report(ghosts: Ghost[], changes: Partial<Overview> = {}) {
  const value: HauntedReport = { overview: overview(changes), ghosts };
  return value;
}

describe("buildLiveHouse", () => {
  it("puts one ghost on each floor, in floor order", () => {
    const house = buildLiveHouse(
      report([
        ghost("a.ts", "attic", 10),
        ghost("m.ts", "middle floor", 50),
        ghost("b.ts", "basement", 90),
      ]),
    );
    expect(house.repoName).toBe("o/r");
    expect(house.floors.map((f) => f.title)).toEqual([
      "Attic",
      "Middle floor",
      "Basement",
    ]);
    expect(house.floors.map((f) => f.ghosts.map((g) => g.path))).toEqual([
      ["a.ts"],
      ["m.ts"],
      ["b.ts"],
    ]);
    expect(house.floors.every((f) => f.emptyLine === null)).toBe(true);
    expect(house.floors[0].ghosts[0]).toEqual({
      path: "a.ts",
      floor: "attic",
      score: 10,
      reason: "Reason for a.ts.",
      state: "haunted",
      canStart: false,
      lockedLine: null,
    });
  });

  it("shows the empty line on the two floors without ghosts", () => {
    const house = buildLiveHouse(
      report([ghost("x.ts", "basement", 80), ghost("y.ts", "basement", 70)]),
    );
    expect(house.floors[0].emptyLine).toBe(TEXTS.emptyFloor);
    expect(house.floors[1].emptyLine).toBe(TEXTS.emptyFloor);
    expect(house.floors[2].emptyLine).toBeNull();
    // report order inside the floor
    expect(house.floors[2].ghosts.map((g) => g.path)).toEqual(["x.ts", "y.ts"]);
  });

  it("has the live line and no progress", () => {
    const house = buildLiveHouse(report([ghost("a.ts", "attic", 1)]));
    expect(house.source).toBe("live");
    expect(house.powerLine).toBe(POWER_TEXTS.liveReport);
    expect(house.progress).toBeNull();
    expect(house.houseClean).toBeNull();
  });
});

describe("buildSampleHouse", () => {
  it("has no live line and every card haunted", () => {
    const house = buildSampleHouse(
      report([ghost("a.ts", "attic", 1), ghost("b.ts", "basement", 99)]),
      null,
    );
    expect(house.source).toBe("sample");
    expect(house.powerLine).toBeNull();
    expect(house.progress).toBeNull();
    const cards = house.floors.flatMap((f) => f.ghosts);
    expect(cards.every((c) => c.state === "haunted" && !c.canStart)).toBe(true);
  });
});

describe("buildSampleHouse with an exorcism", () => {
  const sample = report([
    ghost("a.ts", "attic", 1),
    ghost("b.ts", "attic", 2),
    ghost("c.ts", "basement", 99),
  ]);

  function exorcised(...paths: string[]): ExorcismProgress {
    return {
      ghosts: paths.map((path) => ({
        path,
        state: "exorcised",
        ratings: ["right", "right", "right"],
        selfCheck: "yes",
      })),
    };
  }

  function exorcism(changes: Partial<SampleExorcism> = {}): SampleExorcism {
    return {
      progress: { ghosts: [] },
      step: "choosing",
      scripted: new Set(["a.ts", "b.ts"]),
      startAllowed: true,
      ...changes,
    };
  }

  function card(house: HouseView, path: string) {
    const found = house.floors
      .flatMap((f) => f.ghosts)
      .find((c) => c.path === path);
    if (found === undefined) throw new Error(`no card ${path}`);
    return found;
  }

  it("lets a scripted haunted ghost start while choosing", () => {
    const house = buildSampleHouse(sample, exorcism());
    expect(card(house, "a.ts")).toMatchObject({
      state: "haunted",
      canStart: true,
      lockedLine: null,
    });
  });

  it("shows an exorcised card that cannot start", () => {
    const house = buildSampleHouse(
      sample,
      exorcism({ progress: exorcised("a.ts") }),
    );
    expect(card(house, "a.ts")).toMatchObject({
      state: "exorcised",
      canStart: false,
      lockedLine: null,
    });
  });

  it("shows a locked card with its line and no start", () => {
    const house = buildSampleHouse(sample, exorcism());
    expect(card(house, "c.ts")).toMatchObject({
      state: "locked",
      canStart: false,
      lockedLine: POWER_TEXTS.lockedGhost,
    });
  });

  it("allows a start in the failed step", () => {
    const house = buildSampleHouse(sample, exorcism({ step: "failed" }));
    expect(card(house, "b.ts").canStart).toBe(true);
  });

  it("does not allow a start while asking", () => {
    const house = buildSampleHouse(sample, exorcism({ step: "asking" }));
    expect(card(house, "a.ts")).toMatchObject({
      state: "haunted",
      canStart: false,
    });
  });

  it("does not allow a start when startAllowed is false", () => {
    const house = buildSampleHouse(sample, exorcism({ startAllowed: false }));
    expect(card(house, "a.ts")).toMatchObject({
      state: "haunted",
      canStart: false,
    });
  });

  it("shows the progress line and share", () => {
    const house = buildSampleHouse(
      sample,
      exorcism({ progress: exorcised("a.ts") }),
    );
    expect(house.progress).toEqual({
      line: "2 of 3 ghosts still haunting",
      haunted: 2,
      total: 3,
      share: 2 / 3,
    });
    expect(house.houseClean).toBeNull();
    expect(house.powerLine).toBeNull();
  });

  it("shows the house-clean line when every ghost is exorcised", () => {
    const house = buildSampleHouse(
      sample,
      exorcism({
        step: "house-clean",
        progress: exorcised("a.ts", "b.ts", "c.ts"),
      }),
    );
    expect(house.houseClean).toBe(TEXTS.houseClean);
    expect(house.progress).toMatchObject({
      line: "0 of 3 ghosts still haunting",
      haunted: 0,
      share: 0,
    });
  });
});

describe("grouping by floor", () => {
  const FLOORS: readonly Floor[] = ["attic", "middle floor", "basement"];

  it("groups ghosts by floor in report order", () => {
    // Feature: web-demo, Property 4: Ghosts are grouped by floor in report order
    // **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    fc.assert(
      fc.property(reportArb, (value) => {
        for (const house of [
          buildLiveHouse(value),
          buildSampleHouse(value, null),
        ]) {
          expect(house.floors.map((f) => f.title)).toEqual([
            "Attic",
            "Middle floor",
            "Basement",
          ]);
          house.floors.forEach((floorView, i) => {
            const floor = FLOORS[i];
            expect(floorView.floor).toBe(floor);
            const expected = value.ghosts
              .filter((g) => g.floor === floor)
              .map((g) => ({
                path: g.path,
                floor: g.floor,
                score: g.difficultyScore,
                reason: g.reason,
              }));
            const actual = floorView.ghosts.map((c) => ({
              path: c.path,
              floor: c.floor,
              score: c.score,
              reason: c.reason,
            }));
            expect(actual).toEqual(expected);
            expect(floorView.emptyLine).toBe(
              expected.length === 0 ? TEXTS.emptyFloor : null,
            );
          });
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe("buildWarnings", () => {
  it("shows no warning when everything is clear", () => {
    expect(buildWarnings(overview())).toEqual({
      lines: [],
      skippedTitle: null,
      skipped: [],
    });
  });

  it("warns when the analysis is partial", () => {
    expect(buildWarnings(overview({ partial: true })).lines).toEqual([
      TEXTS.partial,
    ]);
  });

  it("shows the overview message as is", () => {
    expect(buildWarnings(overview({ message: "Only 2 files." })).lines).toEqual(
      ["Only 2 files."],
    );
  });

  it("warns when the file list was truncated", () => {
    expect(buildWarnings(overview({ truncated: true })).lines).toEqual([
      TEXTS.truncated,
    ]);
  });

  it("keeps the order partial, message, truncated", () => {
    const lines = buildWarnings(
      overview({ partial: true, message: "M", truncated: true }),
    ).lines;
    expect(lines).toEqual([TEXTS.partial, "M", TEXTS.truncated]);
  });

  it("lists skipped files with a plain reason", () => {
    const warnings = buildWarnings(
      overview({
        skipped: [
          { path: "big.ts", reason: "TOO_LARGE" },
          { path: "bin.js", reason: "NOT_TEXT" },
        ],
      }),
    );
    expect(warnings.lines).toEqual([]);
    expect(warnings.skippedTitle).toBe(TEXTS.skippedTitle);
    expect(warnings.skipped).toEqual([
      { path: "big.ts", reason: "too large" },
      { path: "bin.js", reason: "not text" },
    ]);
  });

  it("matches the overview exactly", () => {
    // Feature: web-demo, Property 5: Report warnings match the overview exactly
    // **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6**
    const plainReason = {
      TOO_LARGE: "too large",
      NOT_TEXT: "not text",
    } as const;
    fc.assert(
      fc.property(
        reportArb.map((value) => value.overview),
        (value) => {
          const warnings = buildWarnings(value);
          const expected = [
            ...(value.partial ? [TEXTS.partial] : []),
            ...(value.message !== null ? [value.message] : []),
            ...(value.truncated ? [TEXTS.truncated] : []),
          ];
          expect(warnings.lines).toEqual(expected);
          expect(warnings.skipped).toEqual(
            value.skipped.map((file) => ({
              path: file.path,
              reason: plainReason[file.reason],
            })),
          );
          expect(warnings.skippedTitle).toBe(
            value.skipped.length > 0 ? TEXTS.skippedTitle : null,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
