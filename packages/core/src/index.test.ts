import { expect, test } from "vitest";
import * as core from "./index.js";

test("exports the public API and not the internals", () => {
  for (const name of [
    "detectGhosts",
    "parseReport",
    "parseRepoUrl",
    "formatRepoUrl",
    "isEligible",
    "pickKeyFiles",
    "measureFactors",
    "difficultyScore",
    "floorOf",
    "buildReport",
    "createGitHubClient",
  ]) {
    expect(typeof (core as Record<string, unknown>)[name]).toBe("function");
  }
  expect(core).not.toHaveProperty("DetectError");
});

test("parseReport reads a report built with buildReport", () => {
  const report = core.buildReport({
    owner: "o",
    repo: "r",
    ref: "main",
    analysed: 1,
    truncated: false,
    partial: false,
    skipped: [],
    ghosts: [
      {
        path: "src/a.ts",
        language: "TypeScript",
        factors: { lines: 10, branches: 1, maxIndent: 2, imports: 1 },
      },
    ],
  });
  const parsed = core.parseReport(JSON.stringify(report));
  expect(parsed).toEqual({ ok: true, value: report });
});
