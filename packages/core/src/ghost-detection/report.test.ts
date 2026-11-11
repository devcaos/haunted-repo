import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { difficultyScore, reasonFor } from "./factors.js";
import {
  buildReport,
  floorOf,
  type BuildInput,
  type ScoredFile,
} from "./report.js";
import type { Factors } from "./types.js";

describe("floorOf", () => {
  it.each([
    [0, "attic"],
    [33, "attic"],
    [34, "middle floor"],
    [66, "middle floor"],
    [67, "basement"],
    [100, "basement"],
  ])("score %i is %s", (score, floor) => {
    expect(floorOf(score)).toBe(floor);
  });
});

const small: Factors = { lines: 10, branches: 1, maxIndent: 1, imports: 1 };
const big: Factors = { lines: 400, branches: 60, maxIndent: 8, imports: 20 };

function file(path: string, factors: Factors = small): ScoredFile {
  return { path, language: "TypeScript", factors };
}

function input(
  ghosts: ScoredFile[],
  extra: Partial<BuildInput> = {},
): BuildInput {
  return {
    owner: "octo",
    repo: "demo",
    ref: "main",
    analysed: 7,
    truncated: false,
    partial: false,
    skipped: [],
    ghosts,
    ...extra,
  };
}

describe("buildReport", () => {
  it("fills every field of each ghost", () => {
    const report = buildReport(input([file("src/a.ts", big)]));
    expect(report.ghosts).toEqual([
      {
        path: "src/a.ts",
        language: "TypeScript",
        difficultyScore: 100,
        floor: "basement",
        factors: big,
        reason: reasonFor(big),
      },
    ]);
    expect(report.ghosts[0]!.difficultyScore).toBe(difficultyScore(big));
  });

  it("fills the overview", () => {
    const report = buildReport(
      input([file("a.ts"), file("b.ts"), file("c.ts")]),
    );
    expect(report.overview).toEqual({
      owner: "octo",
      repo: "demo",
      ref: "main",
      analysed: 7,
      picked: 3,
      truncated: false,
      fewFiles: false,
      partial: false,
      skipped: [],
      message: null,
    });
  });

  it.each([
    [0, false, null],
    [
      1,
      true,
      "This looks like a small project, so only 1 file(s) were picked.",
    ],
    [
      2,
      true,
      "This looks like a small project, so only 2 file(s) were picked.",
    ],
    [3, false, null],
  ])("with %i ghosts fewFiles is %s", (count, fewFiles, message) => {
    const files = Array.from({ length: count }, (_, i) => file(`f${i}.ts`));
    const { overview } = buildReport(input(files));
    expect(overview.picked).toBe(count);
    expect(overview.fewFiles).toBe(fewFiles);
    expect(overview.message).toBe(message);
  });

  it("copies partial, truncated and skipped", () => {
    const skipped = [
      { path: "big.ts", reason: "TOO_LARGE" as const },
      { path: "bin.ts", reason: "NOT_TEXT" as const },
    ];
    const { overview } = buildReport(
      input([file("a.ts")], { partial: true, truncated: true, skipped }),
    );
    expect(overview.partial).toBe(true);
    expect(overview.truncated).toBe(true);
    expect(overview.skipped).toEqual(skipped);
  });

  it("orders by score, then breaks ties by path", () => {
    const report = buildReport(
      input([file("z.ts"), file("hard.ts", big), file("B.ts"), file("a.ts")]),
    );
    expect(report.ghosts.map((g) => g.path)).toEqual([
      "B.ts",
      "a.ts",
      "z.ts",
      "hard.ts",
    ]);
  });
});

const factorsArb = fc.record({
  lines: fc.integer({ min: 0, max: 500 }),
  branches: fc.integer({ min: 0, max: 500 }),
  maxIndent: fc.integer({ min: 0, max: 500 }),
  imports: fc.integer({ min: 0, max: 500 }),
});

const scoredFileArb = fc.record({
  path: fc.string({ minLength: 1, maxLength: 12 }),
  language: fc.constantFrom("TypeScript", "JavaScript", "Java", "Python"),
  factors: factorsArb,
});

describe("buildReport properties", () => {
  it("report order does not depend on download order", () => {
    // Feature: ghost-detection, Property 8: Report order does not depend on download order
    // Validates: Requirements 6.1, 6.5
    fc.assert(
      fc.property(
        fc
          .uniqueArray(scoredFileArb, {
            selector: (f) => f.path,
            maxLength: 12,
          })
          .chain((files) =>
            fc.tuple(
              fc.constant(files),
              fc.shuffledSubarray(files, {
                minLength: files.length,
                maxLength: files.length,
              }),
            ),
          ),
        ([files, permuted]) => {
          const a = buildReport(input(files));
          const b = buildReport(input(permuted));
          expect(b).toEqual(a);
          for (let i = 1; i < a.ghosts.length; i++) {
            const prev = a.ghosts[i - 1]!;
            const cur = a.ghosts[i]!;
            const ordered =
              prev.difficultyScore < cur.difficultyScore ||
              (prev.difficultyScore === cur.difficultyScore &&
                prev.path < cur.path);
            expect(ordered).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
