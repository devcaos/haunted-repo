// Feature: kiro-power, Property 3: Save round-trip
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExorcismProgress, HauntedReport } from "@haunted-repo/core";
import { progressArb } from "core-testutil/exorcism/progressArb.testutil.js";
import { reportArb } from "core-testutil/ghost-detection/reportArb.testutil.js";
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataFileName, parseDataFile, serialiseDataFile } from "./dataFile.js";
import { createFolderStore } from "./store.js";

/** Owner and repo in the characters a data file name allows, any case. */
const ownerArb = fc.stringMatching(/^[A-Za-z0-9-]{1,39}$/);
const repoArb = fc.stringMatching(/^[A-Za-z0-9._-]{1,100}$/);

/**
 * A report as the Power saves it: owner and repo that can name a file, and
 * one ghost per path (the progress has one entry per ghost, and
 * parseProgress refuses a path that appears twice).
 */
const savedReportArb: fc.Arbitrary<HauntedReport> = fc
  .tuple(reportArb, ownerArb, repoArb)
  .map(([report, owner, repo]) => {
    const seen = new Set<string>();
    const ghosts = report.ghosts.filter((ghost) => {
      if (seen.has(ghost.path)) return false;
      seen.add(ghost.path);
      return true;
    });
    return { overview: { ...report.overview, owner, repo }, ghosts };
  });

const savedArb: fc.Arbitrary<{
  report: HauntedReport;
  progress: ExorcismProgress;
}> = savedReportArb.chain((report) =>
  progressArb(report.ghosts).map((progress) => ({ report, progress })),
);

let folder: string;

beforeAll(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "haunted-roundtrip-"));
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("Property 3: Save round-trip", () => {
  /** **Validates: Requirements 7.1, 7.2, 7.4, 7.8** */
  it("reads back an equal report and progress from a real folder", async () => {
    const store = createFolderStore(folder);
    await fc.assert(
      fc.asyncProperty(savedArb, async ({ report, progress }) => {
        const name = dataFileName(report.overview.owner, report.overview.repo);
        const written = await store.write(
          name,
          serialiseDataFile(report, progress),
        );
        expect(written).toEqual({ ok: true });

        const read = await store.read(name);
        expect(read.kind).toBe("found");
        if (read.kind !== "found") return;
        const parsed = parseDataFile(read.text, name);
        expect(parsed).toEqual({ ok: true, value: { report, progress } });

        const raw: unknown = JSON.parse(
          await readFile(path.join(folder, name), "utf8"),
        );
        expect(Object.keys(raw as object).sort()).toEqual([
          "format",
          "progress",
          "report",
        ]);
      }),
      { numRuns: 100 },
    );
  });
});
