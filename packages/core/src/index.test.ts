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

test("exports the exorcism API and not its helpers", () => {
  for (const name of [
    "startSession",
    "advance",
    "decide",
    "parseEvent",
    "buildInstructions",
    "formatVerdict",
    "parseVerdict",
    "classifyFileKind",
    "suggestGhost",
    "isPickable",
    "normaliseProgress",
    "parseProgress",
    "formatProgress",
    "hauntedShare",
    "parseRecording",
    "formatRecording",
    "replay",
  ]) {
    expect(typeof (core as Record<string, unknown>)[name]).toBe("function");
  }
  expect(core).toHaveProperty("ALLOWED_EVENTS");
  expect(core).toHaveProperty("QUESTION_SETS");
  expect(core).not.toHaveProperty("fail");
  expect(core).not.toHaveProperty("driveSession");
});

test("a session started from a built report runs one step", () => {
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
  const start = core.startSession(report);
  expect(start.state.step).toBe("choosing");
  const next = core.advance(start.state, {
    type: "pick-ghost",
    path: "src/a.ts",
    text: "export const a = 1;",
  });
  expect(next.ok).toBe(true);
  if (next.ok) expect(next.state.step).toBe("explaining");
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
