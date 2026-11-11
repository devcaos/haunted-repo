import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isEligible } from "./eligibility.js";
import { keyScore, pickKeyFiles, rankKeyFiles } from "./keyFiles.js";

const score = (path: string, size: number): number => keyScore({ path, size });

describe("keyScore size points", () => {
  it.each([
    [199, 0],
    [200, 0],
    [10100, 15],
    [20000, 30],
    [20001, 30],
  ])("size %i gives %f size points", (size, expected) => {
    // "x/y/z/file.ts" has no name points and no location points.
    expect(score("x/y/z/file.ts", size)).toBeCloseTo(expected, 10);
  });
});

describe("keyScore name points", () => {
  it.each(["main", "index", "app", "server", "program", "__main__"])(
    "%s earns 40 points",
    (name) => {
      expect(score(`a/b/c/${name}.ts`, 0)).toBe(40);
    },
  );

  it("is case-insensitive and uses only the last extension", () => {
    expect(score("a/b/c/Index.TS", 0)).toBe(40);
    expect(score("a/b/c/index.test.ts", 0)).toBe(0);
    expect(score("a/b/c/utils.ts", 0)).toBe(0);
  });
});

describe("keyScore location points", () => {
  it("gives 30 with no folders", () => {
    expect(score("utils.ts", 0)).toBe(30);
  });

  it.each(["src", "app", "lib"])("gives 20 for one folder %s", (folder) => {
    expect(score(`${folder}/utils.ts`, 0)).toBe(20);
  });

  it("gives 0 for one folder with another name", () => {
    expect(score("tools/utils.ts", 0)).toBe(0);
  });

  it.each(["src", "app", "lib"])(
    "gives 10 for two folders starting with %s",
    (folder) => {
      expect(score(`${folder}/sub/utils.ts`, 0)).toBe(10);
    },
  );

  it("gives 0 for two folders when the first is another name", () => {
    expect(score("tools/src/utils.ts", 0)).toBe(0);
  });

  it("gives 0 location points to a monorepo path", () => {
    expect(score("packages/x/src/index.ts", 0)).toBe(40);
  });
});

describe("rankKeyFiles", () => {
  it("drops files that are not eligible", () => {
    const ranked = rankKeyFiles([
      { path: "README.md", size: 5000 },
      { path: "src/a.test.ts", size: 5000 },
      { path: "src/a.ts", size: 5000 },
    ]);
    expect(ranked.map((e) => e.path)).toEqual(["src/a.ts"]);
  });

  it("sorts by score, highest first", () => {
    const ranked = rankKeyFiles([
      { path: "tools/deep/er/z.ts", size: 0 },
      { path: "index.ts", size: 0 },
      { path: "src/z.ts", size: 0 },
    ]);
    expect(ranked.map((e) => e.path)).toEqual([
      "index.ts",
      "src/z.ts",
      "tools/deep/er/z.ts",
    ]);
  });

  it("breaks ties by path with a plain comparison", () => {
    const ranked = rankKeyFiles([
      { path: "src/b.ts", size: 1000 },
      { path: "src/B.ts", size: 1000 },
      { path: "src/a.ts", size: 1000 },
    ]);
    // Upper-case letters come before lower-case ones with a < b.
    expect(ranked.map((e) => e.path)).toEqual([
      "src/B.ts",
      "src/a.ts",
      "src/b.ts",
    ]);
  });
});

describe("pickKeyFiles", () => {
  it("returns all files when fewer than 5 are eligible", () => {
    const picked = pickKeyFiles([
      { path: "src/a.ts", size: 500 },
      { path: "src/b.ts", size: 500 },
    ]);
    expect(picked.map((e) => e.path)).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("ignores files that are not eligible", () => {
    const picked = pickKeyFiles([
      { path: "README.md", size: 5000 },
      { path: "src/a.test.ts", size: 5000 },
      { path: "src/a.ts", size: 5000 },
    ]);
    expect(picked.map((e) => e.path)).toEqual(["src/a.ts"]);
  });

  it("returns an empty list when no file is eligible", () => {
    expect(pickKeyFiles([{ path: "README.md", size: 10 }])).toEqual([]);
    expect(pickKeyFiles([])).toEqual([]);
  });

  it("keeps only the best 5 by default", () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      path: `src/f${i}.ts`,
      size: 1000 * (i + 1),
    }));
    expect(pickKeyFiles(entries)).toHaveLength(5);
    expect(pickKeyFiles(entries, 2)).toHaveLength(2);
  });
});

describe("pickKeyFiles properties", () => {
  const folderArb = fc.constantFrom("src", "lib", "app", "test", "utils");
  const nameArb = fc.constantFrom(
    "index",
    "main",
    "app",
    "util",
    "a",
    "b",
    "a.test",
    "types.d",
  );
  const extArb = fc.constantFrom(".ts", ".js", ".py", ".java", ".md");
  const pathArb = fc
    .tuple(fc.array(folderArb, { maxLength: 4 }), nameArb, extArb)
    .map(([folders, name, ext]) => [...folders, name + ext].join("/"));
  const entriesArb = fc.uniqueArray(
    fc.record({ path: pathArb, size: fc.integer({ min: 0, max: 200000 }) }),
    { selector: (e) => e.path, maxLength: 30 },
  );

  it("Property 3: Picking is deterministic and bounded", () => {
    // Feature: ghost-detection, Property 3: Picking is deterministic and bounded
    // **Validates: Requirements 4.5, 4.6, 4.9**
    fc.assert(
      fc.property(
        entriesArb,
        fc.array(fc.double({ noNaN: true }), { maxLength: 30 }),
        (entries, keys) => {
          const picked = pickKeyFiles(entries);
          expect(pickKeyFiles(entries)).toEqual(picked);

          const permuted = entries
            .map((entry, i) => ({ entry, key: keys[i] ?? 0 }))
            .sort((a, b) => a.key - b.key)
            .map((item) => item.entry);
          expect(pickKeyFiles(permuted)).toEqual(picked);

          expect(picked.length).toBeLessThanOrEqual(5);
          expect(picked.every((e) => isEligible(e.path))).toBe(true);

          const eligible = entries.filter((e) => isEligible(e.path));
          if (eligible.length >= 5) {
            const best = eligible
              .map(keyScore)
              .sort((a, b) => b - a)
              .slice(0, 5);
            expect(picked.map(keyScore)).toEqual(best);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
