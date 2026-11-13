import { describe, expect, it } from "vitest";
import type { Floor, Ghost, HauntedReport, Overview } from "@haunted-repo/core";
import {
  buildLiveHouse,
  buildSampleHouse,
  buildWarnings,
} from "./houseView.js";
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
});
