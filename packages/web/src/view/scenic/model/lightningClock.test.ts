import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  FLASH_MAX_MS,
  FLASH_MIN_MS,
  flashAllowed,
  nextFlashDelay,
  type FlashInput,
} from "./lightningClock.js";

const ALL_ALLOW: FlashInput = {
  toggleOn: true,
  reducedMotion: false,
  scene: "house",
  finale: false,
  ringPlaying: false,
  exorcisedMomentPlaying: false,
};

describe("lightningClock", () => {
  it("the interval is 10 s to 15 s (15.1)", () => {
    expect(FLASH_MIN_MS).toBe(10_000);
    expect(FLASH_MAX_MS).toBe(15_000);
  });

  it("nextFlashDelay maps the ends of [0, 1) to the ends of the interval", () => {
    expect(nextFlashDelay(0)).toBe(10_000);
    expect(nextFlashDelay(0.5)).toBe(12_500);
    expect(nextFlashDelay(1 - Number.EPSILON)).toBe(15_000);
  });

  it.each<[string, FlashInput, boolean]>([
    ["everything allows a flash in the House_Scene", ALL_ALLOW, true],
    [
      "everything allows a flash in a Floor_Scene",
      { ...ALL_ALLOW, scene: "floor" },
      true,
    ],
    ["the toggle is off (15.5)", { ...ALL_ALLOW, toggleOn: false }, false],
    [
      "Reduced_Motion is on (15.9, 18.5)",
      { ...ALL_ALLOW, reducedMotion: true },
      false,
    ],
    [
      "the Ghost_Scene is shown (D7, 15.2)",
      { ...ALL_ALLOW, scene: "ghost" },
      false,
    ],
    ["the Finale is shown (D8, Q20)", { ...ALL_ALLOW, finale: true }, false],
    ["a Ring plays (Q7)", { ...ALL_ALLOW, ringPlaying: true }, false],
    [
      "an Exorcised_Moment plays (Q7)",
      { ...ALL_ALLOW, exorcisedMomentPlaying: true },
      false,
    ],
  ])("flashAllowed: %s", (_reason, input, expected) => {
    expect(flashAllowed(input)).toBe(expected);
  });
});

describe("lightningClock properties", () => {
  // Feature: scenic-web, Property 16: Lightning flashes are 10 to 15 seconds apart
  // **Validates: Requirements 15.1, 15.3**
  it("nextFlashDelay is an integer from 10,000 to 15,000 for any r in [0, 1)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }),
        (r) => {
          const delay = nextFlashDelay(r);
          expect(Number.isInteger(delay)).toBe(true);
          expect(delay).toBeGreaterThanOrEqual(10_000);
          expect(delay).toBeLessThanOrEqual(15_000);
        },
      ),
      { numRuns: 200 },
    );
  });
});
