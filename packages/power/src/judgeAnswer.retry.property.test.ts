// Feature: kiro-power, Property 2: Bounded retry
import {
  advance,
  formatProgress,
  parseVerdict,
  startSession,
} from "@haunted-repo/core";
import type { ExorcismEvent, SessionState, Verdict } from "@haunted-repo/core";
import { tinyRecording } from "core-testutil/exorcism/tinySession.testutil.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { HauntedPower, type Session } from "./power.js";
import { createMemoryStore } from "./store.js";
import { MAX_VERDICT_RETRIES } from "./verdictGate.js";

// The tiny report: demo/tiny on ref "main", ghosts src/a.ts, src/b.ts, src/c.ts.
const report = tinyRecording.report;
const Q = "What does this file give to the rest of the project?";

/** A Power whose in-memory session a test can set and read. */
class TestPower extends HauntedPower {
  setSession(state: SessionState): void {
    this.session = {
      owner: report.overview.owner,
      repo: report.overview.repo,
      report,
      state,
      invalidCount: 0,
    };
    this.savedProgress = formatProgress(state.progress);
  }

  /** Replaces the Session_State and keeps the Invalid_Judgement_Count. */
  setState(state: SessionState): void {
    this.current().state = state;
  }

  current(): Session {
    if (this.session === null) throw new Error("no session");
    return this.session;
  }
}

const noFetch = (() =>
  Promise.reject(new Error("fetch must not be used"))) as typeof fetch;

/** Every state of the tiny recording: states[n] is the one after n events. */
const states: SessionState[] = (() => {
  const list = [startSession(report).state];
  for (const event of tinyRecording.events) {
    const t = advance(list[list.length - 1]!, event as ExorcismEvent);
    if (!t.ok) throw new Error(t.error.message);
    list.push(t.state);
  }
  return list;
})();

// Asking src/a.ts, first question, no pendingQuestion, no ratings yet.
const ASKING = states[2]!;
/** States where judge_answer is not allowed (choosing, explaining, ...). */
const NOT_ASKING = states.filter((s) => s.step !== "asking");

const verdictArb = fc.constantFrom<Verdict>(
  "right",
  "half-right",
  "wrong",
  "dont-know",
);
const reasonArb = fc.option(fc.string({ maxLength: 20 }), { nil: null });

function withReason(reason: string | null, line: string): string {
  return reason === null ? line : `${reason}\n${line}`;
}

/** Texts parseVerdict accepts. */
const validArb = fc
  .tuple(reasonArb, verdictArb)
  .map(([reason, v]) => withReason(reason, `VERDICT: ${v}`));

/** Texts parseVerdict rejects. */
const invalidArb = fc.oneof(
  fc
    .tuple(reasonArb, verdictArb)
    .map(([reason, v]) => withReason(reason, ` VERDICT: ${v}`)),
  fc
    .tuple(reasonArb, verdictArb)
    .map(([reason, v]) => withReason(reason, `**VERDICT: ${v}**`)),
  fc
    .tuple(reasonArb, verdictArb)
    .map(([reason, v]) => withReason(reason, `VERDICT: ${v}.`)),
  fc.constant(""),
  fc.constant("   "),
);

type Call =
  | { kind: "judge"; judgement: string }
  | { kind: "outside"; judgement: string; state: SessionState };

const callArb: fc.Arbitrary<Call> = fc.oneof(
  {
    weight: 2,
    arbitrary: validArb.map((j) => ({ kind: "judge", judgement: j }) as Call),
  },
  {
    weight: 5,
    arbitrary: invalidArb.map((j) => ({ kind: "judge", judgement: j }) as Call),
  },
  {
    weight: 1,
    arbitrary: fc
      .tuple(fc.oneof(validArb, invalidArb), fc.constantFrom(...NOT_ASKING))
      .map(([j, state]) => ({ kind: "outside", judgement: j, state }) as Call),
  },
);

describe("judge_answer: Property 2, bounded retry", () => {
  it("retries are bounded and a rejected judgement changes nothing", async () => {
    // **Validates: Requirements 5.4, 5.6, 5.7, 5.9, 5.11, 9.4**
    await fc.assert(
      fc.asyncProperty(
        fc.array(callArb, { minLength: 1, maxLength: 20 }),
        async (calls) => {
          const power = new TestPower({
            fetch: noFetch,
            store: createMemoryStore(),
            storageOk: true,
          });
          power.setSession(ASKING);
          let expectedCount = 0;
          let retriesInARow = 0;

          for (const call of calls) {
            if (call.kind === "outside") {
              // 5.11, 9.4: refused before parseVerdict; count and state stay.
              power.setState(call.state);
              const answer = await power.judgeAnswer({
                question: Q,
                judgement: call.judgement,
              });
              expect(answer).toMatchObject({
                ok: false,
                code: "INVALID_EVENT",
              });
              expect(power.current().state).toBe(call.state);
              expect(power.current().invalidCount).toBe(expectedCount);
              power.setState(ASKING);
              continue;
            }

            const before = power.current().state;
            const answer = await power.judgeAnswer({
              question: Q,
              judgement: call.judgement,
            });
            const after = power.current();

            if (parseVerdict(call.judgement).ok) {
              // Accepted: an Event reached the Engine, the count is 0.
              expect(answer.ok).toBe(true);
              expect(after.state).not.toBe(before);
              expect(after.invalidCount).toBe(0);
              expectedCount = 0;
              retriesInARow = 0;
              power.setState(ASKING);
              continue;
            }

            // Rejected: no Event, the very same state object.
            expect(after.state).toBe(before);
            const next = expectedCount + 1;
            if (next <= MAX_VERDICT_RETRIES) {
              retriesInARow += 1;
              expect(answer).toMatchObject({
                ok: false,
                code: "INVALID_VERDICT",
                retry: true,
                triesLeft: MAX_VERDICT_RETRIES + 1 - next,
              });
              expect(after.invalidCount).toBe(next);
              expectedCount = next;
            } else {
              // The third rejection in a row is the Verdict_Failure.
              expect(answer).toMatchObject({
                ok: false,
                code: "VERDICT_FAILED",
                retry: false,
              });
              expect(after.invalidCount).toBe(0);
              expectedCount = 0;
              retriesInARow = 0;
            }
            expect(retriesInARow).toBeLessThanOrEqual(MAX_VERDICT_RETRIES);
            expect(after.invalidCount).toBeLessThanOrEqual(
              MAX_VERDICT_RETRIES + 1,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
