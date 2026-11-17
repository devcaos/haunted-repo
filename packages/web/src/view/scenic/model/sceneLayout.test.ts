import { describe, expect, it } from "vitest";
import { GHOST_TYPE_OF, slotRects } from "./sceneLayout.js";

describe("slotRects", () => {
  it("gives 88 x 97, 72 x 207 and 100 x 142 slots with 5 Cards", () => {
    const size = (rect: { w: number; h: number }) => [rect.w, rect.h];
    expect(slotRects("attic", 5).map(size)).toEqual(Array(5).fill([88, 97]));
    expect(slotRects("middle floor", 5).map(size)).toEqual(
      Array(5).fill([72, 207]),
    );
    expect(slotRects("basement", 5).map(size)).toEqual(
      Array(5).fill([100, 142]),
    );
  });

  it("gives no slot for an empty floor", () => {
    expect(slotRects("attic", 0)).toEqual([]);
  });
});

describe("GHOST_TYPE_OF", () => {
  it("maps attic, middle floor and basement to Wisp, Lantern_Wraith and Chained_Brute", () => {
    expect(GHOST_TYPE_OF).toEqual({
      attic: "wisp",
      "middle floor": "lantern-wraith",
      basement: "chained-brute",
    });
  });
});
