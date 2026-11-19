import { describe, expect, it } from "vitest";
import { SHOT_SIZES, SHOT_STATES, allShots, shotFileName } from "./shotList.js";

describe("shot list (Requirements 24.4, 24.5, 24.10)", () => {
  it("has the two sizes", () => {
    expect(SHOT_SIZES).toEqual([
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]);
  });

  it("names a file <state>-<width>x<height>.png", () => {
    expect(shotFileName("01-house", { width: 390, height: 844 })).toBe(
      "01-house-390x844.png",
    );
  });

  it("file names are unique and hold their state id and size", () => {
    const shots = allShots();
    expect(new Set(shots.map((s) => s.fileName)).size).toBe(shots.length);
    for (const s of shots) {
      expect(s.fileName).toContain(s.state);
      expect(s.fileName).toContain(`${s.size.width}x${s.size.height}`);
      expect(s.fileName.endsWith(".png")).toBe(true);
    }
  });

  it("lists 7 states x 2 sizes for now (task 16.7 makes it 19 x 2 = 38)", () => {
    expect(SHOT_STATES).toHaveLength(7);
    expect(allShots()).toHaveLength(14);
  });
});
