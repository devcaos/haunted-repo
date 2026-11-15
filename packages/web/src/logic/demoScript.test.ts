import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { FileKind } from "@haunted-repo/core";
import { contentOf, parseDemoScript } from "./demoScript.js";
import type { GhostContent } from "./demoScript.js";

const KINDS: readonly FileKind[] = [
  "data-shape",
  "logic",
  "entry-point",
  "general",
];
const LIST_FIELDS = ["questions", "simpler", "modelAnswers"] as const;
const TEXT_FIELDS = ["path", "explanation", "retryExplanation"] as const;
const ALL_FIELDS = ["kind", ...TEXT_FIELDS, ...LIST_FIELDS] as const;

const textArb = fc.string({ minLength: 1 }).filter((s) => s.trim() !== "");
const blankArb = fc.constantFrom("", " ", "\t", "\n ", "  \r\n");
const threeTextsArb = fc.tuple(textArb, textArb, textArb);

const contentArb: fc.Arbitrary<GhostContent> = fc.record({
  path: textArb,
  kind: fc.constantFrom(...KINDS),
  explanation: textArb,
  retryExplanation: textArb,
  questions: fc
    .uniqueArray(textArb, { minLength: 3, maxLength: 3 })
    .map((q) => [q[0], q[1], q[2]] as [string, string, string]),
  simpler: threeTextsArb,
  modelAnswers: threeTextsArb,
});

const ghostsArb = fc.uniqueArray(contentArb, {
  minLength: 1,
  maxLength: 4,
  selector: (ghost) => ghost.path,
});

/** True when a value, after a JSON round trip, would be valid for this field. */
function validFor(field: (typeof ALL_FIELDS)[number], value: unknown): boolean {
  const back: unknown =
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  if (field === "kind") return KINDS.includes(back as FileKind);
  if ((TEXT_FIELDS as readonly string[]).includes(field)) {
    return typeof back === "string" && back.trim() !== "";
  }
  return (
    Array.isArray(back) &&
    back.length === 3 &&
    back.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

/** One change that always makes a complete script incomplete. */
type Mutation = (ghosts: Record<string, unknown>[], at: number) => void;

const mutationArb: fc.Arbitrary<Mutation> = fc.oneof(
  // Blank a text (a single text field or one item of a list).
  fc
    .tuple(fc.constantFrom(...TEXT_FIELDS, ...LIST_FIELDS), fc.nat(2), blankArb)
    .map(([field, item, blank]): Mutation => (ghosts, at) => {
      const ghost = ghosts[at]!;
      if ((TEXT_FIELDS as readonly string[]).includes(field)) {
        ghost[field] = blank;
      } else {
        const list = [...(ghost[field] as string[])];
        list[item] = blank;
        ghost[field] = list;
      }
    }),
  // Repeat a question.
  fc
    .tuple(fc.nat(2), fc.integer({ min: 1, max: 2 }))
    .map(([from, shift]): Mutation => (ghosts, at) => {
      const ghost = ghosts[at]!;
      const list = [...(ghost.questions as string[])];
      list[(from + shift) % 3] = list[from]!;
      ghost.questions = list;
    }),
  // Drop one list item.
  fc
    .tuple(fc.constantFrom(...LIST_FIELDS), fc.nat(2))
    .map(([field, item]): Mutation => (ghosts, at) => {
      const ghost = ghosts[at]!;
      ghost[field] = (ghost[field] as string[]).filter((_, i) => i !== item);
    }),
  // Add one list item.
  fc
    .tuple(fc.constantFrom(...LIST_FIELDS), textArb)
    .map(([field, extra]): Mutation => (ghosts, at) => {
      const ghost = ghosts[at]!;
      ghost[field] = [...(ghost[field] as string[]), extra];
    }),
  // Repeat a path: add a copy of another entry with the same path.
  fc.constant<Mutation>((ghosts, at) => {
    ghosts.push({ ...ghosts[at]! });
  }),
  // Unknown kind.
  fc
    .string()
    .filter((kind) => !KINDS.includes(kind as FileKind))
    .map((kind): Mutation => (ghosts, at) => {
      ghosts[at]!.kind = kind;
    }),
  // Replace a field with any value that is not valid for it.
  fc.constantFrom(...ALL_FIELDS).chain((field) =>
    fc
      .anything()
      .filter((value) => !validFor(field, value))
      .map((value): Mutation => (ghosts, at) => {
        ghosts[at]![field] = value;
      }),
  ),
);

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

  // Feature: web-demo, Property 2: The Demo_Script parser accepts only complete content
  // **Validates: Requirements 7.4, 7.5, 7.8**
  it("accepts a script if and only if every ghost content is complete", () => {
    fc.assert(
      fc.property(
        ghostsArb,
        fc.option(fc.tuple(mutationArb, fc.nat()), { nil: null }),
        fc.string(),
        (ghosts, change, rawText) => {
          // Never throws, even on any text.
          expect(parseDemoScript(rawText)).toHaveProperty("ok");

          const entries = ghosts.map(
            (ghost) => ({ ...ghost }) as Record<string, unknown>,
          );
          if (change !== null) {
            const [mutate, at] = change;
            mutate(entries, at % entries.length);
          }
          const result = parseDemoScript(JSON.stringify({ ghosts: entries }));
          if (change === null) {
            expect(result).toEqual({ ok: true, value: { ghosts } });
          } else {
            expect(result.ok).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
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
