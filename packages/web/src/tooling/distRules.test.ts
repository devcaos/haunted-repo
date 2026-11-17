import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  COUNTED_EXTENSIONS,
  SIZE_LIMIT,
  checkDist,
  formatReport,
  hasExternalAddress,
  MISSING_DIST_MESSAGE,
  type DistFile,
} from "./distRules.js";

const file = (path: string, gzipBytes: number, text?: string): DistFile =>
  text === undefined ? { path, gzipBytes } : { path, gzipBytes, text };

describe("checkDist (Requirements 1.9, 20.6 to 20.9, 24.9)", () => {
  it("names npm run build when dist is missing (20.6)", () => {
    expect(MISSING_DIST_MESSAGE).toContain("npm run build");
  });

  it("prints the total and the limit of 307,200 bytes (20.8)", () => {
    const report = checkDist([file("assets/a.js", 157_342)]);
    expect(formatReport(report)[0]).toBe(
      "Size check: 157,342 bytes gzipped (limit 307,200).",
    );
    expect(report.problems).toEqual([]);
  });

  it("lists counted files largest first and skips the others", () => {
    const report = checkDist([
      file("assets/small.css", 10),
      file("assets/big.js", 500),
      file("index.html", 9_000, "<html></html>"),
      file("assets/big.js.map", 9_000),
    ]);
    expect(report.counted.map((f) => f.path)).toEqual([
      "assets/big.js",
      "assets/small.css",
    ]);
    expect(report.total).toBe(510);
  });

  it("passes just under the limit and fails at exactly 307,200 bytes", () => {
    expect(checkDist([file("a.js", SIZE_LIMIT - 1)]).problems).toEqual([]);
    expect(checkDist([file("a.js", SIZE_LIMIT)]).problems).toHaveLength(1);
  });

  it("flags a gallery file name and the gallery marker (24.9)", () => {
    expect(
      checkDist([file("gallery.html", 1, "<p></p>")]).problems,
    ).toHaveLength(1);
    expect(
      checkDist([file("assets/a.js", 1, 'x="data-scenic-gallery"')]).problems,
    ).toHaveLength(1);
  });

  it('flags rel="stylesheet" in index.html only (1.9)', () => {
    const html = '<link rel="stylesheet" href="/a.css">';
    expect(checkDist([file("index.html", 1, html)]).problems).toHaveLength(1);
    expect(checkDist([file("other.html", 1, html)]).problems).toEqual([]);
  });

  it("flags an external address but allows the SVG namespaces (20.9)", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(checkDist([file("a.svg", 1, svg)]).problems).toEqual([]);
    expect(
      checkDist([file("a.css", 1, "a{background:url(//cdn.example/a.png)}")])
        .problems,
    ).toHaveLength(1);
  });

  it("does not scan JavaScript for addresses", () => {
    const js = 'fetch("https://api.github.com/x")';
    expect(checkDist([file("assets/a.js", 1, js)]).problems).toEqual([]);
  });
});

describe("checkDist properties", () => {
  const countedName = fc
    .tuple(
      fc.stringMatching(/^[a-z]{1,8}$/).filter((s) => s !== "gallery"),
      fc.constantFrom(...COUNTED_EXTENSIONS, ".html", ".txt", ".map"),
    )
    .map(([stem, ext]) => `assets/${stem}${ext}`);
  const text = fc.oneof(
    fc.constant(undefined),
    fc.constantFrom(
      "plain text",
      "see https://example.com/a",
      "a{background:url(//cdn.example/a.png)}",
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    ),
  );
  const distFile = fc
    .tuple(countedName, fc.integer({ min: 0, max: 120_000 }), text)
    .map(([path, bytes, t]) => file(path, bytes, t));

  // Feature: scenic-web, Property 18: The Size_Check fails exactly on budget or address problems
  // **Validates: Requirements 20.7, 20.9**
  it("fails exactly when over the budget or an address is found", () => {
    fc.assert(
      fc.property(fc.array(distFile, { maxLength: 12 }), (files) => {
        const report = checkDist(files);
        const total = files
          .filter((f) => COUNTED_EXTENSIONS.some((e) => f.path.endsWith(e)))
          .reduce((sum, f) => sum + f.gzipBytes, 0);
        const overBudget = total >= SIZE_LIMIT;
        const address = files.some(
          (f) =>
            /\.(?:html|css|svg)$/.test(f.path) &&
            f.text !== undefined &&
            hasExternalAddress(f.text),
        );
        expect(report.total).toBe(total);
        expect(report.problems.length > 0).toBe(overBudget || address);
      }),
      { numRuns: 200 },
    );
  });
});
