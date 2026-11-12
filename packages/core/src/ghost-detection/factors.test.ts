import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { difficultyScore, measureFactors, reasonFor } from "./factors.js";
import { floorOf } from "./floor.js";
import { parseReport } from "./parseReport.js";
import { branchLineArb, textArb } from "./textArb.testutil.js";

const zeros = { lines: 0, branches: 0, maxIndent: 0, imports: 0 };

describe("measureFactors", () => {
  it("gives all zeros for an empty file", () => {
    expect(measureFactors("")).toEqual(zeros);
    expect(measureFactors("\n  \n\t\n")).toEqual(zeros);
  });

  it("counts only non-empty, non-comment lines", () => {
    const text = "const a = 1;\n\nconst b = 2;\n// note\n";
    expect(measureFactors(text).lines).toBe(2);
  });

  it("gives zero lines for a comment-only file", () => {
    const text = "// a\n# b\n/* c\n * d\n */\n";
    expect(measureFactors(text)).toEqual(zeros);
  });

  it("counts branching keywords", () => {
    const text = "if (a) {}\nfor (;;) {}\nwhile (x) {}\ntry {} catch (e) {}";
    expect(measureFactors(text).branches).toBe(4);
  });

  it("counts `else if` once", () => {
    expect(measureFactors("} else if (a) {").branches).toBe(1);
  });

  it("counts `elif` once", () => {
    expect(measureFactors("elif x:").branches).toBe(1);
  });

  it("does not count a bare `else`", () => {
    expect(measureFactors("} else {").branches).toBe(0);
  });

  it("does not count keywords inside comment lines or longer words", () => {
    expect(measureFactors("// if for while\nconst notify = 1;").branches).toBe(
      0,
    );
  });

  it("counts a 600-character line as one line", () => {
    const text = "x".repeat(600);
    expect(measureFactors(text).lines).toBe(1);
  });

  it("ignores a keyword placed after the 500th character", () => {
    const text = `${"x".repeat(500)} if`;
    expect(measureFactors(text).branches).toBe(0);
  });

  it("gives the same result for CRLF and LF", () => {
    const lf = "import a from 'a';\nif (a) {\n\tb();\n}\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(measureFactors(crlf)).toEqual(measureFactors(lf));
  });

  it("removes a BOM at the start", () => {
    const text = "\uFEFFimport a from 'a';\n";
    expect(measureFactors(text)).toEqual({ ...zeros, lines: 1, imports: 1 });
  });

  it("measures indentation with tabs and spaces", () => {
    expect(measureFactors("a\n\tb\n\t\tc").maxIndent).toBe(2);
    expect(measureFactors("a\n    b\n        c").maxIndent).toBe(2);
    expect(measureFactors("a\n      b").maxIndent).toBe(1);
    expect(measureFactors("a\n\t    b").maxIndent).toBe(2);
  });

  it("counts import, from-import and require lines", () => {
    const text = [
      "import fs from 'fs';",
      "from os import path",
      "const x = require('x');",
      "const important = 1;",
    ].join("\n");
    expect(measureFactors(text).imports).toBe(3);
  });
});

describe("difficultyScore", () => {
  it("gives 0 for all zeros", () => {
    expect(difficultyScore(zeros)).toBe(0);
  });

  it("gives 100 when every factor is at or above its cap", () => {
    expect(
      difficultyScore({ lines: 400, branches: 60, maxIndent: 8, imports: 20 }),
    ).toBe(100);
    expect(
      difficultyScore({
        lines: 9999,
        branches: 999,
        maxIndent: 99,
        imports: 999,
      }),
    ).toBe(100);
  });

  it.each([
    [{ ...zeros, lines: 200 }, 20],
    [{ ...zeros, branches: 30 }, 15],
    [{ ...zeros, maxIndent: 4 }, 10],
    [{ ...zeros, imports: 10 }, 5],
  ])("scores one factor alone: %j", (factors, expected) => {
    expect(difficultyScore(factors)).toBe(expected);
  });
});

describe("difficultyScore properties", () => {
  // Feature: ghost-detection, Property 4: Difficulty score is an integer from 0 to 100
  // **Validates: Requirements 5.3, 5.6**
  it("is an integer from 0 to 100", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const score = difficultyScore(measureFactors(text));
        return Number.isInteger(score) && score >= 0 && score <= 100;
      }),
      { numRuns: 100 },
    );
  });

  // Feature: ghost-detection, Property 5: Measuring is deterministic
  // **Validates: Requirements 5.7**
  it("measures the same text the same way", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const a = measureFactors(text);
        const b = measureFactors(text);
        return (
          JSON.stringify(a) === JSON.stringify(b) &&
          difficultyScore(a) === difficultyScore(b)
        );
      }),
      { numRuns: 100 },
    );
  });

  // Feature: ghost-detection, Property 6: Adding a branching line never lowers the score
  // **Validates: Requirements 5.8**
  it("does not lower the score when a branching line is appended", () => {
    fc.assert(
      fc.property(textArb, branchLineArb, (text, line) => {
        const before = difficultyScore(measureFactors(text));
        const after = difficultyScore(measureFactors(`${text}\n${line}`));
        return after >= before;
      }),
      { numRuns: 100 },
    );
  });

  // Feature: ghost-detection, Property 7: Line endings do not matter
  // **Validates: Requirements 5.5, 5.9**
  it("gives the same result with LF and CRLF", () => {
    fc.assert(
      fc.property(textArb, (text) => {
        const crlf = text.replaceAll("\n", "\r\n");
        const a = measureFactors(text);
        const b = measureFactors(crlf);
        return (
          JSON.stringify(a) === JSON.stringify(b) &&
          difficultyScore(a) === difficultyScore(b)
        );
      }),
      { numRuns: 100 },
    );
  });
});

describe("reasonFor properties", () => {
  const word = (text: string, w: string): boolean =>
    new RegExp(`\\b${w}\\b`, "i").test(text);
  const factorsArb = fc.oneof(
    fc.constant({ lines: 0, branches: 0, maxIndent: 0, imports: 0 }),
    fc.record({
      lines: fc.integer({ min: 0, max: 1000 }),
      branches: fc.integer({ min: 0, max: 1000 }),
      maxIndent: fc.integer({ min: 0, max: 1000 }),
      imports: fc.integer({ min: 0, max: 1000 }),
    }),
  );

  // Feature: exorcism, Property 11: Ghost sentence follows the floor wording
  // **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.7**
  it("follows the floor wording", () => {
    const marker = {
      lines: "lines of code",
      branches: "if/elif/for/while/switch/case/catch",
      maxIndent: "levels",
      imports: "imports",
    } as const;
    fc.assert(
      fc.property(factorsArb, (f) => {
        const text = reasonFor(f);
        const points = [
          ["lines", (Math.min(f.lines, 400) / 400) * 40],
          ["branches", (Math.min(f.branches, 60) / 60) * 30],
          ["maxIndent", (Math.min(f.maxIndent, 8) / 8) * 20],
          ["imports", (Math.min(f.imports, 20) / 20) * 10],
        ] as const;
        let best: (typeof points)[number] = points[0];
        for (const p of points) if (p[1] > best[1]) best = p;

        if (best[1] === 0) {
          return (
            text === "It is easy to read; it is very short and simple." &&
            !/\d/.test(text) &&
            Object.values(marker).every((m) => !text.includes(m))
          );
        }

        const name = best[0];
        const value = String(f[name]);
        const names =
          text.includes(`(${value} ${marker[name]}`) &&
          Object.entries(marker).every(
            ([k, m]) => k === name || !text.includes(m),
          ) &&
          new RegExp(`(?<!\\d)${value}(?!\\d)`).test(text);

        const floor = floorOf(difficultyScore(f));
        const hard = word(text, "hard");
        const easy = word(text, "easy");
        if (floor === "attic") {
          return names && text.startsWith("It is easy") && !hard;
        }
        if (floor === "middle floor") {
          return names && text.startsWith("It is of") && !hard && !easy;
        }
        return names && text.startsWith("It is hard");
      }),
      { numRuns: 100 },
    );
  });

  it("uses a different start for each floor", () => {
    const starts = ["It is easy", "It is of", "It is hard"];
    expect(new Set(starts).size).toBe(3);
    const attic = reasonFor({ ...zeros, lines: 200 });
    const middle = reasonFor({ ...zeros, lines: 400 });
    const basement = reasonFor({ ...zeros, lines: 400, branches: 60 });
    expect(
      [attic, middle, basement].map((s) =>
        starts.findIndex((p) => s.startsWith(p)),
      ),
    ).toEqual([0, 1, 2]);
  });
});

describe("reasonFor", () => {
  const D = "if/elif/for/while/switch/case/catch";
  it("names lines when it wins", () => {
    expect(reasonFor({ ...zeros, lines: 200 })).toBe(
      "It is easy to read; the part that weighs most is its length (200 lines of code).",
    );
  });
  it("names branches when it wins", () => {
    expect(reasonFor({ ...zeros, branches: 30 })).toBe(
      `It is easy to read; the part that weighs most is the number of decisions it makes (30 ${D}).`,
    );
  });
  it("names maxIndent when it wins", () => {
    expect(reasonFor({ ...zeros, maxIndent: 4 })).toBe(
      "It is easy to read; the part that weighs most is how nested the code is (4 levels).",
    );
  });
  it("names imports when it wins", () => {
    expect(reasonFor({ ...zeros, imports: 10 })).toBe(
      "It is easy to read; the part that weighs most is the number of other files it depends on (10 imports).",
    );
  });
  it("breaks ties in the order lines, branches, maxIndent, imports", () => {
    // every factor gives 10 points
    const all = { lines: 100, branches: 20, maxIndent: 4, imports: 20 };
    expect(reasonFor(all)).toBe(
      "It is of medium difficulty, mostly because it is fairly long (100 lines of code).",
    );
    expect(reasonFor({ ...all, lines: 0 })).toBe(
      `It is easy to read; the part that weighs most is the number of decisions it makes (20 ${D}).`,
    );
    expect(reasonFor({ ...all, lines: 0, branches: 0 })).toBe(
      "It is easy to read; the part that weighs most is how nested the code is (4 levels).",
    );
  });
  it("says the file is simple when all points are 0", () => {
    expect(reasonFor(zeros)).toBe(
      "It is easy to read; it is very short and simple.",
    );
  });

  it.each([
    [{ lines: 200, branches: 0, maxIndent: 0, imports: 0 }, 20, "attic", 1],
    [{ lines: 0, branches: 30, maxIndent: 0, imports: 0 }, 15, "attic", 2],
    [{ lines: 0, branches: 0, maxIndent: 4, imports: 0 }, 10, "attic", 3],
    [{ lines: 0, branches: 0, maxIndent: 0, imports: 10 }, 5, "attic", 4],
    [
      { lines: 400, branches: 0, maxIndent: 0, imports: 0 },
      40,
      "middle floor",
      5,
    ],
    [
      { lines: 50, branches: 60, maxIndent: 0, imports: 0 },
      35,
      "middle floor",
      6,
    ],
    [
      { lines: 100, branches: 20, maxIndent: 8, imports: 0 },
      40,
      "middle floor",
      7,
    ],
    [
      { lines: 99, branches: 19, maxIndent: 3, imports: 20 },
      37,
      "middle floor",
      8,
    ],
    [{ lines: 400, branches: 60, maxIndent: 0, imports: 0 }, 70, "basement", 9],
    [
      { lines: 290, branches: 60, maxIndent: 4, imports: 0 },
      69,
      "basement",
      10,
    ],
    [
      { lines: 199, branches: 39, maxIndent: 8, imports: 20 },
      69,
      "basement",
      11,
    ],
    [zeros, 0, "attic", 13],
  ] as const)(
    "gives the table sentence for %j (score %i, %s, sentence %i)",
    (f, score, floor, n) => {
      expect(difficultyScore(f)).toBe(score);
      expect(floorOf(score)).toBe(floor);
      const table: Record<number, string> = {
        1: "It is easy to read; the part that weighs most is its length (200 lines of code).",
        2: `It is easy to read; the part that weighs most is the number of decisions it makes (30 ${D}).`,
        3: "It is easy to read; the part that weighs most is how nested the code is (4 levels).",
        4: "It is easy to read; the part that weighs most is the number of other files it depends on (10 imports).",
        5: "It is of medium difficulty, mostly because it is fairly long (400 lines of code).",
        6: `It is of medium difficulty, mostly because it makes several decisions (60 ${D}).`,
        7: "It is of medium difficulty, mostly because the code is nested (8 levels).",
        8: "It is of medium difficulty, mostly because it depends on several other files (20 imports).",
        9: "It is hard, mostly because it is long (400 lines of code).",
        10: `It is hard, mostly because it makes many decisions (60 ${D}).`,
        11: "It is hard, mostly because the code is deeply nested (8 levels).",
        13: "It is easy to read; it is very short and simple.",
      };
      expect(reasonFor(f)).toBe(table[n]);
    },
  );

  it("still accepts a report saved with the old sentence", () => {
    const report = {
      overview: {
        owner: "o",
        repo: "r",
        ref: "main",
        analysed: 1,
        picked: 1,
        truncated: false,
        fewFiles: true,
        partial: false,
        skipped: [],
        message: "m",
      },
      ghosts: [
        {
          path: "src/a.ts",
          language: "TypeScript",
          difficultyScore: 20,
          floor: "attic",
          factors: { lines: 200, branches: 0, maxIndent: 0, imports: 0 },
          reason: "It is hard mostly because it is long (200 lines of code).",
        },
      ],
    };
    expect(parseReport(JSON.stringify(report)).ok).toBe(true);
  });
});
