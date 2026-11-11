import { describe, expect, it } from "vitest";
import { measureFactors } from "./factors.js";

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
