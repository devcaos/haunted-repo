import type { ExorcismProgress, HauntedReport } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import {
  dataFileName,
  isOwnDataFile,
  parseDataFile,
  serialiseDataFile,
} from "./dataFile.js";

const report: HauntedReport = {
  overview: {
    owner: "Lukeed",
    repo: "Sirv",
    ref: "main",
    analysed: 1,
    picked: 1,
    truncated: false,
    fewFiles: false,
    partial: false,
    skipped: [],
    message: null,
  },
  ghosts: [
    {
      path: "src/a.ts",
      language: "TypeScript",
      difficultyScore: 12,
      floor: "attic",
      factors: { lines: 10, branches: 1, maxIndent: 2, imports: 0 },
      reason: "A short file.",
    },
  ],
};

const progress: ExorcismProgress = {
  ghosts: [
    {
      path: "src/a.ts",
      state: "exorcised",
      ratings: ["right", "right", "wrong"],
      selfCheck: "yes",
    },
  ],
};

const NAME = "haunted-repo--lukeed@sirv.json";

describe("dataFileName", () => {
  it("builds a lowercase name from mixed-case owner and repo", () => {
    expect(dataFileName("Lukeed", "Sirv")).toBe(NAME);
    expect(dataFileName("A-b", "My.Repo_x")).toBe(
      "haunted-repo--a-b@my.repo_x.json",
    );
  });

  it("throws for characters parseRepoUrl would refuse", () => {
    expect(() => dataFileName("a/b", "c")).toThrow();
    expect(() => dataFileName("a", "..\\c")).toThrow();
    expect(() => dataFileName("a@b", "c")).toThrow();
    expect(() => dataFileName("", "c")).toThrow();
    expect(() => dataFileName("a", "")).toThrow();
  });
});

describe("isOwnDataFile", () => {
  it("accepts only Haunted Repo data file names", () => {
    expect(isOwnDataFile(NAME)).toBe(true);
    expect(isOwnDataFile("haunted-repo--probe.tmp")).toBe(false);
    expect(isOwnDataFile("haunted-repo--Lukeed@sirv.json")).toBe(false);
    expect(isOwnDataFile(`${NAME}.123.tmp`)).toBe(false);
    expect(isOwnDataFile("other-power.json")).toBe(false);
  });
});

describe("serialiseDataFile and parseDataFile", () => {
  it("round-trips report and progress with only three keys", () => {
    const text = serialiseDataFile(report, progress);
    expect(Object.keys(JSON.parse(text) as object)).toEqual([
      "format",
      "report",
      "progress",
    ]);
    expect(parseDataFile(text, NAME)).toEqual({
      ok: true,
      value: { report, progress },
    });
  });

  it("refuses invalid JSON as INVALID_REPORT and names the file", () => {
    const result = parseDataFile("{not json", NAME);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_REPORT");
    expect(result.error.message).toContain(NAME);
  });

  it("refuses an empty file as INVALID_REPORT and names the file", () => {
    const result = parseDataFile("", NAME);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_REPORT" },
    });
    if (!result.ok) expect(result.error.message).toContain(NAME);
  });

  it("refuses a wrong format", () => {
    const text = JSON.stringify({ format: 2, report, progress });
    const result = parseDataFile(text, NAME);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_REPORT" },
    });
  });

  it("refuses an invalid report", () => {
    const bad = { ...report, ghosts: [{ path: 1 }] };
    const text = JSON.stringify({ format: 1, report: bad, progress });
    const result = parseDataFile(text, NAME);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_REPORT" },
    });
    if (!result.ok) expect(result.error.message).toContain(NAME);
  });

  it("refuses an invalid progress", () => {
    const bad = { ghosts: [{ path: "src/a.ts", state: "gone" }] };
    const text = JSON.stringify({ format: 1, report, progress: bad });
    const result = parseDataFile(text, NAME);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_PROGRESS" },
    });
    if (!result.ok) expect(result.error.message).toContain(NAME);
  });

  it("refuses a missing progress as INVALID_PROGRESS", () => {
    const text = JSON.stringify({ format: 1, report });
    expect(parseDataFile(text, NAME)).toMatchObject({
      ok: false,
      error: { code: "INVALID_PROGRESS" },
    });
  });

  it("refuses a report whose owner does not match the file name", () => {
    const text = serialiseDataFile(report, progress);
    const result = parseDataFile(text, "haunted-repo--other@sirv.json");
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_REPORT" },
    });
  });

  it("matches the file name in any letter case of the report", () => {
    const upper = {
      ...report,
      overview: { ...report.overview, owner: "LUKEED", repo: "sirv" },
    };
    const text = serialiseDataFile(upper, progress);
    expect(parseDataFile(text, NAME).ok).toBe(true);
  });
});
