/// <reference types="node" />
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import fc from "fast-check";
import { advance, detectGhosts, startSession } from "@haunted-repo/core";
import type {
  ErrorCode,
  Floor,
  HauntedReport,
  Rating,
  Result,
  SelfCheck,
  SessionState,
} from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { choicesArb } from "../../../core/src/exorcism/sessionArb.testutil.js";
import { reportArb } from "../../../core/src/ghost-detection/reportArb.testutil.js";
import { loadSample } from "../sample/sampleData.js";
import { isAvailable } from "./actions.js";
import { createFakeFetch } from "./fakeDetect.testutil.js";
import type { UserAction } from "./actions.js";
import { parseDemoScript } from "./demoScript.js";
import { fullScriptFor } from "./demoScript.testutil.js";
import { outcomeOf } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { createPage } from "./page.js";
import type { DetectFn, EngineFns } from "./page.js";
import { createRecordingRenderer } from "./recordingRenderer.testutil.js";
import { TEXTS } from "./texts.js";
import type { ViewModel } from "./viewModel.js";

/** P8 link: a card can start exactly when start-ghost for its path is available. */
function expectCanStartMatchesAvailable(model: ViewModel): void {
  const cards = model.house?.floors.flatMap((floor) => floor.ghosts) ?? [];
  for (const card of cards) {
    expect(card.canStart).toBe(
      model.available.some(
        (a) => a.type === "start-ghost" && a.path === card.path,
      ),
    );
  }
  for (const action of model.available) {
    if (action.type !== "start-ghost") continue;
    expect(cards.some((card) => card.path === action.path)).toBe(true);
  }
}

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const committed = loadSample(
  readCommitted("../sample/report.json"),
  readCommitted("../sample/files.json"),
);
if (!committed.ok) throw new Error(committed.error);
const sampleReport = committed.value.report;
const committedScript = parseDemoScript(
  readCommitted("../sample/demo-script.json"),
);
if (!committedScript.ok) throw new Error(committedScript.error);

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
const RATINGS: readonly Rating[] = ["right", "half-right", "wrong"];
const SELF_CHECKS: readonly SelfCheck[] = ["yes", "half", "no"];

// All 13 action types, with parameters from the design (P10).
const pathArb = fc.oneof(
  fc.constantFrom(...sampleReport.ghosts.map((ghost) => ghost.path)),
  fc.string(),
);
const userActionArb: fc.Arbitrary<UserAction> = fc.oneof(
  fc.record({ type: fc.constant("submit-live" as const), url: fc.string() }),
  fc.constant({ type: "show-sample" as const }),
  fc.constant({ type: "go-to-house" as const }),
  fc.record({
    type: fc.constant("go-to-floor" as const),
    floor: fc.constantFrom(...FLOORS),
  }),
  fc.record({ type: fc.constant("start-ghost" as const), path: pathArb }),
  fc.constant({ type: "explanation-continue" as const }),
  fc.constant({ type: "show-model-answer" as const }),
  fc.record({
    type: fc.constant("rate" as const),
    rating: fc.constantFrom(...RATINGS),
  }),
  fc.constant({ type: "dont-know" as const }),
  fc.record({
    type: fc.constant("self-check" as const),
    answer: fc.constantFrom(...SELF_CHECKS),
  }),
  fc.constant({ type: "retry" as const }),
  fc.constant({ type: "back-to-list" as const }),
  fc.constant({ type: "leave-ghost" as const }),
);

// Outcome of a live analysis (P7, P9): an ok report, an error result, or a throw.
const liveOutcomeArb = fc.oneof(
  fc.record({ kind: fc.constant("ok" as const), report: reportArb }),
  fc.record({
    kind: fc.constant("error" as const),
    code: fc.constantFrom(...ALL_CODES),
    message: fc.string(),
  }),
  fc.record({
    kind: fc.constant("throw" as const),
    thrown: fc.anything(),
  }),
);

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
          const page = createPage(
            { detect, sample: committed, script: null },
            renderer,
          );
          page.start();
          const openingHouse = page.current().house; // the sample with its progress

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
            expect(last.house).toEqual(openingHouse);
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

  it("runs only one live analysis at a time", async () => {
    // Feature: web-demo, Property 7: Only one live analysis runs at a time
    // **Validates: Requirements 4.3, 4.4, 4.5**
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }), // extra submits while pending
        liveOutcomeArb,
        async (extra, outcome) => {
          let settle: (
            result: Result<HauntedReport> | { thrown: unknown },
          ) => void = () => {
            throw new Error("detect was not called");
          };
          const renderer = createRecordingRenderer();
          const modelsAtCall: ReturnType<typeof renderer.last>[] = [];
          const detect = vi.fn<DetectFn>(() => {
            modelsAtCall.push(renderer.last());
            return new Promise<Result<HauntedReport>>((resolve, reject) => {
              settle = (result) => {
                if ("thrown" in result) reject(result.thrown);
                else resolve(result);
              };
            });
          });
          const page = createPage(
            { detect, sample: committed, script: null },
            renderer,
          );
          page.start();

          const first = page.dispatch({ type: "submit-live", url: LIVE_URL });
          for (let i = 0; i < extra; i++) {
            await page.dispatch({ type: "submit-live", url: LIVE_URL });
          }
          expect(detect).toHaveBeenCalledTimes(1);

          const atCall = modelsAtCall[0];
          expect(atCall?.live.busy).toBe(true);
          expect(atCall?.available).not.toContainEqual({
            type: "submit-live",
          });

          if (outcome.kind === "ok") {
            settle({ ok: true, value: outcome.report });
          } else if (outcome.kind === "error") {
            settle({
              ok: false,
              error: { code: outcome.code, message: outcome.message },
            });
          } else {
            settle({ thrown: outcome.thrown });
          }
          await first;
          expect(detect).toHaveBeenCalledTimes(1);

          const last = renderer.last();
          expect(last.live.busy).toBe(false);
          expect(last.available).toContainEqual({ type: "submit-live" });

          const again = page.dispatch({ type: "submit-live", url: LIVE_URL });
          expect(detect).toHaveBeenCalledTimes(2);
          settle({ ok: true, value: sampleReport });
          await again;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("ignores every unavailable action in every scene", async () => {
    // Feature: web-demo, Property 10: Unavailable actions change nothing
    // **Validates: Requirements 4.3, 4.9, 4.10, 6.17, 11.7, 11.8, 18.1, 18.2, 18.3, 18.4**
    await fc.assert(
      fc.asyncProperty(
        choicesArb, // the path: each choice picks from model.available
        fc.array(userActionArb, { minLength: 1, maxLength: 10 }),
        async (choices, candidates) => {
          let settle: ((result: Result<HauntedReport>) => void) | null = null;
          const detect = vi.fn<DetectFn>(
            () =>
              new Promise<Result<HauntedReport>>((resolve) => {
                settle = resolve;
              }),
          );
          // The engine is wrapped so the test sees the session object the
          // controller holds: the one from startSession and each ok advance.
          let session: SessionState | null = null;
          const engine = {
            startSession: vi.fn<EngineFns["startSession"]>((report, opts) => {
              const started = startSession(report, opts);
              session = started.state;
              return started;
            }),
            advance: vi.fn<EngineFns["advance"]>((state, event) => {
              const result = advance(state, event);
              if (result.ok) session = result.state;
              return result;
            }),
          };
          const renderer = createRecordingRenderer();
          const page = createPage(
            {
              detect,
              sample: committed,
              script: committedScript.value,
              engine,
            },
            renderer,
          );
          page.start();

          // Walk a random path of available actions, ghost actions included.
          // A live analysis ends ok,
          // ends in fallback, or stays pending (busy) for the rest of the run.
          let pending: Promise<void> | null = null;
          for (const choice of choices) {
            const options = page.current().available;
            const picked = options[choice % Math.max(options.length, 1)];
            if (picked === undefined) break;
            if (picked.type !== "submit-live") {
              await page.dispatch(picked);
              continue;
            }
            const run = page.dispatch({ type: "submit-live", url: LIVE_URL });
            const mode = Math.floor(choice / options.length) % 3;
            const finish = settle as
              ((result: Result<HauntedReport>) => void) | null;
            if (mode === 2 || finish === null) {
              pending = run; // busy: submit-live is no longer available
              continue;
            }
            finish(
              mode === 0
                ? { ok: true, value: sampleReport }
                : {
                    ok: false,
                    error: { code: "NETWORK_ERROR", message: "offline" },
                  },
            );
            await run;
          }

          expectCanStartMatchesAvailable(page.current());
          for (const action of candidates) {
            if (isAvailable(page.current(), action)) continue;
            const before = structuredClone(page.current());
            const renders = renderer.models.length;
            const detectCalls = detect.mock.calls.length;
            const startCalls = engine.startSession.mock.calls.length;
            const advanceCalls = engine.advance.mock.calls.length;
            const kept = session as SessionState | null;
            const keptCopy = structuredClone(kept);

            await page.dispatch(action);

            expect(page.current()).toEqual(before);
            expect(renderer.models.length).toBe(renders);
            expect(detect.mock.calls.length).toBe(detectCalls);
            expect(engine.startSession.mock.calls.length).toBe(startCalls);
            expect(engine.advance.mock.calls.length).toBe(advanceCalls);
            expect(session).toBe(kept);
            expect(kept).toStrictEqual(keptCopy);
          }

          if (pending !== null) {
            const finish = settle as
              ((result: Result<HauntedReport>) => void) | null;
            finish?.({ ok: true, value: sampleReport });
            await pending;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("renders plain data with consistent scenes in every scene", async () => {
    // Feature: web-demo, Property 11: The View_Model is plain data and scenes are consistent
    // **Validates: Requirements 4.3, 4.9, 4.10, 6.17, 11.7, 11.8, 18.1, 18.2, 18.3, 18.4**
    // URLs for submit-live: ok, show-message (missing repo, invalid URL).
    // The fake answers 403 rate limit after 12 requests, so later runs fall back.
    const liveUrls = [
      LIVE_URL,
      "https://github.com/o/missing",
      "not a url",
    ] as const;
    const line = "const a = 1;\n";
    await fc.assert(
      fc.asyncProperty(
        choicesArb, // the path: each choice picks from model.available
        async (choices) => {
          const fake = createFakeFetch(
            [
              {
                owner: "o",
                repo: "r",
                truncated: false,
                files: {
                  "src/a.ts": line.repeat(30),
                  "src/b.ts": line.repeat(60),
                  "lib/c.ts": line.repeat(90),
                },
              },
            ],
            { rateLimitAfter: 12 },
          );
          const detect = vi.fn<DetectFn>((url) =>
            detectGhosts(url, { fetch: fake.fetch }),
          );
          const renderer = createRecordingRenderer();
          const page = createPage(
            { detect, sample: committed, script: committedScript.value },
            renderer,
          );
          page.start();

          // The path includes ghost actions with the committed script.
          for (const choice of choices) {
            const options = page.current().available;
            const picked = options[choice % Math.max(options.length, 1)];
            if (picked === undefined) break;
            if (picked.type === "submit-live") {
              const pick = Math.floor(choice / options.length);
              const url = liveUrls[pick % liveUrls.length] ?? LIVE_URL;
              await page.dispatch({ type: "submit-live", url });
            } else {
              await page.dispatch(picked);
            }
          }

          let previous: (typeof renderer.models)[number] | null = null;
          for (const model of renderer.models) {
            expect(model).toStrictEqual(JSON.parse(JSON.stringify(model)));
            const inGhost = model.scene.kind === "ghost";
            expect(model.ghost === null).toBe(!inGhost);
            if (model.scene.kind === "ghost") {
              expect(model.ghost?.path).toBe(model.scene.path);
              expect(model.ghost?.floor).toBe(model.scene.floor);
            }
            expect(model.live.formVisible).toBe(!inGhost);
            expectCanStartMatchesAvailable(model);
            if (previous === null) {
              expect(model.transition).toBeNull();
            } else if (isDeepStrictEqual(model.scene, previous.scene)) {
              expect(model.transition).toBeNull();
            } else {
              expect(model.transition).toStrictEqual({
                from: previous.scene,
                to: model.scene,
              });
            }
            if (model.scene.kind === "floor") {
              expect(model.available).not.toContainEqual({
                type: "go-to-floor",
                floor: model.scene.floor,
              });
            }
            previous = model;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("page controller properties (PR 2)", () => {
  it("keeps the Sample_Session through a live analysis", async () => {
    // Feature: web-demo, Property 9: A live analysis never changes the Sample_Session
    // **Validates: Requirements 4.11, 4.12**
    const scripts = [committedScript.value, fullScriptFor(sampleReport)];
    await fc.assert(
      fc.asyncProperty(
        choicesArb, // the judge path: each choice picks from model.available
        fc.constantFrom(...scripts),
        liveOutcomeArb,
        async (choices, script, outcome) => {
          // The engine is wrapped so the test sees every session object the
          // controller can hold: the one from startSession and each ok advance.
          let session: SessionState | null = null;
          const engine = {
            startSession: vi.fn<EngineFns["startSession"]>((report, opts) => {
              const started = startSession(report, opts);
              session = started.state;
              return started;
            }),
            advance: vi.fn<EngineFns["advance"]>((state, event) => {
              const result = advance(state, event);
              if (result.ok) session = result.state;
              return result;
            }),
          };
          const detect = vi.fn<DetectFn>(() => {
            if (outcome.kind === "ok") {
              return Promise.resolve({ ok: true, value: outcome.report });
            }
            if (outcome.kind === "error") {
              return Promise.resolve({
                ok: false,
                error: { code: outcome.code, message: outcome.message },
              });
            }
            return Promise.reject(outcome.thrown);
          });
          const renderer = createRecordingRenderer();
          const page = createPage(
            { detect, sample: committed, script, engine },
            renderer,
          );
          page.start();

          // Judge path on the sample, without live analyses.
          for (const choice of choices) {
            const options = page
              .current()
              .available.filter((a) => a.type !== "submit-live");
            const picked = options[choice % Math.max(options.length, 1)];
            if (picked === undefined) break;
            await page.dispatch(picked);
          }
          // Stop in a house or floor scene: leave the open ghost, if any.
          if (page.current().scene.kind === "ghost") {
            const exit = page
              .current()
              .available.find(
                (a) =>
                  a.type === "leave-ghost" ||
                  a.type === "back-to-list" ||
                  a.type === "self-check",
              );
            if (exit === undefined) {
              throw new Error("no way out of the ghost scene");
            }
            await page.dispatch(exit);
          }
          expect(page.current().scene.kind).not.toBe("ghost");

          const before = page.current().house;
          const kept = session as SessionState | null;
          if (kept === null) throw new Error("no session was started");
          const keptCopy = structuredClone(kept);
          const startCalls = engine.startSession.mock.calls.length;
          const advanceCalls = engine.advance.mock.calls.length;

          await page.dispatch({ type: "submit-live", url: LIVE_URL });
          if (isAvailable(page.current(), { type: "show-sample" })) {
            await page.dispatch({ type: "show-sample" });
          }

          // No new session, and the kept one is not changed in place.
          expect(engine.startSession.mock.calls.length).toBe(startCalls);
          expect(engine.advance.mock.calls.length).toBe(advanceCalls);
          expect(session).toBe(kept);
          expect(kept).toStrictEqual(keptCopy);

          // The sample house has the same card states and progress.
          const after = page.current().house;
          expect(after?.source).toBe("sample");
          expect(after?.floors).toStrictEqual(before?.floors);
          expect(after?.progress).toStrictEqual(before?.progress);

          // The controller still holds that same object: the next engine
          // call receives it.
          const start = page
            .current()
            .available.find((a) => a.type === "start-ghost");
          if (start !== undefined) {
            await page.dispatch(start);
            expect(engine.advance.mock.calls.at(-1)?.[0]).toBe(kept);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
