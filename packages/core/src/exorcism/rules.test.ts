import { describe, expect, it } from "vitest";
import {
  differentQuestionsSentence,
  RULE_IDS,
  RULE_SENTENCES,
  sameQuestionSentence,
} from "./rules.js";

describe("RULE_SENTENCES", () => {
  it("has a non-empty sentence for every RuleId and no extra keys", () => {
    expect(Object.keys(RULE_SENTENCES).sort()).toEqual([...RULE_IDS].sort());
    for (const id of RULE_IDS) {
      expect(RULE_SENTENCES[id].trim()).not.toBe("");
    }
  });

  it("has no repeated sentence", () => {
    const sentences = RULE_IDS.map((id) => RULE_SENTENCES[id]);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("verdict-format contains the four exact VERDICT lines", () => {
    const s = RULE_SENTENCES["verdict-format"];
    for (const v of ["right", "half-right", "wrong", "dont-know"]) {
      expect(s).toContain(`\`VERDICT: ${v}\``);
    }
  });

  it("contains no line number", () => {
    for (const id of RULE_IDS) {
      expect(RULE_SENTENCES[id]).not.toMatch(/\blines?\s*#?\d/i);
    }
  });

  it("builds the sentences with a gap from the question texts", () => {
    const different = differentQuestionsSentence(["What is A?", "What is B?"]);
    expect(different).toContain(RULE_SENTENCES["different-questions"]);
    expect(different).toContain('"What is A?" "What is B?"');
    expect(sameQuestionSentence("What is A?")).toBe(
      `${RULE_SENTENCES["same-question"]} "What is A?"`,
    );
  });
});
