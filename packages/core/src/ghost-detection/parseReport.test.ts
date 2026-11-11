import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseReport } from "./parseReport.js";
import { reportArb } from "./reportArb.testutil.js";
import type { HauntedReport } from "./types.js";

const valid: HauntedReport = {
  overview: {
    owner: "o",
    repo: "r",
    ref: "main",
    analysed: 3,
    picked: 1,
    truncated: false,
    fewFiles: true,
    partial: false,
    skipped: [{ path: "big.ts", reason: "TOO_LARGE" }],
    message: "This looks like a small project, so only 1 file(s) were picked.",
  },
  ghosts: [
    {
      path: "src/a.ts",
      language: "TypeScript",
      difficultyScore: 50,
      floor: "middle floor",
      factors: { lines: 10, branches: 2, maxIndent: 1, imports: 3 },
      reason: "It has many lines.",
    },
  ],
};

function expectInvalid(text: string): void {
  const result = parseReport(text);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe("INVALID_REPORT");
    expect(result.error.message).toBe(
      "This text is not a valid Haunted Repo report.",
    );
  }
}

// Loose shape so tests can break fields on purpose.
type Rec = Record<string, unknown>;
interface Loose {
  overview: Rec & { skipped: Rec[] };
  ghosts: (Rec & { factors: Rec })[];
}

function first<T>(items: T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error("test data has no item");
  return item;
}
function withChange(change: (copy: Loose) => void): string {
  const copy = JSON.parse(JSON.stringify(valid)) as Loose;
  change(copy);
  return JSON.stringify(copy);
}

describe("parseReport", () => {
  it("accepts a valid report", () => {
    expect(parseReport(JSON.stringify(valid))).toEqual({
      ok: true,
      value: valid,
    });
  });

  it("rejects invalid JSON", () => {
    expectInvalid("{not json");
    expectInvalid("");
  });

  it("rejects values that are not a report", () => {
    expectInvalid("null");
    expectInvalid("[]");
    expectInvalid('"text"');
    expectInvalid("{}");
  });

  it("rejects wrong types", () => {
    expectInvalid(withChange((r) => (r.overview.owner = 5)));
    expectInvalid(withChange((r) => ((r as unknown as Rec).ghosts = "none")));
    expectInvalid(withChange((r) => (r.overview.message = 1)));
    expectInvalid(withChange((r) => (first(r.ghosts).factors.lines = 1.5)));
    expectInvalid(withChange((r) => (first(r.ghosts).factors.lines = -1)));
  });

  it("rejects a missing field", () => {
    expectInvalid(withChange((r) => delete r.overview.ref));
    expectInvalid(withChange((r) => delete first(r.ghosts).reason));
  });

  it("rejects values outside the unions", () => {
    expectInvalid(withChange((r) => (first(r.ghosts).floor = "garage")));
    expectInvalid(withChange((r) => (first(r.ghosts).language = "Rust")));
    expectInvalid(
      withChange((r) => (first(r.overview.skipped).reason = "OTHER")),
    );
  });

  it("rejects a score of 101", () => {
    expectInvalid(withChange((r) => (first(r.ghosts).difficultyScore = 101)));
  });

  it("never throws for any JSON value", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(() => parseReport(JSON.stringify(value))).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: ghost-detection, Property 9: Report JSON round trip
  // **Validates: Requirements 6.7, 6.8**
  it("Property 9: report JSON round trip", () => {
    fc.assert(
      fc.property(reportArb, (report) => {
        expect(parseReport(JSON.stringify(report))).toEqual({
          ok: true,
          value: report,
        });
      }),
      { numRuns: 100 },
    );
  });
});
