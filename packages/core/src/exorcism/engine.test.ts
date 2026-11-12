import { describe, expect, it } from "vitest";
import type { Ghost, HauntedReport } from "../ghost-detection/types.js";
import { startSession } from "./engine.js";
import type { ExorcismProgress } from "./types.js";

function ghost(path: string, difficultyScore: number): Ghost {
  return {
    path,
    language: "TypeScript",
    difficultyScore,
    floor: "attic",
    factors: { lines: 1, branches: 0, maxIndent: 0, imports: 0 },
    reason: "It is easy.",
  };
}

function reportOf(
  ghosts: Ghost[],
  overview: Partial<HauntedReport["overview"]> = {},
): HauntedReport {
  return {
    overview: {
      owner: "o",
      repo: "r",
      ref: "main",
      analysed: ghosts.length,
      picked: ghosts.length,
      truncated: false,
      fewFiles: false,
      partial: false,
      skipped: [],
      message: null,
      ...overview,
    },
    ghosts,
  };
}

function progressOf(
  entries: readonly [string, "haunted" | "exorcised"][],
): ExorcismProgress {
  return {
    ghosts: entries.map(([path, state]) => ({
      path,
      state,
      ratings: [],
      selfCheck: null,
    })),
  };
}

describe("startSession", () => {
  it("starts in choosing without progress or profile", () => {
    const report = reportOf([ghost("a.ts", 20), ghost("b.ts", 10)]);
    const { state, instructions } = startSession(report);
    expect(state.step).toBe("choosing");
    expect(state.profile).toEqual({ knowsJava: false });
    expect(state.current).toBeNull();
    expect(state.asked).toEqual({});
    expect(state.ghosts).toEqual(report.ghosts);
    expect(state.progress).toEqual(
      progressOf([
        ["a.ts", "haunted"],
        ["b.ts", "haunted"],
      ]),
    );
    expect(instructions.step).toBe("choosing");
    expect(instructions.text).toContain("b.ts");
  });

  it("uses the given progress and profile", () => {
    const report = reportOf([ghost("a.ts", 20), ghost("b.ts", 10)]);
    const { state } = startSession(report, {
      progress: progressOf([
        ["a.ts", "haunted"],
        ["b.ts", "exorcised"],
      ]),
      profile: { knowsJava: true },
    });
    expect(state.step).toBe("choosing");
    expect(state.profile.knowsJava).toBe(true);
    expect(state.progress.ghosts[1]?.state).toBe("exorcised");
  });

  it("starts in house-clean when every ghost is exorcised", () => {
    const report = reportOf([ghost("a.ts", 20)]);
    const { state, instructions } = startSession(report, {
      progress: progressOf([["a.ts", "exorcised"]]),
    });
    expect(state.step).toBe("house-clean");
    expect(instructions.step).toBe("house-clean");
  });

  it("starts in house-clean when the report has 0 ghosts", () => {
    const { state } = startSession(reportOf([]));
    expect(state.step).toBe("house-clean");
    expect(state.ghosts).toEqual([]);
  });

  it("keeps the first ghost when a path is repeated", () => {
    const report = reportOf([ghost("a.ts", 20), ghost("a.ts", 5)]);
    const { state } = startSession(report);
    expect(state.ghosts).toHaveLength(1);
    expect(state.ghosts[0]?.difficultyScore).toBe(20);
    expect(state.progress.ghosts).toHaveLength(1);
  });

  it("starts normally with fewFiles and partial reports", () => {
    const report = reportOf([ghost("a.ts", 20)], {
      fewFiles: true,
      partial: true,
      message: "Few files.",
    });
    expect(startSession(report).state.step).toBe("choosing");
  });

  it("drops unknown paths from the given progress", () => {
    const report = reportOf([ghost("a.ts", 20)]);
    const { state } = startSession(report, {
      progress: progressOf([
        ["gone.ts", "exorcised"],
        ["a.ts", "haunted"],
      ]),
    });
    expect(state.progress.ghosts.map((g) => g.path)).toEqual(["a.ts"]);
  });

  it("does not share objects with the report", () => {
    const report = reportOf([ghost("a.ts", 20)]);
    const { state } = startSession(report);
    expect(state.ghosts[0]).not.toBe(report.ghosts[0]);
    expect(state.ghosts[0]?.factors).not.toBe(report.ghosts[0]?.factors);
  });
});
