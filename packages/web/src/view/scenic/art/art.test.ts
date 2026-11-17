import { describe, expect, it } from "vitest";
import {
  circle,
  defs,
  ellipse,
  g,
  gradient,
  path,
  poly,
  rect,
  strokePath,
  type ShapeNode,
} from "./shapes.js";
import type { Floor } from "@haunted-repo/core";
import type { GhostState } from "../../../logic/viewModel.js";
import {
  FLOOR_RECT,
  GHOST_BOX,
  GHOST_TYPE_OF,
  SLOT_BAND,
  floorGhostScale,
  slotRects,
  type SlotPlacement,
  type VariantNumber,
} from "../model/sceneLayout.js";
import { GHOST_TYPES, ghostArt } from "./ghosts.js";
import { FLOOR_CLASS, houseLayer } from "./house.js";
import { chainedDoorArt, slotArt } from "./props.js";
import { foregroundLayer, skyLayers, weatherLayer } from "./sky.js";

// The Shape_Data rules (Requirements 22.1, 17.1; design "Shape_Data").
// prettier-ignore
const KINDS = new Set<string>([
  "g", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line",
  "defs", "linearGradient", "radialGradient", "stop", "clipPath",
]);
// prettier-ignore
const ID_KINDS = new Set<string>(["linearGradient", "radialGradient", "clipPath"]);
// prettier-ignore
const KEYWORDS = new Set<string>(["transparent", "currentColor", "none", "inherit"]);
const CLASS_NAMES = /^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)*$/;
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/;
const ID = /^[a-z][a-z0-9-]*$/;
// prettier-ignore
const NUMBER_KEYS = [
  "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "fx", "fy",
  "x1", "y1", "x2", "y2", "offset",
] as const;
const KNOWN_KEYS = new Set<string>([
  ...NUMBER_KEYS,
  ...["kind", "cls", "id", "part", "d", "points", "transform", "units"],
  ...["paint", "clip", "fill", "stroke", "children"],
]);

/** Every Shape_Data rule the tree breaks, as short readable lines. */
function shapeProblems(tree: ShapeNode): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const refs: string[] = [];
  const walk = (node: ShapeNode): void => {
    if (!KINDS.has(node.kind)) problems.push(`kind ${node.kind}`);
    for (const key of Object.keys(node)) {
      if (!KNOWN_KEYS.has(key)) problems.push(`field ${key}`);
    }
    if (node.cls !== undefined && !CLASS_NAMES.test(node.cls)) {
      problems.push(`class "${node.cls}"`);
    }
    if (node.d !== undefined && !PATH_DATA.test(node.d)) {
      problems.push(`path "${node.d}"`);
    }
    for (const value of [node.fill, node.stroke]) {
      if (value !== undefined && !KEYWORDS.has(value)) {
        problems.push(`paint "${value}"`);
      }
    }
    const numbers = [
      ...NUMBER_KEYS.map((key) => node[key]),
      ...(node.points ?? []),
      ...(node.transform?.translate ?? []),
      node.transform?.rotate,
      node.transform?.scale,
    ];
    if (numbers.some((n) => n !== undefined && !Number.isFinite(n))) {
      problems.push(`number on ${node.kind}`);
    }
    if (node.id !== undefined) {
      if (!ID.test(node.id) || !ID_KINDS.has(node.kind)) {
        problems.push(`id "${node.id}" on ${node.kind}`);
      }
      if (ids.has(node.id)) problems.push(`repeated id "${node.id}"`);
      ids.add(node.id);
    }
    if (node.paint !== undefined) refs.push(node.paint);
    if (node.clip !== undefined) refs.push(node.clip);
    node.children?.forEach(walk);
  };
  walk(tree);
  for (const ref of refs) {
    if (!ids.has(ref)) problems.push(`missing id "${ref}"`);
  }
  return problems;
}

/** Every node of the tree, depth first. */
function nodesOf(tree: ShapeNode): ShapeNode[] {
  return [tree, ...(tree.children ?? []).flatMap(nodesOf)];
}

/** The class names of the tree, one entry per node and name. */
function classesOf(tree: ShapeNode): string[] {
  return nodesOf(tree).flatMap((n) => n.cls?.split(" ") ?? []);
}

describe("Shape_Data rules", () => {
  it("accepts a tree made with every builder", () => {
    const tree = g("example", [
      defs([
        gradient("radialGradient", "glow", [
          ["stop-cold-0", 0],
          ["stop-cold-1", 1],
        ]),
        { kind: "clipPath", id: "cut", children: [rect("box", 0, 0, 10, 10)] },
      ]),
      path("ghost-body", "M30 0 C47 0 60 13 60 31 L60 54 Z", {
        part: "outline",
      }),
      strokePath("rim", "M34 1 C49 3 59 15 59.5 31", {
        stroke: "currentColor",
      }),
      rect("wall tone-slate", 0, 0, 100, 50, { clip: "cut" }),
      circle("glow", 30, 34, 52, { paint: "glow" }),
      ellipse("shadow", 30, 72, 20, 4, { fill: "transparent" }),
      poly("roof", [0, 10, 5, 0, 10, 10], { transform: { rotate: -3 } }),
    ]);
    expect(shapeProblems(tree)).toEqual([]);
  });

  it("catches a bad class and bad path data", () => {
    expect(shapeProblems(rect("Wall", 0, 0, 1, 1))).toEqual(['class "Wall"']);
    expect(shapeProblems(rect("wall  slate", 0, 0, 1, 1))).toHaveLength(1);
    expect(shapeProblems(path("p", "M0 0 L#fff 1"))).toEqual([
      'path "M0 0 L#fff 1"',
    ]);
    expect(shapeProblems(path("p", "url(x)"))).toHaveLength(1);
  });

  it("catches colours, unknown fields, ids and broken references", () => {
    const red = {
      ...rect("a", 0, 0, 1, 1),
      fill: "red",
    } as unknown as ShapeNode;
    expect(shapeProblems(red)).toEqual(['paint "red"']);
    const styled = { ...rect("a", 0, 0, 1, 1), style: "x" } as ShapeNode;
    expect(shapeProblems(styled)).toEqual(["field style"]);
    expect(shapeProblems(rect("a", 0, 0, 1, 1, { id: "a" }))).toEqual([
      'id "a" on rect',
    ]);
    const twice = gradient("linearGradient", "a", []);
    expect(shapeProblems(g("t", [twice, twice]))).toEqual(['repeated id "a"']);
    expect(shapeProblems(circle("c", 0, 0, 1, { paint: "gone" }))).toEqual([
      'missing id "gone"',
    ]);
    expect(shapeProblems(circle("c", 0, Number.NaN, 1))).toEqual([
      "number on circle",
    ]);
  });
});

describe("sky, weather and foreground (Requirement 3.3)", () => {
  it("every tree passes the Shape_Data rules", () => {
    for (const tree of [skyLayers(), weatherLayer(), foregroundLayer()]) {
      expect(shapeProblems(tree)).toEqual([]);
    }
  });

  it("draws the depth layers back to front and the groups motion needs", () => {
    const layers = skyLayers()
      .children?.filter((n) => n.kind === "g")
      .map((n) => n.cls);
    expect(layers).toEqual(["sky", "moon-clouds", "hills-far", "hills-near"]);
    expect(classesOf(skyLayers())).toEqual(
      expect.arrayContaining(["moon", "clouds-left", "clouds-right"]),
    );
    const wrap = weatherLayer().children?.find((n) => n.cls === "rain-wrap");
    expect(wrap?.children?.map((n) => n.cls)).toEqual(["rain"]);
    expect(classesOf(weatherLayer()).filter((c) => c === "fog")).toHaveLength(
      2,
    );
    expect(classesOf(foregroundLayer())).toEqual(
      expect.arrayContaining(["fence", "dead-tree", "rim-fg"]),
    );
    expect(
      classesOf(foregroundLayer()).filter((c) => c === "grave"),
    ).toHaveLength(3);
  });
});

/**
 * The x, y points a node and its children name: rect corners, centres, polygon
 * points and path numbers read in pairs (rough for relative path data, which is
 * enough to tell a mirrored drawing from one that is not).
 */
function pointsOf(tree: ShapeNode): [number, number][] {
  return nodesOf(tree).flatMap((n): [number, number][] => {
    if (n.kind === "rect") {
      const { x = 0, y = 0, width = 0, height = 0 } = n;
      return [
        [x, y],
        [x + width, y + height],
      ];
    }
    if (n.cx !== undefined && n.cy !== undefined) return [[n.cx, n.cy]];
    const numbers =
      n.points ?? (n.d?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const pairs: [number, number][] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      pairs.push([numbers[i] ?? 0, numbers[i + 1] ?? 0]);
    }
    return pairs;
  });
}

describe("house (Requirements 3.1, 3.4)", () => {
  it("passes the Shape_Data rules", () => {
    expect(shapeProblems(houseLayer())).toEqual([]);
  });

  it("each floor group's room back is the Scene_Layout floor rectangle", () => {
    for (const floor of ["attic", "middle floor", "basement"] as const) {
      const group = nodesOf(houseLayer()).find(
        (n) => n.part === FLOOR_CLASS[floor],
      );
      const back = group?.children?.find((n) => n.part === "room-back");
      const { x, y, w, h } = FLOOR_RECT[floor];
      expect(back).toMatchObject({ kind: "rect", x, y, width: w, height: h });
    }
  });

  it("is not a mirror image about the vertical centre line", () => {
    const scene = [skyLayers(), houseLayer(), foregroundLayer()];
    const points = scene.flatMap(pointsOf);
    const seen = new Set(points.map(([x, y]) => `${x},${y}`));
    const twins = points.filter(([x, y]) => seen.has(`${1600 - x},${y}`));
    expect(twins.length).toBeLessThan(points.length / 2);
    const roof = nodesOf(houseLayer()).find((n) => n.part === "roof");
    const tower = nodesOf(houseLayer()).find((n) => n.part === "tower");
    expect(roof?.points?.[2]).toBeLessThan(800); // the ridge is left of centre
    expect(tower?.transform?.translate?.[0]).toBeGreaterThan(800);
  });
});

describe("the Wisp, Variant 0 (Requirements 5.1, 5.4, 6.1)", () => {
  const wisp = ghostArt("wisp", 0, "haunted");
  const parts = nodesOf(wisp).flatMap((n) =>
    n.part === undefined ? [] : [n.part],
  );

  it("passes the Shape_Data rules", () => {
    expect(shapeProblems(wisp)).toEqual([]);
  });

  it("has a round hem, a cobweb and a glow, and no tail, hood or horns", () => {
    expect(parts).toEqual(
      expect.arrayContaining(["outline", "hem-round", "cobweb", "glow"]),
    );
    for (const other of ["tail-spiral", "hood", "horns"]) {
      expect(parts).not.toContain(other);
    }
    const idle = nodesOf(wisp).find((n) => n.cls === "ghost-idle");
    expect(idle === undefined ? [] : classesOf(idle)).toContain("ghost-body");
  });

  it("eye height over body height is 11/64", () => {
    const eyes = nodesOf(wisp).filter((n) => n.part === "eye");
    expect(eyes).toHaveLength(2);
    for (const eye of eyes) {
      expect((2 * (eye.ry ?? 0)) / GHOST_BOX.wisp.h).toBe(11 / 64);
    }
    expect(GHOST_TYPES.wisp.eyeHeight / GHOST_TYPES.wisp.box.h).toBe(11 / 64);
  });

  it("its outline box equals the Wisp box of the Scene_Layout", () => {
    const outline = nodesOf(wisp).find((n) => n.part === "outline");
    const points = outline === undefined ? [] : pointsOf(outline);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.min(...ys)).toBe(0);
    expect({ w: Math.max(...xs), h: Math.max(...ys) }).toEqual(GHOST_BOX.wisp);
    expect(GHOST_TYPES.wisp.box).toEqual(GHOST_BOX.wisp);
  });
});

describe("slots and chained doors (Requirements 3.5, 6.1, 8.6, 12.5)", () => {
  const FLOORS = ["attic", "middle floor", "basement"] as const;
  const STATES = ["haunted", "locked", "exorcised"] as const;
  /** Slot `index` of `count` on a floor, as the Scene_Layout would place it. */
  const slotOf = (
    floor: Floor,
    state: GhostState,
    index = 0,
    count = 1,
  ): SlotPlacement => {
    const rect = slotRects(floor, count)[index];
    if (rect === undefined) throw new Error("no such slot");
    return {
      key: `${floor}#${index}`,
      floor,
      index,
      variant: (index % 5) as VariantNumber,
      ghostType: GHOST_TYPE_OF[floor],
      path: `src/${index}.ts`,
      state,
      rect,
      ghostScale: floorGhostScale(floor, count),
    };
  };
  const allSlots = FLOORS.flatMap((floor) =>
    STATES.flatMap((state) =>
      [1, 2, 3, 4, 5].flatMap((count) =>
        Array.from({ length: count }, (_, i) => slotOf(floor, state, i, count)),
      ),
    ),
  );

  it("every slot and chained door passes the Shape_Data rules", () => {
    for (const slot of allSlots)
      expect(shapeProblems(slotArt(slot))).toEqual([]);
    for (const floor of FLOORS) {
      expect(shapeProblems(chainedDoorArt(floor))).toEqual([]);
    }
  });

  it("the pane is lit exactly for Exorcised slots", () => {
    for (const slot of allSlots) {
      const classes = classesOf(slotArt(slot));
      expect(classes).toContain("pane");
      expect(classes.includes("pane-lit")).toBe(slot.state === "exorcised");
      expect(classes.includes("pane-unlit")).toBe(slot.state !== "exorcised");
    }
  });

  it("the pane is centred on its slot with its top 4 units below the slot top", () => {
    for (const slot of allSlots) {
      const frame = nodesOf(slotArt(slot)).find((n) => n.cls === "pane-frame");
      const { x = 0, y = 0, width = 0 } = frame ?? {};
      expect(x + width / 2).toBeCloseTo(slot.rect.x + slot.rect.w / 2, 1);
      expect(y).toBe(slot.rect.y + 4);
    }
  });

  it("a Haunted attic slot draws the Wisp with its glow; other slots draw no ghost yet", () => {
    for (const slot of allSlots) {
      const tree = slotArt(slot);
      const ghost = slot.floor === "attic" && slot.state === "haunted";
      const parts = nodesOf(tree).map((n) => n.part);
      expect(parts.includes("glow")).toBe(ghost);
      expect(classesOf(tree).includes("ghost--wisp")).toBe(ghost);
      if (ghost) {
        const holder = nodesOf(tree).find((n) => n.cls === "slot-ghost");
        expect(holder?.transform?.scale).toBeCloseTo(slot.ghostScale, 2);
      }
    }
  });

  it("the chained door has no padlock and sits inside its slot band", () => {
    for (const floor of FLOORS) {
      const door = chainedDoorArt(floor);
      const names = [
        ...classesOf(door),
        ...nodesOf(door).flatMap((n) => (n.part === undefined ? [] : [n.part])),
      ];
      expect(names.some((name) => name.includes("padlock"))).toBe(false);
      expect(names).toEqual(
        expect.arrayContaining(["chained-door", "door-chain"]),
      );
      const panel = nodesOf(door).find((n) => n.cls === "door-panel");
      const band = SLOT_BAND[floor];
      expect(panel).toMatchObject({ width: 70, height: band.h - 10 });
      expect((panel?.x ?? 0) + 35).toBeCloseTo(band.x + band.w / 2, 1);
    }
  });
});

describe("rooms (Requirements 3.1, 3.2)", () => {
  const part = (name: string): ShapeNode | undefined =>
    nodesOf(houseLayer()).find((n) => n.part === name);
  // Left and right edges of the rects, circles and ellipses of a part. Paths
  // are skipped: the books (relative path data) sit inside their bookcase rect.
  const xs = (name: string): number[] =>
    nodesOf(part(name) ?? g("none", [])).flatMap((n) => {
      if (n.kind === "rect") return [n.x ?? 0, (n.x ?? 0) + (n.width ?? 0)];
      const r = n.rx ?? n.r ?? 0;
      return n.cx === undefined ? [] : [n.cx - r, n.cx + r];
    });

  it("the Entrance_Hall, with the front door and the table, is left of the Parlour", () => {
    expect(Math.max(...xs("entrance-hall"))).toBeLessThanOrEqual(760);
    expect(Math.min(...xs("parlour"))).toBeGreaterThanOrEqual(760);
    const hall = part("entrance-hall");
    expect(hall === undefined ? [] : classesOf(hall)).toEqual(
      expect.arrayContaining(["door", "telephone-table"]),
    );
  });

  it("each floor holds its furniture", () => {
    const furniture = {
      attic: ["beams", "cobweb", "trunk"],
      "middle floor": [
        "door",
        "telephone-table",
        "fireplace",
        "shelves",
        "portrait-frame",
      ],
      basement: ["stone-joints", "boiler", "pipe", "chain"],
    } as const;
    for (const [floor, names] of Object.entries(furniture)) {
      const group = part(FLOOR_CLASS[floor as keyof typeof furniture]);
      expect(group === undefined ? [] : classesOf(group)).toEqual(
        expect.arrayContaining([...names]),
      );
    }
  });
});
