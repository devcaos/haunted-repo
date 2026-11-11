import { describe, expect, it } from "vitest";
import { detectGhosts } from "./detectGhosts.js";
import { parseReport } from "./parseReport.js";

const SHA = "1135207e92c40354543cbd15c763c7a61d79d432";

// Calls the real GitHub API (no token). Run with `npm run test:live`.
describe("detectGhosts against the real GitHub (lukeed/sirv)", () => {
  it("builds a valid report", async () => {
    const result = await detectGhosts("https://github.com/lukeed/sirv", {
      ref: SHA,
    });

    if (!result.ok) {
      if (result.error.code === "RATE_LIMITED") {
        const match = /resets at (.+?)\. Try again/.exec(result.error.message);
        const reset = match?.[1] ?? result.error.message;
        throw new Error(
          `GitHub rate limit reached (60 requests per hour without a token). Wait until the limit resets (${reset}) and run npm run test:live again.`,
        );
      }
      throw new Error(`${result.error.code}: ${result.error.message}`);
    }

    const report = result.value;
    expect(report.overview.ref).toBe(SHA);
    expect(report.ghosts.length).toBeGreaterThanOrEqual(1);
    expect(report.ghosts.length).toBeLessThanOrEqual(5);
    for (const g of report.ghosts) {
      expect(Number.isInteger(g.difficultyScore)).toBe(true);
      expect(g.difficultyScore).toBeGreaterThanOrEqual(0);
      expect(g.difficultyScore).toBeLessThanOrEqual(100);
    }
    for (let i = 1; i < report.ghosts.length; i++) {
      const a = report.ghosts[i - 1]!;
      const b = report.ghosts[i]!;
      const ordered =
        a.difficultyScore < b.difficultyScore ||
        (a.difficultyScore === b.difficultyScore && a.path < b.path);
      expect(ordered).toBe(true);
    }

    const parsed = parseReport(JSON.stringify(report));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(report);
  });
});
