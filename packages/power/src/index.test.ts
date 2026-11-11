import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { add } from "./index.js";

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  // Feature: project-skeleton, Property 1: add is commutative
  it("gives the same result in any order", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(add(a, b)).toBe(add(b, a));
      }),
      { numRuns: 100 },
    );
  });
});
