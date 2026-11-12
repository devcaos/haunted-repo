import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ALLOWED_EVENTS, parseEvent } from "./event.js";

describe("parseEvent", () => {
  it("accepts each valid event", () => {
    const valid = [
      { type: "pick-ghost", path: "src/a.ts", text: "code" },
      { type: "pick-ghost", path: "src/a.ts", text: "" },
      { type: "explanation-done", text: "It does X." },
      { type: "answer-rated", rating: "right", question: "What returns?" },
      { type: "answer-rated", rating: "half-right", question: "Q" },
      { type: "answer-rated", rating: "wrong", question: "Q" },
      { type: "dont-know", question: "Q" },
      { type: "self-check-answered", answer: "yes" },
      { type: "self-check-answered", answer: "half" },
      { type: "self-check-answered", answer: "no" },
      { type: "retry-ghost" },
      { type: "leave-ghost" },
    ];
    for (const event of valid) {
      expect(parseEvent(event)).toStrictEqual({ ok: true, value: event });
    }
  });

  it("rejects missing fields, wrong types and blank text", () => {
    const invalid: unknown[] = [
      { type: "pick-ghost", text: "x" },
      { type: "pick-ghost", path: "a" },
      { type: "pick-ghost", path: 1, text: "x" },
      { type: "pick-ghost", path: "a", text: null },
      { type: "explanation-done" },
      { type: "explanation-done", text: "   " },
      { type: "explanation-done", text: 5 },
      { type: "answer-rated", question: "Q" },
      { type: "answer-rated", rating: "great", question: "Q" },
      { type: "answer-rated", rating: "right", question: " " },
      { type: "answer-rated", rating: "right" },
      { type: "dont-know" },
      { type: "dont-know", question: "" },
      { type: "self-check-answered" },
      { type: "self-check-answered", answer: "maybe" },
      { type: "unknown" },
      {},
    ];
    for (const event of invalid) {
      const result = parseEvent(event);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_EVENT");
        expect(result.error.message).not.toBe("");
      }
    }
  });

  it("rejects non-objects", () => {
    for (const raw of [null, undefined, 3, "pick-ghost", true, []]) {
      const result = parseEvent(raw);
      expect(result.ok).toBe(false);
    }
  });

  it("drops unknown fields, including sampleAnswer", () => {
    expect(
      parseEvent({
        type: "answer-rated",
        rating: "right",
        question: "Q",
        sampleAnswer: "secret",
        extra: 1,
      }),
    ).toStrictEqual({
      ok: true,
      value: { type: "answer-rated", rating: "right", question: "Q" },
    });
    expect(
      parseEvent({ type: "dont-know", question: "Q", sampleAnswer: "a" }),
    ).toStrictEqual({
      ok: true,
      value: { type: "dont-know", question: "Q" },
    });
    expect(parseEvent({ type: "leave-ghost", extra: true })).toStrictEqual({
      ok: true,
      value: { type: "leave-ghost" },
    });
  });

  it("never throws for any input", () => {
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        expect(() => parseEvent(raw)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});

describe("ALLOWED_EVENTS", () => {
  it("matches the table of Requirement 10.4", () => {
    expect(ALLOWED_EVENTS).toStrictEqual({
      choosing: ["pick-ghost"],
      explaining: ["explanation-done", "leave-ghost"],
      asking: ["answer-rated", "dont-know", "leave-ghost"],
      simplifying: ["explanation-done", "leave-ghost"],
      "model-answer": ["explanation-done", "leave-ghost"],
      "self-check": ["self-check-answered"],
      failed: ["retry-ghost", "pick-ghost"],
      "house-clean": [],
    });
  });
});
