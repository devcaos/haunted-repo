import { describe, expect, it } from "vitest";
import { contentOf, parseDemoScript } from "./demoScript.js";
import type { GhostContent } from "./demoScript.js";

function content(path: string): GhostContent {
  return {
    path,
    kind: "logic",
    explanation: "This file decides which file to send.",
    retryExplanation: "Think of a waiter who picks a plate.",
    questions: ["What happens first?", "What if it fails?", "What comes out?"],
    simpler: ["Simpler one.", "Simpler two.", "Simpler three."],
    modelAnswers: ["Answer one.", "Answer two.", "Answer three."],
  };
}

function scriptText(ghosts: unknown[]): string {
  return JSON.stringify({ ghosts });
}

function withField(field: keyof GhostContent, value: unknown): string {
  return scriptText([{ ...content("a.js"), [field]: value }]);
}

describe("parseDemoScript", () => {
  it("accepts a valid script", () => {
    const result = parseDemoScript(
      scriptText([content("a.js"), content("b.js")]),
    );
    expect(result).toEqual({
      ok: true,
      value: { ghosts: [content("a.js"), content("b.js")] },
    });
  });

  it("accepts an empty list of ghosts", () => {
    expect(parseDemoScript(scriptText([]))).toEqual({
      ok: true,
      value: { ghosts: [] },
    });
  });

  it.each([
    ["path", "  "],
    ["explanation", ""],
    ["retryExplanation", " \n "],
    ["questions", ["What happens first?", "", "What comes out?"]],
    ["simpler", ["Simpler one.", "Simpler two.", "\t"]],
    ["modelAnswers", ["", "Answer two.", "Answer three."]],
  ] as const)("rejects a blank text in %s", (field, value) => {
    expect(parseDemoScript(withField(field, value)).ok).toBe(false);
  });

  it("rejects a repeated question", () => {
    const text = withField("questions", ["Same?", "Other?", "Same?"]);
    expect(parseDemoScript(text).ok).toBe(false);
  });

  it.each(["questions", "simpler", "modelAnswers"] as const)(
    "rejects 2 or 4 items in %s",
    (field) => {
      const two = content("a.js")[field].slice(0, 2);
      const four = [...content("a.js")[field], "One more."];
      expect(parseDemoScript(withField(field, two)).ok).toBe(false);
      expect(parseDemoScript(withField(field, four)).ok).toBe(false);
    },
  );

  it("rejects a repeated path", () => {
    const text = scriptText([content("a.js"), content("a.js")]);
    expect(parseDemoScript(text).ok).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(parseDemoScript(withField("kind", "config")).ok).toBe(false);
  });

  it.each([
    ["a number as the script", "42"],
    ["null as the script", "null"],
    ["ghosts that is not a list", JSON.stringify({ ghosts: {} })],
    ["an extra key in the script", JSON.stringify({ ghosts: [], more: 1 })],
    ["an entry that is not an object", scriptText(["a.js"])],
    ["a number as a question", withField("questions", [1, 2, 3])],
    ["a list as the explanation", withField("explanation", ["text"])],
    [
      "a missing field",
      scriptText([{ ...content("a.js"), simpler: undefined }]),
    ],
    ["an extra field", scriptText([{ ...content("a.js"), extra: "x" }])],
  ])("rejects a wrong type: %s", (_name, text) => {
    expect(parseDemoScript(text).ok).toBe(false);
  });

  it("rejects invalid JSON without throwing", () => {
    expect(parseDemoScript("{ not json").ok).toBe(false);
    expect(parseDemoScript("").ok).toBe(false);
  });
});

describe("contentOf", () => {
  const script = { ghosts: [content("a.js"), content("b.js")] };

  it("finds the content of a path", () => {
    expect(contentOf(script, "b.js")).toEqual(content("b.js"));
  });

  it("returns null for a missing path", () => {
    expect(contentOf(script, "c.js")).toBeNull();
  });

  it("returns null when there is no script", () => {
    expect(contentOf(null, "a.js")).toBeNull();
  });
});
