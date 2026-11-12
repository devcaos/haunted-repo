import { describe, expect, it } from "vitest";
import type { Ghost } from "../ghost-detection/types.js";
import {
  formatProgress,
  hauntedShare,
  isExorcismProgress,
  normaliseProgress,
  parseProgress,
} from "./progress.js";
import type { ExorcismProgress } from "./types.js";

function ghost(path: string): Ghost {
  return { path } as Ghost;
}

const valid: ExorcismProgress = {
  ghosts: [
    {
      path: "a.ts",
      state: "exorcised",
      ratings: ["right", "half-right", "wrong"],
      selfCheck: "yes",
    },
    { path: "b.ts", state: "haunted", ratings: [], selfCheck: null },
  ],
};

describe("normaliseProgress", () => {
  it("drops unknown paths, adds missing ghosts as haunted, keeps report order", () => {
    const progress: ExorcismProgress = {
      ghosts: [
        { path: "gone.ts", state: "exorcised", ratings: [], selfCheck: null },
        {
          path: "b.ts",
          state: "exorcised",
          ratings: ["right", "right", "right"],
          selfCheck: "no",
        },
      ],
    };
    const result = normaliseProgress(
      [ghost("a.ts"), ghost("b.ts"), ghost("c.ts")],
      progress,
    );
    expect(result.ghosts.map((g) => g.path)).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(result.ghosts[0]).toEqual({
      path: "a.ts",
      state: "haunted",
      ratings: [],
      selfCheck: null,
    });
    expect(result.ghosts[1]?.state).toBe("exorcised");
    expect(result.ghosts[2]?.state).toBe("haunted");
  });

  it("treats null progress as all haunted", () => {
    const result = normaliseProgress([ghost("a.ts")], null);
    expect(result.ghosts).toEqual([
      { path: "a.ts", state: "haunted", ratings: [], selfCheck: null },
    ]);
  });
});

describe("parseProgress", () => {
  it("parses back what formatProgress wrote", () => {
    const result = parseProgress(formatProgress(valid));
    expect(result).toEqual({ ok: true, value: valid });
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["not an object", "[]"],
    ["ghosts not a list", '{"ghosts":1}'],
    [
      "path not a string",
      '{"ghosts":[{"path":1,"state":"haunted","ratings":[],"selfCheck":null}]}',
    ],
    [
      "state not in union",
      '{"ghosts":[{"path":"a","state":"dead","ratings":[],"selfCheck":null}]}',
    ],
    [
      "ratings of length 2",
      '{"ghosts":[{"path":"a","state":"haunted","ratings":["right","wrong"],"selfCheck":null}]}',
    ],
    [
      "invalid rating",
      '{"ghosts":[{"path":"a","state":"haunted","ratings":["x","x","x"],"selfCheck":null}]}',
    ],
    [
      "invalid selfCheck",
      '{"ghosts":[{"path":"a","state":"haunted","ratings":[],"selfCheck":"maybe"}]}',
    ],
    [
      "duplicate paths",
      '{"ghosts":[{"path":"a","state":"haunted","ratings":[],"selfCheck":null},{"path":"a","state":"haunted","ratings":[],"selfCheck":null}]}',
    ],
  ])("returns INVALID_PROGRESS for %s", (_name, text) => {
    const result = parseProgress(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PROGRESS");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });
});

describe("isExorcismProgress", () => {
  it("accepts valid and rejects invalid values", () => {
    expect(isExorcismProgress(valid)).toBe(true);
    expect(isExorcismProgress(null)).toBe(false);
    expect(isExorcismProgress({ ghosts: [{}] })).toBe(false);
  });
});

describe("hauntedShare", () => {
  const ghosts = [ghost("a.ts"), ghost("b.ts"), ghost("c.ts"), ghost("d.ts")];
  const entry = (
    path: string,
    state: "haunted" | "exorcised",
  ): ExorcismProgress["ghosts"][number] => ({
    path,
    state,
    ratings: [],
    selfCheck: null,
  });

  it("is 1 when no ghost is exorcised (with or without progress)", () => {
    expect(hauntedShare({ ghosts }, null)).toBe(1);
    expect(hauntedShare({ ghosts }, { ghosts: [] })).toBe(1);
  });

  it("is 0 when all ghosts are exorcised", () => {
    const progress = { ghosts: ghosts.map((g) => entry(g.path, "exorcised")) };
    expect(hauntedShare({ ghosts }, progress)).toBe(0);
  });

  it("is 0.5 when half are exorcised", () => {
    const progress = {
      ghosts: [
        entry("a.ts", "exorcised"),
        entry("b.ts", "exorcised"),
        entry("c.ts", "haunted"),
        entry("d.ts", "haunted"),
      ],
    };
    expect(hauntedShare({ ghosts }, progress)).toBe(0.5);
  });

  it("is 0 (not NaN) when there are no ghosts", () => {
    expect(hauntedShare({ ghosts: [] }, null)).toBe(0);
  });

  it("ignores paths that are not in the report", () => {
    const progress = {
      ghosts: [entry("gone.ts", "exorcised"), entry("a.ts", "exorcised")],
    };
    expect(hauntedShare({ ghosts }, progress)).toBe(0.75);
  });

  it("does not rise when one more ghost is exorcised", () => {
    const before = { ghosts: [entry("a.ts", "exorcised")] };
    const after = {
      ghosts: [entry("a.ts", "exorcised"), entry("b.ts", "exorcised")],
    };
    expect(hauntedShare({ ghosts }, after)).toBeLessThanOrEqual(
      hauntedShare({ ghosts }, before),
    );
  });
});
