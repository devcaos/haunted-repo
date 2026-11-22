import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { chooseView } from "./viewChoice.js";

// Requirement 1: only an exact first `view=simple` gives the Simple view;
// everything else gives the Scenic view.
describe("chooseView", () => {
  it("gives scenic when there is no view parameter", () => {
    expect(chooseView("")).toBe("scenic");
    expect(chooseView("?")).toBe("scenic");
  });

  it("gives simple for ?view=simple, with or without the question mark", () => {
    expect(chooseView("?view=simple")).toBe("simple");
    expect(chooseView("view=simple")).toBe("simple");
  });

  it("gives scenic for a different case, an empty value or another value", () => {
    expect(chooseView("?view=SIMPLE")).toBe("scenic");
    expect(chooseView("?view=")).toBe("scenic");
    expect(chooseView("?view=simple%20")).toBe("scenic");
    expect(chooseView("?view=scenic")).toBe("scenic");
  });

  it("uses the first view value only", () => {
    expect(chooseView("?view=simple&view=scenic")).toBe("simple");
    expect(chooseView("?view=scenic&view=simple")).toBe("scenic");
  });

  it("ignores other parameters and anything that is not the query", () => {
    expect(chooseView("?x=1&view=simple&y=2")).toBe("simple");
    expect(chooseView("?x=simple")).toBe("scenic");
    // location.search never holds the hash; a hash-only address gives "".
    expect(chooseView("#view=simple")).toBe("scenic");
  });
});

// Generator of the design: random parameters, repeated `view` parameters in
// any order, an optional leading `?`.
const searchArb = fc
  .tuple(
    fc.array(
      fc.tuple(
        fc.constantFrom("view", "View", "x"),
        fc.oneof(
          fc.constantFrom("simple", "SIMPLE", "simple ", "", "scenic"),
          fc.string(),
        ),
      ),
      { maxLength: 6 },
    ),
    fc.boolean(),
  )
  .map(
    ([pairs, question]) =>
      (question ? "?" : "") +
      pairs.map(([name, value]) => `${name}=${value}`).join("&"),
  );

describe("chooseView properties", () => {
  // Feature: scenic-web, Property 12: The view is simple only for an exact first value
  // **Validates: Requirements 1.1, 1.2, 1.3**
  it("Property 12: the view is simple exactly for an exact first value", () => {
    fc.assert(
      fc.property(searchArb, (search) => {
        const expected =
          new URLSearchParams(search).get("view") === "simple"
            ? "simple"
            : "scenic";
        expect(chooseView(search)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
