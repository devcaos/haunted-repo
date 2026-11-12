import fc from "fast-check";
import type { HauntedReport } from "../ghost-detection/types.js";
import { reportArb } from "../ghost-detection/reportArb.testutil.js";
import { advance, startSession } from "./engine.js";
import type {
  ExorcismEvent,
  Rating,
  SessionState,
  StudentProfile,
  TutorInstructions,
} from "./types.js";

const RATINGS: Rating[] = ["right", "half-right", "wrong"];

/**
 * The events the engine MUST accept in this state.
 * Independent oracle of Requirement 10.4: written here, not taken from the engine.
 */
export function validEventsFor(state: SessionState): ExorcismEvent[] {
  switch (state.step) {
    case "choosing":
      return state.progress.ghosts
        .filter((entry) => entry.state === "haunted")
        .map((entry) => ({
          type: "pick-ghost",
          path: entry.path,
          text: `const value = "${entry.path}";`,
        }));
    case "explaining":
      return [
        { type: "explanation-done", text: "A simple explanation." },
        { type: "leave-ghost" },
      ];
    case "asking": {
      const question =
        state.current?.pendingQuestion ??
        `Question ${String(state.current?.questionIndex ?? 0)}?`;
      return [
        ...RATINGS.map((rating): ExorcismEvent => ({
          type: "answer-rated",
          rating,
          question,
        })),
        { type: "dont-know", question },
        { type: "leave-ghost" },
      ];
    }
    case "simplifying":
    case "model-answer":
      return [
        { type: "explanation-done", text: "Another explanation." },
        { type: "leave-ghost" },
      ];
    case "self-check":
      return [
        { type: "self-check-answered", answer: "yes" },
        { type: "self-check-answered", answer: "half" },
        { type: "self-check-answered", answer: "no" },
      ];
    case "failed":
      return [
        { type: "retry-ghost" },
        ...state.progress.ghosts
          .filter((entry) => entry.state === "haunted")
          .map((entry): ExorcismEvent => ({
            type: "pick-ghost",
            path: entry.path,
            text: `const value = "${entry.path}";`,
          })),
      ];
    case "house-clean":
      return [];
  }
}

/**
 * Starts a session and, at each step, picks validEventsFor(state)[choice % length].
 * Stops when there are no valid events or the choices run out.
 */
export function driveSession(
  report: HauntedReport,
  profile: StudentProfile | null,
  choices: readonly number[],
): {
  states: SessionState[];
  instructions: TutorInstructions[];
  events: ExorcismEvent[];
} {
  const start = startSession(
    report,
    profile === null ? undefined : { profile },
  );
  let state = start.state;
  const states = [state];
  const instructions = [start.instructions];
  const events: ExorcismEvent[] = [];
  for (const choice of choices) {
    const options = validEventsFor(state);
    const event = options[choice % Math.max(options.length, 1)];
    if (event === undefined) break;
    const result = advance(state, event);
    if (!result.ok) {
      throw new Error(`advance refused ${event.type}: ${result.error.message}`);
    }
    state = result.state;
    states.push(state);
    instructions.push(result.instructions);
    events.push(event);
  }
  return { states, instructions, events };
}

/** A report whose ghosts have unique, non-empty paths (built from the index). */
export const driverReportArb: fc.Arbitrary<HauntedReport> = reportArb.map(
  (report) => ({
    ...report,
    ghosts: report.ghosts.slice(0, 5).map((ghost, index) => ({
      ...ghost,
      path: `src/file${String(index)}.ts`,
    })),
  }),
);

export const choicesArb: fc.Arbitrary<number[]> = fc.array(fc.nat(), {
  maxLength: 200,
});

export const profileArb: fc.Arbitrary<StudentProfile | null> = fc.option(
  fc.record({ knowsJava: fc.boolean() }),
  { nil: null },
);

/**
 * Values that look like events for this state: arbitrary values, real events
 * (also in the wrong step, with blank text, with exorcised or unknown paths)
 * and real events with a field removed or replaced by an arbitrary value.
 */
export function eventLikeArb(state: SessionState): fc.Arbitrary<unknown> {
  const paths = [
    ...state.progress.ghosts.map((entry) => entry.path),
    "unknown/path.ts",
  ];
  const text = fc.oneof(
    fc.string(),
    fc.constantFrom("", "  ", "\n\t", "Some text."),
  );
  const real: fc.Arbitrary<Record<string, unknown>> = fc.oneof(
    fc.record({
      type: fc.constant("pick-ghost"),
      path: fc.constantFrom(...paths),
      text,
    }),
    fc.record({ type: fc.constant("explanation-done"), text }),
    fc.record({
      type: fc.constant("answer-rated"),
      rating: fc.constantFrom("right", "half-right", "wrong", "great"),
      question: text,
    }),
    fc.record({ type: fc.constant("dont-know"), question: text }),
    fc.record({
      type: fc.constant("self-check-answered"),
      answer: fc.constantFrom("yes", "half", "no", "maybe"),
    }),
    fc.record({ type: fc.constant("retry-ghost") }),
    fc.record({ type: fc.constant("leave-ghost") }),
  );
  const broken = real.chain((event) => {
    const key = fc.constantFrom(...Object.keys(event));
    return fc.oneof(
      key.map((k) => {
        const rest = { ...event };
        delete rest[k];
        return rest;
      }),
      fc
        .tuple(key, fc.anything())
        .map(([k, value]) => ({ ...event, [k]: value })),
    );
  });
  return fc.oneof(fc.anything(), real, broken);
}
