import fc from "fast-check";
import type { Floor, Ghost, HauntedReport, Language } from "./types.js";

const count = fc.integer({ min: 0, max: 100_000 });

const languageArb = fc.constantFrom<Language>(
  "TypeScript",
  "JavaScript",
  "Java",
  "Python",
);
const floorArb = fc.constantFrom<Floor>("attic", "middle floor", "basement");

const ghostArb: fc.Arbitrary<Ghost> = fc.record({
  path: fc.string(),
  language: languageArb,
  difficultyScore: fc.integer({ min: 0, max: 100 }),
  floor: floorArb,
  factors: fc.record({
    lines: count,
    branches: count,
    maxIndent: count,
    imports: count,
  }),
  reason: fc.string(),
});

/** Any structurally valid report. Integers only: no NaN, no -0. */
export const reportArb: fc.Arbitrary<HauntedReport> = fc.record({
  overview: fc.record({
    owner: fc.string(),
    repo: fc.string(),
    ref: fc.string(),
    analysed: count,
    picked: count,
    truncated: fc.boolean(),
    fewFiles: fc.boolean(),
    partial: fc.boolean(),
    skipped: fc.array(
      fc.record({
        path: fc.string(),
        reason: fc.constantFrom<"TOO_LARGE" | "NOT_TEXT">(
          "TOO_LARGE",
          "NOT_TEXT",
        ),
      }),
    ),
    message: fc.option(fc.string(), { nil: null }),
  }),
  ghosts: fc.array(ghostArb),
});
