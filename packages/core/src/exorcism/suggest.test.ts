import { describe, expect, it } from "vitest";
import type { Ghost } from "../ghost-detection/types.js";
import { isPickable, suggestGhost } from "./suggest.js";
import type { ExorcismProgress } from "./types.js";

function ghost(path: string, difficultyScore: number): Ghost {
  return {
    path,
    language: "TypeScript",
    difficultyScore,
    floor: "attic",
    factors: { lines: 0, branches: 0, maxIndent: 0, imports: 0 },
    reason: "",
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

describe("suggestGhost", () => {
  it("picks the haunted ghost with the lowest score", () => {
    const ghosts = [ghost("a.ts", 50), ghost("b.ts", 10), ghost("c.ts", 30)];
    const progress = progressOf([
      ["a.ts", "haunted"],
      ["b.ts", "haunted"],
      ["c.ts", "haunted"],
    ]);
    expect(suggestGhost(ghosts, progress)?.path).toBe("b.ts");
  });

  it("breaks ties by path ascending", () => {
    const ghosts = [ghost("z.ts", 10), ghost("a.ts", 10), ghost("m.ts", 10)];
    const progress = progressOf([
      ["z.ts", "haunted"],
      ["a.ts", "haunted"],
      ["m.ts", "haunted"],
    ]);
    expect(suggestGhost(ghosts, progress)?.path).toBe("a.ts");
  });

  it("skips exorcised ghosts", () => {
    const ghosts = [ghost("a.ts", 5), ghost("b.ts", 40)];
    const progress = progressOf([
      ["a.ts", "exorcised"],
      ["b.ts", "haunted"],
    ]);
    expect(suggestGhost(ghosts, progress)?.path).toBe("b.ts");
  });

  it("returns null when every ghost is exorcised", () => {
    const ghosts = [ghost("a.ts", 5)];
    expect(
      suggestGhost(ghosts, progressOf([["a.ts", "exorcised"]])),
    ).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(suggestGhost([], progressOf([]))).toBeNull();
  });
});

describe("isPickable", () => {
  const ghosts = [ghost("a.ts", 5), ghost("b.ts", 40)];
  const progress = progressOf([
    ["a.ts", "exorcised"],
    ["b.ts", "haunted"],
  ]);

  it("is true for a haunted ghost in the list", () => {
    expect(isPickable(ghosts, progress, "b.ts")).toBe(true);
  });

  it("is false for an exorcised ghost", () => {
    expect(isPickable(ghosts, progress, "a.ts")).toBe(false);
  });

  it("is false for an unknown path", () => {
    expect(isPickable(ghosts, progress, "nope.ts")).toBe(false);
  });
});
