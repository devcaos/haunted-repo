import { floorOf, type Floor } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import { POWER_TEXTS } from "../../../logic/powerTexts.js";
import { TEXTS } from "../../../logic/texts.js";

const FLOORS: Floor[] = ["attic", "middle floor", "basement"];

/** The Bestiary as a page reads it: one entry per floor, in floor order. */
function bestiaryEntries(): {
  floor: Floor;
  name: string;
  floorTitle: string;
  range: string;
}[] {
  return FLOORS.map((floor) => ({
    floor,
    name: TEXTS.bestiary.names[floor],
    floorTitle: TEXTS.floorTitles[floor],
    range: TEXTS.bestiary.ranges[floor],
  }));
}

function parseRange(range: string): [number, number] {
  const match = /^(\d+) to (\d+)$/.exec(range);
  if (match === null) throw new Error(`Bad range: ${range}`);
  return [Number(match[1]), Number(match[2])];
}

describe("scenic texts (Requirements 2.2, 7.1 to 7.3, 7.5)", () => {
  it("the Bestiary has three entries: Wisp, Lantern Wraith, Chained Brute", () => {
    expect(TEXTS.bestiary.title).toBe("Bestiary");
    expect(bestiaryEntries()).toEqual([
      {
        floor: "attic",
        name: "Wisp",
        floorTitle: TEXTS.floorTitles.attic,
        range: "0 to 33",
      },
      {
        floor: "middle floor",
        name: "Lantern Wraith",
        floorTitle: TEXTS.floorTitles["middle floor"],
        range: "34 to 66",
      },
      {
        floor: "basement",
        name: "Chained Brute",
        floorTitle: TEXTS.floorTitles.basement,
        range: "67 to 100",
      },
    ]);
  });

  it("each range starts and ends on its own floor and the three cover 0 to 100", () => {
    let expectedLow = 0;
    for (const { floor, range } of bestiaryEntries()) {
      const [low, high] = parseRange(range);
      expect(floorOf(low)).toBe(floor);
      expect(floorOf(high)).toBe(floor);
      expect(low).toBe(expectedLow);
      expectedLow = high + 1;
    }
    expect(expectedLow).toBe(101);
  });

  it("the range line reads 'Difficulty <range>'", () => {
    expect(TEXTS.bestiary.rangeLine("0 to 33")).toBe("Difficulty 0 to 33");
  });

  it("every scenic TEXTS key added so far exists", () => {
    expect(TEXTS.tagline).not.toBe("");
    expect(TEXTS.viewLinks.simple).not.toBe("");
    expect(TEXTS.viewLinks.scenic).not.toBe("");
    expect(TEXTS.viewLoadFailed).not.toBe("");
    expect(TEXTS.floorButtonName("Attic", "Go to this floor")).toBe(
      "Attic. Go to this floor",
    );
    expect(TEXTS.nameplateName("a.ts", "Attic", 12, "Haunted", null)).toBe(
      "a.ts, Attic, difficulty 12 of 100, Haunted",
    );
    expect(TEXTS.bestiary).toBeDefined();
  });

  it("every POWER_TEXTS line names the Power", () => {
    for (const line of Object.values(POWER_TEXTS)) {
      expect(line).toContain("Power");
    }
  });
});
