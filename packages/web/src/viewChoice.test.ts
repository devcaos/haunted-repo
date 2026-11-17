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
