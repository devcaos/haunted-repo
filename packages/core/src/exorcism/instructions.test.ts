import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Ghost } from "../ghost-detection/types.js";
import { buildInstructions } from "./instructions.js";
import {
  choicesArb,
  driverReportArb,
  driveSession,
} from "./sessionArb.testutil.js";
import { textArb } from "../ghost-detection/textArb.testutil.js";
import { QUESTION_SETS } from "./questions.js";
import { RULE_SENTENCES } from "./rules.js";
import type {
  CurrentGhost,
  ExorcismStep,
  SessionState,
  StudentProfile,
} from "./types.js";

function ghost(path: string, difficultyScore: number): Ghost {
  return {
    path,
    language: "TypeScript",
    difficultyScore,
    floor: "attic",
    factors: { lines: 10, branches: 0, maxIndent: 1, imports: 0 },
    reason: `Reason of ${path}.`,
  };
}

function currentOf(text: string, explanation = ""): CurrentGhost {
  return {
    path: "src/a.ts",
    text,
    kind: "logic",
    explanation,
    simpler: [],
    attemptStart: 0,
    questionIndex: 0,
    dontKnowCount: 0,
    pendingQuestion: null,
    ratings: [],
  };
}

function stateOf(
  step: ExorcismStep,
  current: CurrentGhost | null,
  profile?: StudentProfile,
): SessionState {
  return {
    step,
    profile: profile as StudentProfile,
    ghosts: [ghost("src/a.ts", 20), ghost("src/b.ts", 50)],
    progress: {
      ghosts: [
        { path: "src/a.ts", state: "haunted", ratings: [], selfCheck: null },
        { path: "src/b.ts", state: "haunted", ratings: [], selfCheck: null },
      ],
    },
    asked: {},
    current,
  };
}

const STEPS: ExorcismStep[] = [
  "choosing",
  "explaining",
  "self-check",
  "failed",
  "house-clean",
];

describe("buildInstructions (steps without questions)", () => {
  it.each(STEPS)("%s: text has the sentence of every rule", (step) => {
    const current = step === "choosing" ? null : currentOf("const x = 1;");
    const ins = buildInstructions(stateOf(step, current, { knowsJava: true }));
    expect(ins.step).toBe(step);
    for (const id of ins.rules) {
      expect(ins.text).toContain(RULE_SENTENCES[id]);
    }
    expect(ins.rules).toContain("probable-reasons");
  });

  it("explaining has the path, the Ghost_Text and no question rule", () => {
    const ins = buildInstructions(
      stateOf("explaining", currentOf("const x = 1;")),
    );
    expect(ins.text).toContain("src/a.ts");
    expect(ins.text).toContain("const x = 1;");
    expect(ins.rules).toContain("no-question");
    expect(ins.rules).not.toContain("one-question");
    expect(ins.rules).not.toContain("new-analogy");
  });

  it("uses a fence longer than any backtick run in the text", () => {
    const text = "a ````` b `` c";
    const ins = buildInstructions(stateOf("explaining", currentOf(text)));
    expect(ins.text).toContain(`\n${"`".repeat(6)}\n${text}\n${"`".repeat(6)}`);
  });

  it("retry: contains the previous explanation and new-analogy", () => {
    const ins = buildInstructions(
      stateOf("explaining", currentOf("code", "Old explanation here.")),
    );
    expect(ins.text).toContain("Old explanation here.");
    expect(ins.rules).toContain("new-analogy");
    expect(ins.rules).toContain("no-question");
  });

  it.each([
    ["first explanation", ""],
    ["retry", "Old explanation here."],
  ])("explaining (%s): exactly one line starts with Task:", (_name, old) => {
    const ins = buildInstructions(
      stateOf("explaining", currentOf("code", old)),
    );
    const taskLines = ins.text
      .split("\n")
      .filter((line) => line.startsWith("Task:"));
    expect(taskLines).toHaveLength(1);
  });

  it("explaining has exactly one Java rule, from the profile", () => {
    const yes = buildInstructions(
      stateOf("explaining", currentOf("c"), { knowsJava: true }),
    );
    const no = buildInstructions(
      stateOf("explaining", currentOf("c"), { knowsJava: false }),
    );
    const missing = buildInstructions(stateOf("explaining", currentOf("c")));
    expect(yes.rules).toContain("java-allowed");
    expect(yes.rules).not.toContain("java-forbidden");
    expect(no.rules).toContain("java-forbidden");
    expect(no.rules).not.toContain("java-allowed");
    expect(missing.rules).toContain("java-forbidden");
    expect(missing.rules).not.toContain("java-allowed");
  });

  it("choosing suggests the easiest ghost and lists the haunted ones", () => {
    const ins = buildInstructions(stateOf("choosing", null));
    expect(ins.text).toContain("suggested to start with: src/a.ts (attic)");
    expect(ins.text).toContain("Reason of src/a.ts.");
    expect(ins.text).toContain("- src/b.ts (attic)");
    expect(ins.rules).toEqual(["probable-reasons"]);
  });

  it("self-check has the self-check-options rule", () => {
    const ins = buildInstructions(stateOf("self-check", currentOf("c")));
    expect(ins.rules).toContain("self-check-options");
  });

  it("failed and house-clean have no Java rule", () => {
    for (const step of ["failed", "house-clean"] as const) {
      const ins = buildInstructions(stateOf(step, currentOf("c")));
      expect(ins.rules).toEqual(["probable-reasons"]);
    }
  });
});

function questionState(
  step: ExorcismStep,
  patch: Partial<CurrentGhost>,
  asked: Record<string, string[]> = {},
  profile?: StudentProfile,
): SessionState {
  const state = stateOf(
    step,
    { ...currentOf("const x = 1;"), ...patch },
    profile,
  );
  return { ...state, asked };
}

describe("buildInstructions (steps with questions)", () => {
  it("new question: only the objective of the current index", () => {
    const ins = buildInstructions(
      questionState("asking", { kind: "logic", questionIndex: 1 }),
    );
    const [o0, o1, o2] = QUESTION_SETS.logic;
    expect(ins.text).toContain(o1);
    expect(ins.text).not.toContain(o0);
    expect(ins.text).not.toContain(o2);
    expect(ins.text).toContain("src/a.ts");
    expect(ins.text).toContain("const x = 1;");
    for (const id of [
      "one-question",
      "concrete-file",
      "ask-then-wait",
    ] as const) {
      expect(ins.rules).toContain(id);
    }
    expect(ins.rules).not.toContain("different-questions");
    expect(ins.rules).not.toContain("same-question");
    for (const id of ins.rules) {
      expect(ins.text).toContain(RULE_SENTENCES[id]);
    }
  });

  it("second attempt lists the questions of the first attempt", () => {
    const asked = { "src/a.ts": ["Old Q1?", "Old Q2?", "Old Q3?", "Now Q?"] };
    const ins = buildInstructions(
      questionState("asking", { attemptStart: 3 }, asked),
    );
    expect(ins.rules).toContain("different-questions");
    expect(ins.text).toContain("Old Q1?");
    expect(ins.text).toContain("Old Q3?");
    expect(ins.text).not.toContain("Now Q?");
  });

  it("re-ask contains the exact pending question and same-question", () => {
    const ins = buildInstructions(
      questionState("asking", { pendingQuestion: "What does f return?" }),
    );
    expect(ins.rules).toContain("same-question");
    expect(ins.rules).toContain("ask-then-wait");
    expect(ins.rules).toContain("judge-behaviour");
    expect(ins.rules).not.toContain("one-question");
    expect(ins.text).toContain(
      'Ask the student exactly this question again: "What does f return?"',
    );
  });

  it("ask-then-wait appears in every asking instruction", () => {
    for (const pendingQuestion of [null, "Q?"]) {
      const ins = buildInstructions(
        questionState("asking", { pendingQuestion }),
      );
      expect(ins.text).toContain(RULE_SENTENCES["ask-then-wait"]);
    }
  });

  it("asking has exactly one Java rule from the profile", () => {
    const yes = buildInstructions(
      questionState("asking", {}, {}, { knowsJava: true }),
    );
    const no = buildInstructions(questionState("asking", {}));
    expect(yes.rules).toContain("java-allowed");
    expect(yes.rules).not.toContain("java-forbidden");
    expect(no.rules).toContain("java-forbidden");
    expect(no.rules).not.toContain("java-allowed");
  });

  it("simplifying contains the explanation given before and earlier simpler ones", () => {
    const ins = buildInstructions(
      questionState("simplifying", {
        explanation: "First explanation.",
        simpler: ["Simpler one."],
        pendingQuestion: "Why?",
      }),
    );
    expect(ins.text).toContain("First explanation.");
    expect(ins.text).toContain("Simpler one.");
    expect(ins.text).toContain("Why?");
    expect(ins.text).toContain("const x = 1;");
    for (const id of [
      "new-analogy",
      "only-this-part",
      "max-words",
      "no-question",
    ] as const) {
      expect(ins.rules).toContain(id);
    }
    for (const id of ins.rules) {
      expect(ins.text).toContain(RULE_SENTENCES[id]);
    }
  });

  it("model-answer contains the question and asks for a short answer", () => {
    const ins = buildInstructions(
      questionState("model-answer", { pendingQuestion: "What breaks?" }),
    );
    expect(ins.text).toContain("What breaks?");
    expect(ins.text).toContain("src/a.ts");
    expect(ins.rules).toContain("model-answer-short");
    expect(ins.rules).toContain("no-question");
    expect(ins.rules).toContain("java-forbidden");
    for (const id of ins.rules) {
      expect(ins.text).toContain(RULE_SENTENCES[id]);
    }
  });
});

describe("Java rule property", () => {
  it("java-allowed iff knowsJava, java-forbidden otherwise, never both", () => {
    // Feature: exorcism, Property 2: Java rule
    // **Validates: Requirements 2.8, 2.9, 2.10**
    const javaSteps: ExorcismStep[] = [
      "explaining",
      "asking",
      "simplifying",
      "model-answer",
    ];
    fc.assert(
      fc.property(
        driverReportArb,
        fc.option(fc.boolean(), { nil: null }),
        choicesArb,
        (report, knowsJava, choices) => {
          const profile = knowsJava === null ? null : { knowsJava };
          const { states, instructions } = driveSession(
            report,
            profile,
            choices,
          );
          states.forEach((state, k) => {
            if (!javaSteps.includes(state.step)) return;
            const rules = instructions[k]?.rules ?? [];
            const allowed = rules.includes("java-allowed");
            const forbidden = rules.includes("java-forbidden");
            expect(allowed).toBe(knowsJava === true);
            expect(forbidden).toBe(knowsJava !== true);
            expect(allowed && forbidden).toBe(false);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("new question property", () => {
  const allObjectives = Object.values(QUESTION_SETS).flat();
  const cleanOf = (s: string): boolean =>
    !allObjectives.some((objective) => s.includes(objective));
  const cleanTextArb = textArb.filter(cleanOf);
  const questionArb = fc
    .string({ minLength: 1 })
    .filter((s) => s.trim() !== "" && cleanOf(s));

  it("a new question has the fixed rules, only its objective and the earlier questions", () => {
    // Feature: exorcism, Property 4: Instruction rules for a new question
    // **Validates: Requirements 3.1, 4.9, 4.10, 4.11, 4.12, 4.13**
    fc.assert(
      fc.property(
        driverReportArb,
        choicesArb,
        cleanTextArb,
        fc.array(questionArb, { minLength: 1, maxLength: 6 }),
        (report, choices, ghostText, questions) => {
          const { states } = driveSession(report, null, choices);
          for (const driven of states) {
            const driving = driven.current;
            if (
              driven.step !== "asking" ||
              driving === null ||
              driving.pendingQuestion !== null
            ) {
              continue;
            }
            // Random Ghost_Text and random earlier questions, same lengths.
            const earlierAsked = (driven.asked[driving.path] ?? []).map(
              (_, i) => questions[i % questions.length] as string,
            );
            const state: SessionState = {
              ...driven,
              current: { ...driving, text: ghostText },
              asked: { ...driven.asked, [driving.path]: earlierAsked },
            };
            const ins = buildInstructions(state);
            for (const rule of [
              "one-question",
              "concrete-file",
              "ask-then-wait",
              "no-lines",
              "probable-reasons",
            ] as const) {
              expect(ins.rules).toContain(rule);
            }
            expect(ins.text).toContain(driving.path);
            const objectives = QUESTION_SETS[driving.kind];
            objectives.forEach((objective, i) => {
              if (i === driving.questionIndex) {
                expect(ins.text).toContain(objective);
              } else {
                expect(ins.text).not.toContain(objective);
              }
            });
            const earlier = earlierAsked.slice(0, driving.attemptStart);
            expect(ins.rules.includes("different-questions")).toBe(
              earlier.length > 0,
            );
            for (const question of earlier) {
              expect(ins.text).toContain(question);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
