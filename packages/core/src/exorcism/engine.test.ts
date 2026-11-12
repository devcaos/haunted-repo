import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Ghost, HauntedReport } from "../ghost-detection/types.js";
import { advance, decide, startSession } from "./engine.js";
import { ALLOWED_EVENTS } from "./event.js";
import {
  choicesArb,
  driverReportArb,
  driveSession,
  profileArb,
} from "./sessionArb.testutil.js";
import type {
  ExorcismEvent,
  ExorcismProgress,
  ExorcismStep,
  Rating,
  SessionState,
} from "./types.js";

function ghost(path: string, difficultyScore: number): Ghost {
  return {
    path,
    language: "TypeScript",
    difficultyScore,
    floor: "attic",
    factors: { lines: 1, branches: 0, maxIndent: 0, imports: 0 },
    reason: "It is easy.",
  };
}

function reportOf(
  ghosts: Ghost[],
  overview: Partial<HauntedReport["overview"]> = {},
): HauntedReport {
  return {
    overview: {
      owner: "o",
      repo: "r",
      ref: "main",
      analysed: ghosts.length,
      picked: ghosts.length,
      truncated: false,
      fewFiles: false,
      partial: false,
      skipped: [],
      message: null,
      ...overview,
    },
    ghosts,
  };
}

function progressOf(
  entries: readonly [string, "haunted" | "exorcised"][],
): ExorcismProgress {
  return {
    ghosts: entries.map(([path, state]) => ({
      path,
      state,
      ratings: [],
      selfCheck: null,
    })),
  };
}

describe("startSession", () => {
  it("starts in choosing without progress or profile", () => {
    const report = reportOf([ghost("a.ts", 20), ghost("b.ts", 10)]);
    const { state, instructions } = startSession(report);
    expect(state.step).toBe("choosing");
    expect(state.profile).toEqual({ knowsJava: false });
    expect(state.current).toBeNull();
    expect(state.asked).toEqual({});
    expect(state.ghosts).toEqual(report.ghosts);
    expect(state.progress).toEqual(
      progressOf([
        ["a.ts", "haunted"],
        ["b.ts", "haunted"],
      ]),
    );
    expect(instructions.step).toBe("choosing");
    expect(instructions.text).toContain("b.ts");
  });

  it("uses the given progress and profile", () => {
    const report = reportOf([ghost("a.ts", 20), ghost("b.ts", 10)]);
    const { state } = startSession(report, {
      progress: progressOf([
        ["a.ts", "haunted"],
        ["b.ts", "exorcised"],
      ]),
      profile: { knowsJava: true },
    });
    expect(state.step).toBe("choosing");
    expect(state.profile.knowsJava).toBe(true);
    expect(state.progress.ghosts[1]?.state).toBe("exorcised");
  });

  it("starts in house-clean when every ghost is exorcised", () => {
    const report = reportOf([ghost("a.ts", 20)]);
    const { state, instructions } = startSession(report, {
      progress: progressOf([["a.ts", "exorcised"]]),
    });
    expect(state.step).toBe("house-clean");
    expect(instructions.step).toBe("house-clean");
  });

  it("starts in house-clean when the report has 0 ghosts", () => {
    const { state } = startSession(reportOf([]));
    expect(state.step).toBe("house-clean");
    expect(state.ghosts).toEqual([]);
  });

  it("keeps the first ghost when a path is repeated", () => {
    const report = reportOf([ghost("a.ts", 20), ghost("a.ts", 5)]);
    const { state } = startSession(report);
    expect(state.ghosts).toHaveLength(1);
    expect(state.ghosts[0]?.difficultyScore).toBe(20);
    expect(state.progress.ghosts).toHaveLength(1);
  });

  it("starts normally with fewFiles and partial reports", () => {
    const report = reportOf([ghost("a.ts", 20)], {
      fewFiles: true,
      partial: true,
      message: "Few files.",
    });
    expect(startSession(report).state.step).toBe("choosing");
  });

  it("drops unknown paths from the given progress", () => {
    const report = reportOf([ghost("a.ts", 20)]);
    const { state } = startSession(report, {
      progress: progressOf([
        ["gone.ts", "exorcised"],
        ["a.ts", "haunted"],
      ]),
    });
    expect(state.progress.ghosts.map((g) => g.path)).toEqual(["a.ts"]);
  });

  it("does not share objects with the report", () => {
    const report = reportOf([ghost("a.ts", 20)]);
    const { state } = startSession(report);
    expect(state.ghosts[0]).not.toBe(report.ghosts[0]);
    expect(state.ghosts[0]?.factors).not.toBe(report.ghosts[0]?.factors);
  });
});

describe("decide", () => {
  const R: Rating = "right";
  const H: Rating = "half-right";
  const W: Rating = "wrong";
  // Hand-written table: [ratings, exorcised]
  const table: [[Rating, Rating, Rating], boolean][] = [
    [[R, R, R], true],
    [[R, R, H], true],
    [[R, R, W], true],
    [[R, H, R], true],
    [[R, H, H], true],
    [[R, H, W], true],
    [[R, W, R], true],
    [[R, W, H], true],
    [[R, W, W], false],
    [[H, R, R], true],
    [[H, R, H], true],
    [[H, R, W], true],
    [[H, H, R], true],
    [[H, H, H], true],
    [[H, H, W], true],
    [[H, W, R], true],
    [[H, W, H], true],
    [[H, W, W], false],
    [[W, R, R], false],
    [[W, R, H], false],
    [[W, R, W], false],
    [[W, H, R], false],
    [[W, H, H], false],
    [[W, H, W], false],
    [[W, W, R], false],
    [[W, W, H], false],
    [[W, W, W], false],
  ];

  it("covers all 27 combinations", () => {
    expect(table).toHaveLength(27);
    expect(new Set(table.map(([r]) => r.join())).size).toBe(27);
  });
  it.each(table)("decide(%j) is %s", (ratings, expected) => {
    expect(decide(ratings)).toBe(expected);
  });
  it("fails when 2 good ratings come with a wrong Core_Question", () => {
    expect(decide([W, R, R])).toBe(false);
  });
});

function started(): SessionState {
  const report = reportOf([ghost("a.ts", 20), ghost("b.ts", 10)]);
  return startSession(report).state;
}

function pick(state: SessionState, path = "b.ts"): SessionState {
  const r = advance(state, { type: "pick-ghost", path, text: "const x = 1;" });
  if (!r.ok) throw new Error(r.error.message);
  return r.state;
}

describe("advance: pick-ghost and explanation", () => {
  it("choosing + pick-ghost starts an attempt in explaining", () => {
    const r = advance(started(), {
      type: "pick-ghost",
      path: "b.ts",
      text: "const x = 1;",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("explaining");
    expect(r.state.current).toEqual({
      path: "b.ts",
      text: "const x = 1;",
      kind: "general",
      explanation: "",
      simpler: [],
      attemptStart: 0,
      questionIndex: 0,
      dontKnowCount: 0,
      pendingQuestion: null,
      ratings: [],
    });
    expect(r.instructions.step).toBe("explaining");
    expect(r.instructions.text).toContain("const x = 1;");
  });

  it("explaining + explanation-done goes to asking at question 0", () => {
    const r = advance(pick(started()), {
      type: "explanation-done",
      text: "It is a box.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("asking");
    expect(r.state.current?.explanation).toBe("It is a box.");
    expect(r.state.current?.questionIndex).toBe(0);
    expect(r.instructions.step).toBe("asking");
  });

  it("failed + pick-ghost starts a new attempt", () => {
    const failed: SessionState = { ...pick(started()), step: "failed" };
    const r = advance(failed, { type: "pick-ghost", path: "a.ts", text: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("explaining");
    expect(r.state.current?.path).toBe("a.ts");
    expect(r.state.current?.explanation).toBe("");
  });

  it("keeps asked of a previous attempt when the same ghost is picked again", () => {
    const base = pick(started());
    const withAsked: SessionState = {
      ...base,
      step: "failed",
      asked: { "b.ts": ["Q1?", "Q2?"] },
    };
    const r = advance(withAsked, {
      type: "pick-ghost",
      path: "b.ts",
      text: "x",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.asked).toEqual({ "b.ts": ["Q1?", "Q2?"] });
    expect(r.state.current?.attemptStart).toBe(2);
  });

  it("rejects an exorcised or unknown ghost and returns the same state", () => {
    const state = startSession(reportOf([ghost("a.ts", 1), ghost("b.ts", 2)]), {
      progress: progressOf([
        ["a.ts", "exorcised"],
        ["b.ts", "haunted"],
      ]),
    }).state;
    for (const path of ["a.ts", "nope.ts"]) {
      const r = advance(state, { type: "pick-ghost", path, text: "" });
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.error.code).toBe("INVALID_EVENT");
      expect(r.state).toEqual(state);
    }
  });

  it("rejects a blank explanation", () => {
    const state = pick(started());
    const r = advance(state, { type: "explanation-done", text: "   " });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_EVENT");
    expect(r.state).toEqual(state);
  });

  it("rejects malformed events", () => {
    const state = started();
    const r = advance(state, { type: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_EVENT");
  });

  const samples: Record<ExorcismEvent["type"], unknown> = {
    "pick-ghost": { type: "pick-ghost", path: "b.ts", text: "x" },
    "explanation-done": { type: "explanation-done", text: "t" },
    "answer-rated": { type: "answer-rated", rating: "right", question: "q?" },
    "dont-know": { type: "dont-know", question: "q?" },
    "self-check-answered": { type: "self-check-answered", answer: "yes" },
    "retry-ghost": { type: "retry-ghost" },
    "leave-ghost": { type: "leave-ghost" },
  };
  const steps: ExorcismStep[] = [
    "choosing",
    "explaining",
    "asking",
    "simplifying",
    "model-answer",
    "self-check",
    "failed",
    "house-clean",
  ];
  const cases = steps.flatMap((step) =>
    (Object.keys(samples) as ExorcismEvent["type"][])
      .filter((type) => !ALLOWED_EVENTS[step].includes(type))
      .map((type) => [step, type] as const),
  );

  it.each(cases)("%s does not accept %s", (step, type) => {
    const state: SessionState = { ...pick(started()), step };
    const r = advance(state, samples[type]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_EVENT");
    expect(r.state).toEqual(state);
  });
});

function step(state: SessionState, event: unknown): SessionState {
  const r = advance(state, event);
  if (!r.ok) throw new Error(r.error.message);
  return r.state;
}

function asking(): SessionState {
  return step(pick(started()), {
    type: "explanation-done",
    text: "It is a box.",
  });
}

const rated = (rating: Rating, question: string) => ({
  type: "answer-rated",
  rating,
  question,
});

describe("advance: asking, dont-know, simplifying and model answer", () => {
  it.each(["right", "half-right", "wrong"] as const)(
    "answer-rated %s stores the rating and moves to question 1",
    (rating) => {
      const r = advance(asking(), rated(rating, "Q0?"));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.state.step).toBe("asking");
      expect(r.state.current?.ratings).toEqual([rating]);
      expect(r.state.current?.questionIndex).toBe(1);
      expect(r.state.current?.pendingQuestion).toBeNull();
      expect(r.state.asked).toEqual({ "b.ts": ["Q0?"] });
    },
  );

  it("the Core_Question objective is the first one asked", () => {
    const r = advance(pick(started()), { type: "explanation-done", text: "x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.current?.questionIndex).toBe(0);
    expect(r.instructions.text).toContain("what the file is for");
  });

  it("dont-know the first time goes to simplifying without a rating", () => {
    const r = advance(asking(), { type: "dont-know", question: "Q0?" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("simplifying");
    expect(r.state.current?.ratings).toEqual([]);
    expect(r.state.current?.dontKnowCount).toBe(1);
    expect(r.state.current?.pendingQuestion).toBe("Q0?");
    expect(r.state.asked).toEqual({ "b.ts": ["Q0?"] });
    expect(r.instructions.text).toContain("It is a box.");
  });

  it("simplifying + explanation-done re-asks the same question", () => {
    const s1 = step(asking(), { type: "dont-know", question: "Q0?" });
    const r = advance(s1, { type: "explanation-done", text: "Simpler." });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("asking");
    expect(r.state.current?.simpler).toEqual(["Simpler."]);
    expect(r.state.current?.questionIndex).toBe(0);
    expect(r.state.current?.pendingQuestion).toBe("Q0?");
    expect(r.instructions.text).toContain("Q0?");
  });

  it("dont-know then an answer rates the question and does not record it twice", () => {
    const s1 = step(asking(), { type: "dont-know", question: "Q0?" });
    const s2 = step(s1, { type: "explanation-done", text: "Simpler." });
    const r = advance(s2, rated("half-right", "Q0?"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.current?.ratings).toEqual(["half-right"]);
    expect(r.state.current?.questionIndex).toBe(1);
    expect(r.state.current?.dontKnowCount).toBe(0);
    expect(r.state.current?.pendingQuestion).toBeNull();
    expect(r.state.asked).toEqual({ "b.ts": ["Q0?"] });
  });

  it("dont-know twice gives wrong and the model answer", () => {
    const s1 = step(asking(), { type: "dont-know", question: "Q0?" });
    const s2 = step(s1, { type: "explanation-done", text: "Simpler." });
    const r = advance(s2, { type: "dont-know", question: "Q0?" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("model-answer");
    expect(r.state.current?.ratings).toEqual(["wrong"]);
    expect(r.state.asked).toEqual({ "b.ts": ["Q0?"] });
    expect(r.instructions.text).toContain("Q0?");
  });

  it("model-answer + explanation-done moves to the next question", () => {
    const s1 = step(asking(), { type: "dont-know", question: "Q0?" });
    const s2 = step(s1, { type: "explanation-done", text: "Simpler." });
    const s3 = step(s2, { type: "dont-know", question: "Q0?" });
    const r = advance(s3, { type: "explanation-done", text: "Model." });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("asking");
    expect(r.state.current?.questionIndex).toBe(1);
    expect(r.state.current?.dontKnowCount).toBe(0);
    expect(r.state.current?.pendingQuestion).toBeNull();
    expect(r.state.current?.ratings).toEqual(["wrong"]);
  });

  it("does not mutate the input state", () => {
    const state = asking();
    const copy = structuredClone(state);
    advance(state, rated("right", "Q0?"));
    advance(state, { type: "dont-know", question: "Q0?" });
    expect(state).toEqual(copy);
  });
});

function answers(state: SessionState, ratings: Rating[]): SessionState {
  return ratings.reduce(
    (s, rating, i) => step(s, rated(rating, `Q${i}?`)),
    state,
  );
}

function entryOf(state: SessionState, path = "b.ts") {
  const entry = state.progress.ghosts.find((g) => g.path === path);
  if (entry === undefined) throw new Error("no entry");
  return entry;
}

describe("advance: decision, self-check, failed, retry and leave", () => {
  it("passes with 3 right ratings and goes to self-check", () => {
    const s = answers(asking(), ["right", "right", "right"]);
    expect(s.step).toBe("self-check");
    expect(entryOf(s)).toEqual({
      path: "b.ts",
      state: "exorcised",
      ratings: ["right", "right", "right"],
      selfCheck: null,
    });
  });

  it("passes with 2 good ratings and a wrong third", () => {
    const s = answers(asking(), ["right", "half-right", "wrong"]);
    expect(s.step).toBe("self-check");
    expect(entryOf(s).state).toBe("exorcised");
  });

  it("fails when the Core_Question is wrong even with 2 good ratings", () => {
    const s = answers(asking(), ["wrong", "right", "right"]);
    expect(s.step).toBe("failed");
    expect(entryOf(s).state).toBe("haunted");
    expect(entryOf(s).ratings).toEqual(["wrong", "right", "right"]);
  });

  it("decides after dont-know twice on the last question", () => {
    let s = answers(asking(), ["right", "right"]);
    s = step(s, { type: "dont-know", question: "Q2?" });
    s = step(s, { type: "explanation-done", text: "Simpler." });
    s = step(s, { type: "dont-know", question: "Q2?" });
    expect(s.step).toBe("model-answer");
    s = step(s, { type: "explanation-done", text: "Model." });
    expect(s.step).toBe("self-check");
    expect(entryOf(s).ratings).toEqual(["right", "right", "wrong"]);
  });

  it("self-check stores the answer and suggests the next ghost", () => {
    const s = step(answers(asking(), ["right", "right", "right"]), {
      type: "self-check-answered",
      answer: "half",
    });
    expect(s.step).toBe("choosing");
    expect(s.current).toBeNull();
    expect(entryOf(s).selfCheck).toBe("half");
  });

  it("the last self-check goes to house-clean", () => {
    const report = reportOf([ghost("b.ts", 10)]);
    let s = startSession(report).state;
    s = step(pick(s), { type: "explanation-done", text: "E." });
    s = step(answers(s, ["right", "right", "right"]), {
      type: "self-check-answered",
      answer: "yes",
    });
    expect(s.step).toBe("house-clean");
  });

  it("retry keeps the explanation and asks for a new analogy", () => {
    const failed = answers(asking(), ["wrong", "wrong", "wrong"]);
    const r = advance(failed, { type: "retry-ghost" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.step).toBe("explaining");
    expect(r.state.current?.explanation).toBe("It is a box.");
    expect(r.state.current?.ratings).toEqual([]);
    expect(r.state.current?.simpler).toEqual([]);
    expect(r.state.current?.questionIndex).toBe(0);
    expect(r.state.current?.attemptStart).toBe(3);
    expect(r.instructions.rules).toContain("new-analogy");
  });

  it("pick-ghost in failed starts another attempt", () => {
    const failed = answers(asking(), ["wrong", "wrong", "wrong"]);
    const s = pick(failed, "a.ts");
    expect(s.step).toBe("explaining");
    expect(s.current?.path).toBe("a.ts");
  });

  it.each(["explaining", "asking", "simplifying", "model-answer"] as const)(
    "leave-ghost in %s keeps the ghost haunted and keeps asked",
    (name) => {
      let s = asking();
      s = step(s, { type: "dont-know", question: "Q0?" });
      if (name === "explaining") s = pick(started());
      if (name === "asking")
        s = step(s, { type: "explanation-done", text: "S." });
      if (name === "model-answer") {
        s = step(s, { type: "explanation-done", text: "S." });
        s = step(s, { type: "dont-know", question: "Q0?" });
      }
      const before = s;
      const r = advance(s, { type: "leave-ghost" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.state.step).toBe("choosing");
      expect(r.state.current).toBeNull();
      expect(r.state.progress).toEqual(before.progress);
      expect(r.state.asked).toEqual(before.asked);
      expect(entryOf(r.state).state).toBe("haunted");
    },
  );

  it("leave-ghost in self-check and failed is INVALID_EVENT", () => {
    for (const ratings of [
      ["right", "right", "right"],
      ["wrong", "wrong", "wrong"],
    ] as Rating[][]) {
      const s = answers(asking(), ratings);
      const r = advance(s, { type: "leave-ghost" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("INVALID_EVENT");
      expect(r.state).toBe(s);
    }
  });
});

describe("bounded question loop", () => {
  const ACTIVE = ["explaining", "asking", "simplifying", "model-answer"];
  it("never loops: bounded questions, simplifications and events per attempt", () => {
    // Feature: exorcism, Property 5: Bounded loop
    // **Validates: Requirements 5.7, 5.8**
    fc.assert(
      fc.property(
        driverReportArb,
        profileArb,
        choicesArb,
        (report, profile, choices) => {
          const { states, events } = driveSession(report, profile, choices);
          let active = false;
          let count = 0;
          let simplifications = 0;
          let askings: number[] = [];
          let simplified: number[] = [];
          events.forEach((event, k) => {
            const before = states[k];
            const after = states[k + 1];
            if (before === undefined || after === undefined) return;
            if (event.type === "pick-ghost" || event.type === "retry-ghost") {
              active = true;
              count = 0;
              simplifications = 0;
              askings = [0, 0, 0];
              simplified = [0, 0, 0];
              return;
            }
            if (!active) return;
            count += 1;
            const index = before.current?.questionIndex ?? 0;
            if (
              before.step === "asking" &&
              (event.type === "answer-rated" || event.type === "dont-know")
            ) {
              askings[index] = (askings[index] ?? 0) + 1;
              expect(askings[index]).toBeLessThanOrEqual(2);
              if (
                event.type === "dont-know" &&
                before.current?.dontKnowCount === 0
              ) {
                simplified[index] = (simplified[index] ?? 0) + 1;
                simplifications += 1;
                expect(simplified[index]).toBeLessThanOrEqual(1);
                expect(simplifications).toBeLessThanOrEqual(3);
              }
            }
            if (!ACTIVE.includes(after.step)) {
              expect(count).toBeLessThanOrEqual(14);
              active = false;
            }
            expect(count).toBeLessThanOrEqual(14);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
