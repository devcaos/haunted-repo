import { describe, expect, it } from "vitest";
import { floorOf } from "./report.js";

describe("floorOf", () => {
  it.each([
    [0, "attic"],
    [33, "attic"],
    [34, "middle floor"],
    [66, "middle floor"],
    [67, "basement"],
    [100, "basement"],
  ])("score %i is %s", (score, floor) => {
    expect(floorOf(score)).toBe(floor);
  });
});
