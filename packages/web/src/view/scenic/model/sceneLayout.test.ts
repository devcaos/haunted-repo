import fc from "fast-check";
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
import {
  FLOOR_RECT,
  GHOST_TYPE_OF,
  sceneLayout,
  slotRects,
} from "./sceneLayout.js";
import type { Rect } from "./sceneLayout.js";
import { viewModelArbWith } from "./viewModelArb.testutil.js";

const FLOORS_IN_ORDER: readonly Floor[] = ["attic", "middle floor", "basement"];

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
  it("gives 66 x 106, 52 x 180 and 55 x 160 slots with 5 Cards", () => {
    const size = (rect: { w: number; h: number }) => [rect.w, rect.h];
    expect(slotRects("attic", 5).map(size)).toEqual(Array(5).fill([66, 106]));
    expect(slotRects("middle floor", 5).map(size)).toEqual(
      Array(5).fill([52, 180]),
    );
    expect(slotRects("basement", 5).map(size)).toEqual(
      Array(5).fill([55, 160]),
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
        waiting: 0,
        accessibleName: "Basement. Go to this floor",
      },
    ]);
    expect(layout.backButton).toBe(true);
  });

  it("counts the ghosts still waiting on each floor of the sample (Floor_Hint)", () => {
    const sampleGhosts = [
      ghost("a1.ts", "attic"),
      ghost("a2.ts", "attic"),
      ghost("a3.ts", "attic"),
      ghost("m1.ts", "middle floor"),
    ];
    const toFloors: AvailableAction[] = FLOORS_IN_ORDER.map((floor) => ({
      type: "go-to-floor",
      floor,
    }));
    const houseWith = (exorcised: string[]): HouseView =>
      buildSampleHouse(reportOf(sampleGhosts), {
        progress: {
          ghosts: exorcised.map((path) => ({
            path,
            state: "exorcised",
            ratings: [],
            selfCheck: null,
          })),
        },
        step: "choosing",
        // a3.ts is not scripted, so it stays "locked" and never counts.
        scripted: new Set(["a1.ts", "a2.ts", "m1.ts"]),
        startAllowed: true,
      });
    const waitingOf = (house: HouseView): number[] =>
      sceneLayout(modelOf(house, { kind: "house" }, toFloors)).floorButtons.map(
        (b) => b.waiting,
      );

    expect(waitingOf(houseWith([]))).toEqual([2, 1, 0]);
    expect(waitingOf(houseWith(["a1.ts", "a2.ts"]))).toEqual([0, 1, 0]);
    const clean = houseWith(["a1.ts", "a2.ts", "m1.ts"]);
    expect(waitingOf(clean)).toEqual([0, 0, 0]);
    expect(
      sceneLayout(modelOf(clean, { kind: "house" }, toFloors)).floorButtons.map(
        (b) => b.accessibleName,
      ),
    ).toEqual([
      "Attic. Go to this floor",
      "Middle floor. Go to this floor",
      "Basement. Go to this floor",
    ]);
    const atAttic = sceneLayout(
      modelOf(
        houseWith(["a1.ts", "a2.ts"]),
        { kind: "floor", floor: "attic" },
        [
          { type: "go-to-floor", floor: "middle floor" },
          { type: "go-to-floor", floor: "basement" },
        ],
      ),
    );
    expect(atAttic.floorButtons).toEqual([
      {
        floor: "middle floor",
        label: "Middle floor",
        waiting: 1,
        accessibleName: "Middle floor. Go to this floor. 1 ghost to exorcise",
      },
      {
        floor: "basement",
        label: "Basement",
        waiting: 0,
        accessibleName: "Basement. Go to this floor",
      },
    ]);
    // A live report never shows a Floor_Hint.
    expect(waitingOf(buildLiveHouse(reportOf(sampleGhosts)))).toEqual([
      0, 0, 0,
    ]);
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

describe("Property 1", () => {
  // Feature: scenic-web, Property 1: Every Card gets exactly one Ghost_Slot on its own floor
  // **Validates: Requirements 3.5, 10.13, 12.5, 23.2**
  it("every Card gets exactly one Ghost_Slot on its own floor", () => {
    fc.assert(
      fc.property(viewModelArbWith({ paths: "any" }), (model) => {
        const layout = sceneLayout(model);
        if (model.house === null || model.scene.kind === "ghost") {
          expect(layout.slots).toEqual([]);
          return;
        }
        const expected = model.house.floors.flatMap((view) =>
          view.ghosts.map((card, index) => ({
            key: `${view.floor}#${index}`,
            floor: view.floor,
            path: card.path,
            state: card.state,
          })),
        );
        expect(
          layout.slots.map(({ key, floor, path, state }) => ({
            key,
            floor,
            path,
            state,
          })),
        ).toEqual(expected);
        // The window is lit exactly for the slots whose state is "exorcised".
        const lit = layout.slots.filter((slot) => slot.state === "exorcised");
        const cards = model.house.floors.flatMap((view) => view.ghosts);
        expect(lit).toHaveLength(
          cards.filter((card) => card.state === "exorcised").length,
        );
      }),
      { numRuns: 200 },
    );
  });
});

describe("Property 2", () => {
  const floorArb = fc.constantFrom<Floor>("attic", "middle floor", "basement");
  const overlap = (a: Rect, b: Rect): number =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inside = (inner: Rect, outer: Rect): boolean =>
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h;
  function expectFitAndApart(floor: Floor, rects: Rect[]): void {
    for (const rect of rects)
      expect(inside(rect, FLOOR_RECT[floor])).toBe(true);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        expect(overlap(rects[i] as Rect, rects[j] as Rect)).toBe(0);
      }
    }
  }

  // Feature: scenic-web, Property 2: Ghost_Slots fit their floor and never overlap
  // **Validates: Requirements 23.3**
  it("Ghost_Slots fit their floor and never overlap", () => {
    fc.assert(
      fc.property(floorArb, fc.integer({ min: 1, max: 5 }), (floor, count) => {
        const rects = slotRects(floor, count);
        expect(rects).toHaveLength(count);
        expectFitAndApart(floor, rects);
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(viewModelArbWith({ maxPerFloor: 5 }), (model) => {
        const slots = sceneLayout(model).slots;
        for (const floor of ["attic", "middle floor", "basement"] as const) {
          expectFitAndApart(
            floor,
            slots.filter((s) => s.floor === floor).map((s) => s.rect),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe("Property 3", () => {
  // Feature: scenic-web, Property 3: Start controls exist only for startable Cards of the focused floor
  // **Validates: Requirements 3.10, 6.6, 8.4, 8.5, 23.4**
  it("start controls exist only for startable Cards of the focused floor", () => {
    fc.assert(
      fc.property(viewModelArbWith({ paths: "unique" }), (model) => {
        const layout = sceneLayout(model);
        if (model.scene.kind !== "floor" || model.house === null) {
          expect(layout.startControls).toEqual([]);
          expect(layout.nameplates).toEqual([]);
          return;
        }
        const focusedFloor = model.scene.floor;
        const cards =
          model.house.floors.find((view) => view.floor === focusedFloor)
            ?.ghosts ?? [];
        expect(layout.nameplates.map((n) => n.hasStart)).toEqual(
          cards.map((card) => card.canStart),
        );
        expect(layout.startControls).toEqual(
          cards.filter((card) => card.canStart).map((card) => card.path),
        );
      }),
      { numRuns: 200 },
    );
  });
});

describe("Property 4", () => {
  const states = ["haunted", "exorcised", "locked"] as const;
  /** Same floors and order; every other field of every Card is rewritten. */
  function rewritten(model: ViewModel, seed: number): ViewModel {
    if (model.house === null) return model;
    const floors = model.house.floors.map((view, f) => ({
      ...view,
      ghosts: view.ghosts.map((card, i) => ({
        ...card,
        path: `other-${seed}-${f}-${i}.ts`,
        score: (seed + i) % 101,
        reason: `reason ${seed}`,
        state: states[(seed + i + f) % 3] ?? "haunted",
        canStart: (seed + i) % 2 === 0,
      })),
    }));
    return {
      ...model,
      house: {
        ...model.house,
        floors: floors as unknown as typeof model.house.floors,
      },
    };
  }

  // Feature: scenic-web, Property 4: The Variant depends only on the floor position
  // **Validates: Requirements 5.8, 5.10, 5.11, 23.5**
  it("the Variant depends only on the floor position", () => {
    fc.assert(
      fc.property(
        viewModelArbWith({ maxPerFloor: 5 }),
        fc.nat(),
        (model, seed) => {
          const before = sceneLayout(model).slots;
          const after = sceneLayout(rewritten(model, seed)).slots;
          expect(after.map((s) => [s.key, s.variant])).toEqual(
            before.map((s) => [s.key, s.variant]),
          );
          for (const slot of before) {
            expect(slot.variant).toBe(slot.index % 5);
          }
          for (const floor of FLOORS_IN_ORDER) {
            const variants = before
              .filter((s) => s.floor === floor)
              .map((s) => s.variant);
            expect(new Set(variants).size).toBe(variants.length);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("Property 5", () => {
  // Feature: scenic-web, Property 5: The Telephone_Target is the first startable Card
  // **Validates: Requirements 9.9, 23.6**
  it("the Telephone_Target is the first startable Card", () => {
    fc.assert(
      fc.property(viewModelArbWith({ paths: "unique" }), (model) => {
        const target = sceneLayout(model).telephoneTarget;
        if (model.house === null) {
          expect(target).toBeNull();
          return;
        }
        let expected: string | null = null;
        for (const floor of FLOORS_IN_ORDER) {
          const view = model.house.floors.find((v) => v.floor === floor);
          const card = view?.ghosts.find((c) => c.canStart);
          if (card !== undefined) {
            expected = card.path;
            break;
          }
        }
        expect(target).toBe(expected);
        if (target !== null) {
          expect(
            model.available.some(
              (a) => a.type === "start-ghost" && a.path === target,
            ),
          ).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("Property 6", () => {
  // Feature: scenic-web, Property 6: The Finale depends only on the current ViewModel
  // **Validates: Requirements 13.1, 13.2, 13.6, 23.7**
  it("the Finale depends only on the current ViewModel", () => {
    let shown = 0;
    let hidden = 0;
    fc.assert(
      fc.property(viewModelArbWith({ finaleBias: true }), (model) => {
        const cards = (model.house?.floors ?? []).flatMap((v) => v.ghosts);
        const expected =
          model.house !== null &&
          model.house.source === "sample" &&
          !cards.some((card) => card.state === "haunted") &&
          cards.some((card) => card.state === "exorcised") &&
          (model.scene.kind === "house" || model.scene.kind === "floor");
        const finale = sceneLayout(model).finale;
        expect(finale).toBe(expected);
        expect(sceneLayout(structuredClone(model)).finale).toBe(finale);
        if (finale) shown += 1;
        else hidden += 1;
      }),
      { numRuns: 300 },
    );
    expect(shown).toBeGreaterThan(0);
    expect(hidden).toBeGreaterThan(0);
  });
});

describe("Property 7", () => {
  // Feature: scenic-web, Property 7: Navigation controls follow Available_Actions
  // **Validates: Requirements 3.6, 8.2, 8.7, 8.13, 14.3**
  it("navigation controls follow Available_Actions", () => {
    const busyRuns = new Set<boolean>();
    fc.assert(
      fc.property(
        viewModelArbWith().filter((model) => model.scene.kind !== "ghost"),
        (model) => {
          busyRuns.add(model.live.busy);
          const layout = sceneLayout(model);
          const expected = (model.house?.floors ?? [])
            .filter((view) =>
              model.available.some(
                (a) => a.type === "go-to-floor" && a.floor === view.floor,
              ),
            )
            .map((view) => {
              const house = model.house;
              const waiting =
                house !== null &&
                house.source === "sample" &&
                house.progress !== null
                  ? view.ghosts.filter((c) => c.state === "haunted").length
                  : 0;
              const name = `${view.title}. ${TEXTS.actionLabels["go-to-floor"]}`;
              return {
                floor: view.floor,
                label: view.title,
                waiting,
                accessibleName:
                  waiting === 0
                    ? name
                    : `${name}. ${waiting} ${waiting === 1 ? "ghost" : "ghosts"} to exorcise`,
              };
            });
          expect(layout.floorButtons).toEqual(expected);
          expect(layout.backButton).toBe(
            model.available.some((a) => a.type === "go-to-house"),
          );
          if (model.scene.kind === "floor") {
            const focus = model.scene.floor;
            expect(layout.floorButtons.some((b) => b.floor === focus)).toBe(
              false,
            );
            expect(layout.dimmedFloors).toHaveLength(2);
          }
        },
      ),
      { numRuns: 200 },
    );
    expect(busyRuns).toEqual(new Set([true, false]));
  });
});

describe("Property 8", () => {
  // Feature: scenic-web, Property 8: Nameplates show every Card of the focused floor
  // **Validates: Requirements 6.4, 6.5, 6.9, 8.3, 8.6, 17.3**
  it("Nameplates show every Card of the focused floor", () => {
    fc.assert(
      fc.property(
        viewModelArbWith({ paths: "any" }).filter(
          (model) => model.scene.kind === "floor" && model.house !== null,
        ),
        (model) => {
          if (model.scene.kind !== "floor" || model.house === null) return;
          const focus = model.scene.floor;
          const view = model.house.floors.find((v) => v.floor === focus);
          const cards = view?.ghosts ?? [];
          const layout = sceneLayout(model);
          expect(layout.nameplates).toHaveLength(cards.length);
          cards.forEach((card, i) => {
            const plate = layout.nameplates[i];
            const label = TEXTS.ghostStateLabels[card.state];
            expect(plate).toMatchObject({
              index: i,
              path: card.path,
              reason: card.reason,
              scoreLine: TEXTS.scoreLine(card.score),
              stateLabel: label,
              state: card.state,
              lockedLine: card.lockedLine,
            });
            const locked =
              card.lockedLine === null ? "" : `, ${card.lockedLine}`;
            expect(plate?.accessibleName).toBe(
              `${card.path}, ${view?.title}, difficulty ${card.score} of 100, ${label}${locked}`,
            );
            if (card.state === "locked") {
              expect(plate?.accessibleName).toContain(card.lockedLine ?? "");
            }
          });
          expect(layout.emptyLine).toBe(view?.emptyLine ?? null);
          expect(layout.emptyFloors).toEqual(
            model.house.floors
              .filter((v) => v.emptyLine !== null)
              .map((v) => v.floor),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
