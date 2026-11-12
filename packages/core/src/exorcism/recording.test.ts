import { describe, expect, it } from "vitest";
import type { HauntedReport } from "../ghost-detection/types.js";
import { formatRecording, parseRecording, replay } from "./recording.js";
import { tinyRecording, tinyRecordingJson } from "./tinySession.testutil.js";
import type { RecordedEvent, SessionRecording } from "./types.js";

const report: HauntedReport = {
  overview: {
    owner: "o",
    repo: "r",
    ref: "main",
    analysed: 3,
    picked: 2,
    truncated: false,
    fewFiles: true,
    partial: false,
    skipped: [],
    message: "Small project.",
  },
  ghosts: [
    {
      path: "src/a.ts",
      language: "TypeScript",
      difficultyScore: 50,
      floor: "middle floor",
      factors: { lines: 10, branches: 2, maxIndent: 1, imports: 3 },
      reason: "It has many lines.",
    },
    {
      path: "src/b.ts",
      language: "TypeScript",
      difficultyScore: 60,
      floor: "middle floor",
      factors: { lines: 12, branches: 2, maxIndent: 1, imports: 3 },
      reason: "It has many lines.",
    },
  ],
};

const recording: SessionRecording = {
  report,
  progress: {
    ghosts: [
      { path: "src/a.ts", state: "haunted", ratings: [], selfCheck: null },
    ],
  },
  profile: { knowsJava: true },
  events: [
    { type: "pick-ghost", path: "src/a.ts", text: "const a = 1;" },
    { type: "explanation-done", text: "It stores a number." },
    { type: "answer-rated", rating: "right", question: "What is a?" },
    { type: "dont-know", question: "What is b?" },
    { type: "leave-ghost" },
  ],
};

function withChanges(changes: Record<string, unknown>): string {
  return JSON.stringify({ ...recording, ...changes });
}

function expectInvalid(text: string): void {
  const result = parseRecording(text);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe("INVALID_SESSION");
    expect(result.error.message).not.toBe("");
  }
}

describe("parseRecording", () => {
  it("parses a valid recording back to an equal value", () => {
    expect(parseRecording(formatRecording(recording))).toStrictEqual({
      ok: true,
      value: recording,
    });
  });

  it("accepts null progress and null profile", () => {
    const value = { ...recording, progress: null, profile: null };
    expect(parseRecording(formatRecording(value))).toStrictEqual({
      ok: true,
      value,
    });
  });

  it("rejects text that is not JSON", () => {
    expectInvalid("not json");
  });

  it("rejects values that are not objects", () => {
    expectInvalid("null");
    expectInvalid("[]");
  });

  it("rejects a bad report", () => {
    expectInvalid(withChanges({ report: { ghosts: [] } }));
    expectInvalid(withChanges({ report: undefined }));
  });

  it("rejects a report with repeated ghost paths", () => {
    const [first] = report.ghosts;
    const repeated = { ...report, ghosts: [first, first] };
    expectInvalid(withChanges({ report: repeated }));
  });

  it("rejects a bad progress", () => {
    expectInvalid(withChanges({ progress: { ghosts: "x" } }));
    expectInvalid(withChanges({ progress: undefined }));
  });

  it("rejects a bad profile", () => {
    expectInvalid(withChanges({ profile: { knowsJava: "yes" } }));
    expectInvalid(withChanges({ profile: [] }));
  });

  it("rejects events that are not a list or have a bad event", () => {
    expectInvalid(withChanges({ events: "x" }));
    expectInvalid(withChanges({ events: [{ type: "fly" }] }));
    expectInvalid(
      withChanges({ events: [{ type: "dont-know", question: " " }] }),
    );
  });

  it("rejects a sampleAnswer that is not a string", () => {
    expectInvalid(
      withChanges({
        events: [{ type: "dont-know", question: "Q?", sampleAnswer: 5 }],
      }),
    );
  });

  it("rejects a sampleAnswer on an event that does not allow it", () => {
    expectInvalid(
      withChanges({ events: [{ type: "retry-ghost", sampleAnswer: "x" }] }),
    );
  });

  it("round-trips a recording with sampleAnswer strictly", () => {
    const withSample: SessionRecording = {
      ...recording,
      events: [
        {
          type: "answer-rated",
          rating: "half-right",
          question: "What is a?",
          sampleAnswer: "A number.",
        },
        { type: "dont-know", question: "What is b?", sampleAnswer: "" },
        { type: "dont-know", question: "What is c?" },
      ],
    };
    const result = parseRecording(formatRecording(withSample));
    expect(result).toStrictEqual({ ok: true, value: withSample });
    if (result.ok) {
      expect("sampleAnswer" in (result.value.events[2] ?? {})).toBe(false);
    }
  });

  it("drops unknown fields from events", () => {
    const result = parseRecording(
      withChanges({ events: [{ type: "leave-ghost", extra: 1 }] }),
    );
    expect(result).toStrictEqual({
      ok: true,
      value: { ...recording, events: [{ type: "leave-ghost" }] },
    });
  });
});

describe("committed fixture", () => {
  it("parses, replays and reaches the expected steps", () => {
    const parsed = parseRecording(tinyRecordingJson);
    expect(parsed).toStrictEqual({ ok: true, value: tinyRecording });
    if (!parsed.ok) return;
    const result = replay(parsed.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const steps = result.value.steps;
    const at = (i: number) => steps[i]?.state;
    expect(steps).toHaveLength(tinyRecording.events.length + 1);
    expect(at(0)?.step).toBe("choosing");
    expect(at(5)?.step).toBe("self-check");
    expect(at(6)?.step).toBe("choosing");
    expect(at(6)?.progress.ghosts[0]?.state).toBe("exorcised");
    expect(at(6)?.progress.ghosts[0]?.selfCheck).toBe("yes");
    expect(at(9)?.step).toBe("simplifying");
    // After the second dont-know: model answer, rated wrong.
    expect(at(11)?.step).toBe("model-answer");
    expect(at(11)?.current?.ratings).toStrictEqual(["wrong"]);
    // After the failing decision.
    expect(at(14)?.step).toBe("failed");
    expect(at(14)?.progress.ghosts[1]?.state).toBe("haunted");
    // After retry-ghost the old explanation is kept.
    expect(at(15)?.step).toBe("explaining");
    expect(at(15)?.current?.explanation).not.toBe("");
    expect(at(17)?.step).toBe("choosing");
    expect(at(17)?.current).toBeNull();
  });

  it("replays the same without any sampleAnswer", () => {
    expect(tinyRecording.events.some((e) => "sampleAnswer" in e)).toBe(true);
    const stripped: SessionRecording = {
      ...tinyRecording,
      events: tinyRecording.events.map((event) => {
        const copy: Record<string, unknown> = { ...event };
        delete copy["sampleAnswer"];
        return copy as unknown as RecordedEvent;
      }),
    };
    expect(replay(stripped)).toStrictEqual(replay(tinyRecording));
  });
});

describe("replay", () => {
  it("replays a short recording to the expected steps", () => {
    const result = replay(recording);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.map((s) => s.state.step)).toStrictEqual([
      "choosing",
      "explaining",
      "asking",
      "asking",
      "simplifying",
      "choosing",
    ]);
    const last = result.value.steps.at(-1);
    expect(last?.state.current).toBeNull();
    expect(last?.state.profile).toStrictEqual({ knowsJava: true });
    expect(last?.state.asked["src/a.ts"]).toStrictEqual([
      "What is a?",
      "What is b?",
    ]);
    for (const step of result.value.steps) {
      expect(step.instructions.step).toBe(step.state.step);
    }
  });

  it("starts without progress and profile when they are null", () => {
    const result = replay({
      ...recording,
      progress: null,
      profile: null,
      events: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.steps).toHaveLength(1);
      expect(result.value.steps[0]?.state.profile).toStrictEqual({
        knowsJava: false,
      });
    }
  });

  it("reports the position of an event in the wrong step", () => {
    const result = replay({
      ...recording,
      events: [
        { type: "pick-ghost", path: "src/a.ts", text: "const a = 1;" },
        { type: "self-check-answered", answer: "yes" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_SESSION");
      expect(result.error.message).toContain(
        'Event 2 (self-check-answered) is not accepted in the step "explaining".',
      );
    }
  });

  it("gives equal results when run twice", () => {
    expect(replay(recording)).toStrictEqual(replay(recording));
  });

  it("ignores sampleAnswer", () => {
    const withSample: SessionRecording = {
      ...recording,
      events: recording.events.map((event) =>
        event.type === "answer-rated" || event.type === "dont-know"
          ? { ...event, sampleAnswer: "Some student text." }
          : event,
      ),
    };
    expect(replay(withSample)).toStrictEqual(replay(recording));
  });
});
