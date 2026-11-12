import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ALLOWED_EVENTS } from "./event.js";
import { advance } from "./engine.js";
import {
  choicesArb,
  driveSession,
  driverReportArb,
  profileArb,
  validEventsFor,
} from "./sessionArb.testutil.js";
import type { ExorcismEvent, ExorcismStep } from "./types.js";

const ALL_TYPES: ExorcismEvent["type"][] = [
  "pick-ghost",
  "explanation-done",
  "answer-rated",
  "dont-know",
  "self-check-answered",
  "retry-ghost",
  "leave-ghost",
];

describe("session driver", () => {
  it("accepts exactly the events of the oracle in every driven state", () => {
    fc.assert(
      fc.property(
        driverReportArb,
        profileArb,
        choicesArb,
        (report, profile, choices) => {
          const { states } = driveSession(report, profile, choices);
          for (const state of states) {
            const valid = validEventsFor(state);
            const validTypes = new Set(valid.map((e) => e.type));
            // the oracle events are accepted
            for (const event of valid) {
              expect(advance(state, event).ok).toBe(true);
            }
            // the allowed table has the same event types as the oracle
            const allowed = new Set<string>(
              ALLOWED_EVENTS[state.step as ExorcismStep],
            );
            expect(allowed).toStrictEqual(validTypes);
            // an event type outside the oracle is refused
            for (const type of ALL_TYPES) {
              if (validTypes.has(type)) continue;
              const result = advance(state, sampleOfType(type));
              expect(result.ok).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("ends in house-clean or when the choices run out", () => {
    fc.assert(
      fc.property(
        driverReportArb,
        profileArb,
        choicesArb,
        (report, profile, choices) => {
          const { states, events } = driveSession(report, profile, choices);
          expect(events.length).toBeLessThanOrEqual(choices.length);
          expect(states).toHaveLength(events.length + 1);
          const last = states[states.length - 1];
          if (events.length < choices.length) {
            expect(last?.step).toBe("house-clean");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("keeps every state and instruction JSON-safe", () => {
    fc.assert(
      fc.property(
        driverReportArb,
        profileArb,
        choicesArb,
        (report, profile, choices) => {
          const { states, instructions } = driveSession(
            report,
            profile,
            choices,
          );
          for (const x of [...states, ...instructions]) {
            expect(JSON.parse(JSON.stringify(x))).toStrictEqual(x);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

function sampleOfType(type: ExorcismEvent["type"]): ExorcismEvent {
  switch (type) {
    case "pick-ghost":
      return { type, path: "src/file0.ts", text: "x" };
    case "explanation-done":
      return { type, text: "text" };
    case "answer-rated":
      return { type, rating: "right", question: "Q?" };
    case "dont-know":
      return { type, question: "Q?" };
    case "self-check-answered":
      return { type, answer: "yes" };
    case "retry-ghost":
    case "leave-ghost":
      return { type };
  }
}
