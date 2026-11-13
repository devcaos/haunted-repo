/// <reference types="node" />
import { readFileSync } from "node:fs";
import fc from "fast-check";
import type {
  ErrorCode,
  Floor,
  HauntedReport,
  Result,
} from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportArb } from "../../../core/src/ghost-detection/reportArb.testutil.js";
import { loadSample } from "../sample/sampleData.js";
import { buildSampleHouse } from "./houseView.js";
import { outcomeOf } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { createPage } from "./page.js";
import type { DetectFn } from "./page.js";
import { createRecordingRenderer } from "./recordingRenderer.testutil.js";
import { TEXTS } from "./texts.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const committed = loadSample(
  readCommitted("../sample/report.json"),
  readCommitted("../sample/files.json"),
);
if (!committed.ok) throw new Error(committed.error);
const sampleReport = committed.value.report;

// Independent of outcome.ts. The Record type makes a new Core code a compile error here.
const EXPECTED_OUTCOME: Readonly<Record<ErrorCode, Outcome>> = {
  INVALID_URL: "show-message",
  REPO_NOT_FOUND: "show-message",
  EMPTY_REPO: "show-message",
  NO_SUPPORTED_FILES: "show-message",
  RATE_LIMITED: "fallback",
  NETWORK_ERROR: "fallback",
  INVALID_REPORT: "fallback",
};
const ALL_CODES = Object.keys(EXPECTED_OUTCOME) as ErrorCode[];

const FLOORS: readonly Floor[] = ["attic", "middle floor", "basement"];
const LIVE_URL = "https://github.com/o/r";

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network is forbidden in tests");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("page controller properties (PR 1)", () => {
  it("gives every error code exactly one outcome", async () => {
    // Feature: web-demo, Property 3: Every error code has exactly one outcome
    // **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    await fc.assert(
      fc.asyncProperty(
        fc.option(reportArb, { nil: null }), // a live report shown before, or the sample
        fc.option(fc.constantFrom(...FLOORS), { nil: null }), // floor in focus, or the house
        fc.oneof(
          fc.record({
            kind: fc.constant("error" as const),
            code: fc.constantFrom(...ALL_CODES),
            message: fc.string(),
          }),
          fc.record({
            kind: fc.constant("throw" as const),
            thrown: fc.anything(),
          }),
        ),
        async (earlier, floor, failure) => {
          if (failure.kind === "error") {
            expect(outcomeOf(failure.code)).toBe(
              EXPECTED_OUTCOME[failure.code],
            );
          }

          let next: () => Promise<Result<HauntedReport>> = () => {
            throw new Error("detect called with no answer set");
          };
          const detect = vi.fn<DetectFn>(() => next());
          const renderer = createRecordingRenderer();
          const page = createPage({ detect, sample: committed }, renderer);
          page.start();

          if (earlier !== null) {
            next = () => Promise.resolve({ ok: true, value: earlier });
            await page.dispatch({ type: "submit-live", url: LIVE_URL });
          }
          if (floor !== null) {
            await page.dispatch({ type: "go-to-floor", floor });
          }
          const before = page.current();

          next =
            failure.kind === "error"
              ? () =>
                  Promise.resolve({
                    ok: false,
                    error: { code: failure.code, message: failure.message },
                  })
              : () => Promise.reject(failure.thrown);
          await page.dispatch({ type: "submit-live", url: LIVE_URL });

          const last = renderer.last();
          expect(last.live.busy).toBe(false);
          const outcome =
            failure.kind === "error"
              ? EXPECTED_OUTCOME[failure.code]
              : "fallback";
          if (outcome === "fallback") {
            expect(last.scene).toEqual({ kind: "house" });
            expect(last.house).toEqual(buildSampleHouse(sampleReport, null));
            expect(last.status).toEqual({
              kind: "fallback",
              text: TEXTS.fallback,
            });
          } else {
            expect(last.scene).toEqual(before.scene);
            expect(last.house).toEqual(before.house);
            expect(last.status).toEqual({
              kind: "error",
              text: failure.kind === "error" ? failure.message : "",
            });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
