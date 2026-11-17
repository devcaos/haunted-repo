import type { Floor, Ghost, HauntedReport } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import type { AvailableAction } from "../../../logic/actions.js";
import { buildLiveHouse, buildSampleHouse } from "../../../logic/houseView.js";
import { TEXTS } from "../../../logic/texts.js";
import type {
  GhostView,
  HouseView,
  Scene,
  ViewModel,
} from "../../../logic/viewModel.js";
import { GHOST_TYPE_OF, sceneLayout, slotRects } from "./sceneLayout.js";

function ghost(path: string, floor: Floor): Ghost {
  return {
    path,
    language: "TypeScript",
    difficultyScore: 40,
    floor,
    factors: { lines: 1, branches: 1, maxIndent: 1, imports: 1 },
    reason: `Why ${path}.`,
  };
}

function reportOf(ghosts: Ghost[]): HauntedReport {
  return {
    overview: {
      owner: "o",
      repo: "r",
      ref: "main",
      analysed: ghosts.length,
      picked: ghosts.length,
      truncated: false,
      fewFiles: false,
      partial: false,
      skipped: [],
      message: null,
    },
    ghosts,
  };
}

/** A sample house where every scripted path can start. */
function startableHouse(ghosts: Ghost[]): HouseView {
  return buildSampleHouse(reportOf(ghosts), {
    progress: { ghosts: [] },
    step: "choosing",
    scripted: new Set(ghosts.map((g) => g.path)),
    startAllowed: true,
  });
}

function modelOf(
  house: HouseView | null,
  scene: Scene,
  available: AvailableAction[] = [],
  ghostView: GhostView | null = null,
): ViewModel {
  return {
    scene,
    transition: null,
    house,
    ghost: ghostView,
    live: { formVisible: scene.kind !== "ghost", busy: false },
    status: { kind: "none", text: "" },
    licence: null,
    available,
  };
}

function ghostViewOf(path: string, floor: Floor): GhostView {
  return {
    path,
    floor,
    step: "explaining",
    code: "x",
    licenceNextToCode: true,
    judgeLine: TEXTS.judgeLine,
    reading: null,
    questionNumber: null,
    question: null,
    revealedAnswer: null,
    showAnswerBox: false,
    prompt: null,
  };
}

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

describe("sceneLayout", () => {
  const ghosts = [
    ghost("a.ts", "attic"),
    ghost("b.ts", "middle floor"),
    ghost("c.ts", "middle floor"),
  ];

  it("heads the house, the floor and the ghost scenes", () => {
    const house = buildLiveHouse(reportOf(ghosts));
    expect(sceneLayout(modelOf(house, { kind: "house" })).heading).toBe(
      TEXTS.houseHeading("o/r"),
    );
    expect(sceneLayout(modelOf(null, { kind: "house" })).heading).toBe(
      TEXTS.pageTitle,
    );
    expect(
      sceneLayout(modelOf(house, { kind: "floor", floor: "middle floor" }))
        .heading,
    ).toBe("Middle floor");
    const open = modelOf(
      house,
      { kind: "ghost", floor: "attic", path: "a.ts" },
      [],
      ghostViewOf("a.ts", "attic"),
    );
    expect(sceneLayout(open).heading).toBe(TEXTS.ghostHeading("a.ts"));
  });

  it("places slots by position, with the Variant of the position", () => {
    const layout = sceneLayout(
      modelOf(buildLiveHouse(reportOf(ghosts)), { kind: "house" }),
    );
    expect(layout.slots.map((s) => s.key)).toEqual([
      "attic#0",
      "middle floor#0",
      "middle floor#1",
    ]);
    expect(layout.slots.map((s) => s.variant)).toEqual([0, 0, 1]);
    expect(layout.emptyFloors).toEqual(["basement"]);
    expect(layout.nameplates).toEqual([]);
    expect(layout.startControls).toEqual([]);
  });

  it("gives a repeated path one start control and the Telephone_Target", () => {
    const twice = [ghost("a.ts", "attic"), ghost("a.ts", "attic")];
    const model = modelOf(
      startableHouse(twice),
      { kind: "floor", floor: "attic" },
      [{ type: "start-ghost", path: "a.ts" }],
    );
    const layout = sceneLayout(model);
    expect(layout.slots).toHaveLength(2);
    expect(layout.nameplates.map((n) => n.hasStart)).toEqual([true, false]);
    expect(layout.startControls).toEqual(["a.ts"]);
    expect(layout.telephoneTarget).toBe("a.ts");
    expect(layout.dimmedFloors).toEqual(["middle floor", "basement"]);
  });

  it("writes the Nameplate fields and the empty line of a Floor_Scene", () => {
    const house = buildLiveHouse(reportOf(ghosts));
    const attic = sceneLayout(
      modelOf(house, { kind: "floor", floor: "attic" }),
    );
    expect(attic.nameplates[0]).toMatchObject({
      path: "a.ts",
      reason: "Why a.ts.",
      scoreLine: TEXTS.scoreLine(40),
      stateLabel: "Haunted",
      hasStart: false,
    });
    expect(attic.emptyLine).toBeNull();
    const basement = sceneLayout(
      modelOf(house, { kind: "floor", floor: "basement" }),
    );
    expect(basement.emptyLine).toBe(TEXTS.emptyFloor);
    expect(basement.heading).toBe("Basement");
  });

  it("lists floor buttons and the back button from Available_Actions", () => {
    const layout = sceneLayout(
      modelOf(
        buildLiveHouse(reportOf(ghosts)),
        { kind: "floor", floor: "attic" },
        [{ type: "go-to-floor", floor: "basement" }, { type: "go-to-house" }],
      ),
    );
    expect(layout.floorButtons).toEqual([
      {
        floor: "basement",
        label: "Basement",
        accessibleName: "Basement. Go to this floor",
      },
    ]);
    expect(layout.backButton).toBe(true);
  });

  it("falls back to Variant 0 when no Card matches the ghost", () => {
    const house = buildLiveHouse(reportOf(ghosts));
    const layout = sceneLayout(
      modelOf(
        house,
        { kind: "ghost", floor: "attic", path: "missing.ts" },
        [],
        ghostViewOf("missing.ts", "attic"),
      ),
    );
    expect(layout.closeUp).toEqual({ ghostType: "wisp", variant: 0 });
    expect(layout.slots).toEqual([]);
  });

  it("follows the Variant of the ghost's Card and the Ghost_Type of ghost.floor", () => {
    const house = buildLiveHouse(reportOf(ghosts));
    const layout = sceneLayout(
      modelOf(
        house,
        { kind: "ghost", floor: "middle floor", path: "c.ts" },
        [],
        ghostViewOf("c.ts", "middle floor"),
      ),
    );
    expect(layout.closeUp).toEqual({ ghostType: "lantern-wraith", variant: 1 });
    expect(layout.frame.kind).toBe("slot");
  });
});
