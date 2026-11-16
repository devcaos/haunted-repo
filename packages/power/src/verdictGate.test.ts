import { describe, expect, it } from "vitest";
import {
  gateJudgement,
  MAX_VERDICT_RETRIES,
  questionFor,
  verdictEvent,
} from "./verdictGate.js";

describe("gateJudgement", () => {
  it("accepts a valid last line and resets the count", () => {
    expect(gateJudgement("Good.\nVERDICT: half-right", 2)).toEqual({
      kind: "accepted",
      verdict: "half-right",
      count: 0,
    });
  });

  it("gives retries up to MAX_VERDICT_RETRIES, then a failure", () => {
    expect(MAX_VERDICT_RETRIES).toBe(2);
    const first = gateJudgement("VERDICT: right.", 0);
    expect(first).toMatchObject({ kind: "retry", count: 1, triesLeft: 2 });
    const second = gateJudgement("VERDICT: right.", 1);
    expect(second).toMatchObject({ kind: "retry", count: 2, triesLeft: 1 });
    const third = gateJudgement("VERDICT: right.", 2);
    expect(third).toMatchObject({ kind: "failure", count: 0 });
  });

  it("passes the parseVerdict message as the reason", () => {
    const decision = gateJudgement("A.\nVERDICT: wrong\nVERDICT: right", 0);
    expect(decision).toMatchObject({
      kind: "retry",
      reason:
        "There is more than one VERDICT line; give one verdict per question.",
    });
  });
});

describe("questionFor", () => {
  it("prefers the pendingQuestion over the Tutor's text", () => {
    expect(questionFor("Pending?", "Other?")).toBe("Pending?");
    expect(questionFor(null, "Other?")).toBe("Other?");
  });
});

describe("verdictEvent", () => {
  it("maps ratings to answer-rated and dont-know to dont-know", () => {
    expect(verdictEvent("wrong", "Q?")).toEqual({
      type: "answer-rated",
      rating: "wrong",
      question: "Q?",
    });
    expect(verdictEvent("dont-know", "Q?")).toEqual({
      type: "dont-know",
      question: "Q?",
    });
  });
});
