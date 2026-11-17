import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { chooseView } from "./viewChoice.js";

// Interim rule of the dark launch (decision Q14): only an exact first
// `view=scenic` gives the Scenic view.
describe("chooseView (dark launch)", () => {
  it("gives simple when there is no view parameter", () => {
    expect(chooseView("")).toBe("simple");
    expect(chooseView("?")).toBe("simple");
  });

  it("gives scenic for ?view=scenic, with or without the question mark", () => {
    expect(chooseView("?view=scenic")).toBe("scenic");
    expect(chooseView("view=scenic")).toBe("scenic");
  });

  it("gives simple for a different case or an empty value", () => {
    expect(chooseView("?view=SCENIC")).toBe("simple");
    expect(chooseView("?view=")).toBe("simple");
    expect(chooseView("?view=scenic%20")).toBe("simple");
  });

  it("uses the first view value only", () => {
    expect(chooseView("?view=scenic&view=simple")).toBe("scenic");
    expect(chooseView("?view=simple&view=scenic")).toBe("simple");
  });

  it("ignores other parameters and anything that is not the query", () => {
    expect(chooseView("?x=1&view=scenic&y=2")).toBe("scenic");
    expect(chooseView("?x=scenic")).toBe("simple");
    // location.search never holds the hash; a hash-only address gives "".
    expect(chooseView("#view=scenic")).toBe("simple");
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
  // Until task 16.8 this checks the dark-launch rule (decision Q14).
  it("Property 12: the view is scenic exactly for an exact first value", () => {
    fc.assert(
      fc.property(searchArb, (search) => {
        const expected =
          new URLSearchParams(search).get("view") === "scenic"
            ? "scenic"
            : "simple";
        expect(chooseView(search)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
