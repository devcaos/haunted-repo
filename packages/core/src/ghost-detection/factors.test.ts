import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { difficultyScore, measureFactors } from "./factors.js";
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
