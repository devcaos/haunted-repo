import { describe, expect, it } from "vitest";
import type { Ghost } from "../ghost-detection/types.js";
import { buildInstructions } from "./instructions.js";
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
