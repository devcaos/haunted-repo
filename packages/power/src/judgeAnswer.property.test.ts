// Feature: kiro-power, Property 1: Strict verdict
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

  current(): Session {
    if (this.session === null) throw new Error("no session");
    return this.session;
  }
}

const noFetch = (() =>
  Promise.reject(new Error("fetch must not be used"))) as typeof fetch;

/** The state after the first `n` events of the tiny recording. */
function tiny(n: number): SessionState {
  let state = startSession(report).state;
  for (const event of tinyRecording.events.slice(0, n)) {
    const t = advance(state, event as ExorcismEvent);
    if (!t.ok) throw new Error(t.error.message);
    state = t.state;
  }
  return state;
}

// Asking src/a.ts, first question, no pendingQuestion, no ratings yet.
const ASKING = tiny(2);

const verdictArb = fc.constantFrom<Verdict>(
  "right",
  "half-right",
  "wrong",
  "dont-know",
);
const eolArb = fc.constantFrom("\n", "\r\n");
/** A short reason without line breaks, or no reason at all. */
const reasonArb = fc.option(fc.string({ maxLength: 30 }), { nil: null });
const trailingArb = fc.string({ unit: fc.constant(" "), maxLength: 3 });

function withReason(reason: string | null, eol: string, line: string): string {
  return reason === null ? line : `${reason}${eol}${line}`;
}

/** A reason, then one of the four VERDICT: lines. */
const validArb = fc
  .tuple(reasonArb, verdictArb, trailingArb, eolArb)
  .map(([reason, v, trailing, eol]) =>
    withReason(reason, eol, `VERDICT: ${v}${trailing}`),
  );

/** Texts parseVerdict must reject. */
const nearMissArb = fc.oneof(
  // A leading space before VERDICT: (also as the whole text).
  fc
    .tuple(reasonArb, verdictArb, eolArb, fc.integer({ min: 1, max: 3 }))
    .map(([reason, v, eol, n]) =>
      withReason(reason, eol, `${" ".repeat(n)}VERDICT: ${v}`),
    ),
  // Bold.
  fc
    .tuple(reasonArb, verdictArb, eolArb)
    .map(([reason, v, eol]) => withReason(reason, eol, `**VERDICT: ${v}**`)),
  // A full stop.
  fc
    .tuple(reasonArb, verdictArb, eolArb)
    .map(([reason, v, eol]) => withReason(reason, eol, `VERDICT: ${v}.`)),
  // Lowercase.
  fc
    .tuple(reasonArb, verdictArb, eolArb)
    .map(([reason, v, eol]) => withReason(reason, eol, `verdict: ${v}`)),
  // Two VERDICT: lines, the last one invalid.
  fc
    .tuple(reasonArb, verdictArb, verdictArb, eolArb)
    .map(([reason, a, b, eol]) =>
      withReason(reason, eol, `VERDICT: ${a}${eol}VERDICT: ${b}.`),
    ),
  // Empty.
  fc.constant(""),
  // Only spaces (and line breaks).
  fc.string({ unit: fc.constantFrom(" ", "\n"), minLength: 1, maxLength: 6 }),
);

describe("judge_answer: Property 1, strict verdict", () => {
  it("near misses are texts parseVerdict rejects", () => {
    fc.assert(
      fc.property(nearMissArb, (text) => {
        expect(parseVerdict(text).ok).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("an Event is sent iff parseVerdict accepts the text, with its Verdict", async () => {
    // **Validates: Requirements 5.1, 5.2, 5.3, 5.8, 6.2**
    await fc.assert(
      fc.asyncProperty(fc.oneof(validArb, nearMissArb), async (judgement) => {
        const power = new TestPower({
          fetch: noFetch,
          store: createMemoryStore(),
          storageOk: true,
        });
        power.setSession(ASKING);

        await power.judgeAnswer({ question: Q, judgement });

        const after = power.current().state;
        const expected = parseVerdict(judgement);
        if (!expected.ok) {
          // No Event: the very same state, no rating recorded.
          expect(after).toBe(ASKING);
          expect(after.step).toBe("asking");
          expect(after.current?.ratings).toEqual([]);
          return;
        }
        if (expected.value === "dont-know") {
          expect(after.step).toBe("simplifying");
          expect(after.current?.ratings).toEqual([]);
          expect(after.current?.pendingQuestion).toBe(Q);
        } else {
          expect(after.step).toBe("asking");
          expect(after.current?.ratings).toEqual([expected.value]);
        }
        expect(after.asked["src/a.ts"]).toEqual([Q]);
      }),
      { numRuns: 200 },
    );
  });
});
