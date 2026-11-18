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
import {
  ATTIC_CLIP,
  BODY,
  FLOOR_CLASS,
  ROOF,
  ROOF_INNER,
  ROOF_RIM,
  TOWER,
  WALL,
  houseLayer,
} from "./house.js";
import { chainedDoorArt, slotArt } from "./props.js";
import {
  MOON,
  RAIN_BOTTOM,
  RAIN_STEP,
  foregroundLayer,
  rainPath,
  skyLayers,
  weatherLayer,
} from "./sky.js";

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
    expect(layers).toEqual(["sky", "moon-sky", "hills-far", "hills-near"]);
    expect(classesOf(skyLayers())).toContain("moon");
    expect(classesOf(skyLayers())).not.toContain("cloud");
    expect(classesOf(foregroundLayer())).toEqual(
      expect.arrayContaining(["fence", "dead-tree", "rim-fg"]),
    );
  });

  it("hides the left edge of the moon behind the spire, inside a wide halo", () => {
    const spire = nodesOf(houseLayer()).find((n) => n.part === "spire");
    const pts = spire?.points ?? [];
    const d = `M${pts.slice(0, 2).join(" ")} L${pts.slice(2, 4).join(" ")} L${pts.slice(4).join(" ")} Z`;
    expect(winding(d, [MOON.cx - MOON.r + 6, MOON.cy])).not.toBe(0);
    expect(winding(d, [MOON.cx, MOON.cy])).toBe(0);
    const halo = nodesOf(skyLayers()).find((n) => n.cls === "moon-halo");
    expect(halo?.r).toBeGreaterThan(5 * MOON.r);
  });

  it("lights only the hill crests that face the moon, on the hill outline", () => {
    for (const hill of ["far", "near"]) {
      const rim = nodesOf(skyLayers()).find((n) => n.part === `rim-${hill}`);
      const outline = nodesOf(skyLayers()).find(
        (n) => n.part === `hill-${hill}`,
      );
      const [start] = pathPoints(rim?.d ?? "");
      expect(outline?.d).toContain(
        (rim?.d ?? "").slice(`M${start?.join(" ")} `.length),
      );
      expect(start?.[0]).toBeGreaterThan(900); // the moon is on the right
    }
  });

  it("puts the far hill higher than the near one, behind it", () => {
    const top = (part: string): number =>
      Math.min(
        ...pathPoints(
          nodesOf(skyLayers()).find((n) => n.part === part)?.d ?? "",
        ).map(([, y]) => y),
      );
    expect(top("hill-far")).toBeLessThan(top("hill-near") - 60);
  });

  it("builds the dead tree from polygons that taper to sharp tips", () => {
    const tree = nodesOf(foregroundLayer()).find((n) => n.part === "dead-tree");
    const limbs = tree?.children ?? [];
    expect(limbs.length).toBeGreaterThanOrEqual(6);
    for (const limb of limbs) {
      expect(limb.kind).toBe("polygon");
      const pts = limb.points ?? [];
      const half = pts.length / 2;
      // The tip is where both sides meet: points half-1 and half are the same.
      expect([pts[half - 2], pts[half - 1]]).toEqual([
        pts[half],
        pts[half + 1],
      ]);
      // The base is the widest part of the limb.
      const baseWidth = Math.hypot(
        (pts[0] ?? 0) - (pts.at(-2) ?? 0),
        (pts[1] ?? 0) - (pts.at(-1) ?? 0),
      );
      expect(baseWidth).toBeGreaterThan(5);
    }
  });

  it("draws the fog as soft gradient puffs in two drifting groups", () => {
    const weather = nodesOf(weatherLayer());
    const fogs = weather.filter((n) => n.cls?.startsWith("fog "));
    expect(fogs.map((n) => n.cls)).toEqual(["fog fog-back", "fog fog-front"]);
    for (const puff of fogs.flatMap((n) => n.children ?? [])) {
      expect(puff.kind).toBe("ellipse");
      const fill = weather.find((n) => n.id === puff.paint);
      expect(fill?.kind).toBe("radialGradient");
    }
  });
});

describe("rain loop (Requirement 3.3)", () => {
  it("one step of rain-fall lands every streak on another, so the loop never jumps", () => {
    const [sx, sy] = RAIN_STEP;
    for (const layer of ["far", "near"] as const) {
      const d = rainPath(layer);
      const starts = [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map(
        (m) => [Number(m[1]), Number(m[2])] as const,
      );
      const seen = new Set(starts.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of starts) {
        // Moved by one step: either another streak or below the drawn rain.
        if (y + sy < RAIN_BOTTOM)
          expect(seen.has(`${x + sx},${y + sy}`)).toBe(true);
        // Every visible streak was filled in from one step before.
        if (y >= 0) expect(seen.has(`${x - sx},${y - sy}`)).toBe(true);
      }
      // Columns start right of the scene, so the leftward drift leaves no gap.
      expect(Math.max(...starts.map(([x]) => x))).toBeGreaterThan(
        1600 - 6 * sx - 100,
      );
      // Every streak falls along the step, so the rain is diagonal and steady.
      for (const m of d.matchAll(/l(-?\d+) (\d+)/g)) {
        expect(Number(m[1]) / Number(m[2])).toBeCloseTo(sx / sy, 1);
      }
    }
  });
});

/** Winding number of the closed subpaths of absolute path data around a point. */
function winding(d: string, [px, py]: [number, number]): number {
  let total = 0;
  for (const sub of d.split("Z").filter((s) => s.trim() !== "")) {
    const pts = pathPoints(`${sub}Z`);
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length] ?? [x1, y1];
      const cross = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
      if (y1 <= py && y2 > py && cross > 0) total += 1;
      if (y1 > py && y2 <= py && cross < 0) total -= 1;
    });
  }
  return total;
}

describe("rain clip (Requirement 3.3)", () => {
  const weather = weatherLayer();
  const wrap = nodesOf(weather).find((n) => n.cls === "rain-wrap");
  const clip = nodesOf(weather).find((n) => n.id === wrap?.clip);
  const d = clip?.children?.[0]?.d ?? "";

  it("the still wrapper holds the clip; only the two layers inside it move", () => {
    expect(wrap?.clip).toBe("rain-sky");
    expect(wrap?.children?.map((n) => n.cls)).toEqual([
      "rain rain-far",
      "rain rain-near",
    ]);
  });

  it("lets rain fall only on the sky outside the house and above the ground", () => {
    const sky: [number, number][] = [
      [420, 300],
      [1209, 600],
      [1400, 500],
      [870, 120],
      [1000, 205],
    ];
    const solid: [number, number][] = [
      [870, 600],
      [600, 420],
      [1028, 240],
      [1268, 500],
      [1268, 200],
      [870, 170],
      [300, 800],
      [1268, 900],
    ];
    for (const p of sky) expect(winding(d, p), `${p}`).not.toBe(0);
    for (const p of solid) expect(winding(d, p), `${p}`).toBe(0);
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
  });

  it("has a symmetric gable over the body centre, with the rim on its edge", () => {
    const [l, ly, rx, ry, r, rY] = ROOF;
    expect(ly).toBe(rY);
    expect(rx - l).toBe(r - rx);
    expect(rx).toBe((BODY.left + BODY.right) / 2);
    const [il, ily, irx, iry, ir, irY] = ROOF_INNER;
    expect([ily, irY, irx]).toEqual([ly, ly, rx]);
    expect(irx - il).toBe(ir - irx);
    expect(iry).toBeGreaterThan(ry);
    // Both lines have the same slope, so the band keeps one thickness.
    expect((ly - iry) / (irx - il)).toBeCloseTo((ly - ry) / (rx - l), 2);
    const roof = nodesOf(houseLayer()).find((n) => n.part === "roof");
    expect(roof?.d).toContain(`M${l} ${ly} L${rx} ${ry} L${r} ${ly}`);
    const rim = nodesOf(houseLayer()).find((n) => n.part === "roof-rim");
    expect(rim?.d).toBe(`M${rx} ${ry} L${r} ${ly}`);
    expect(ROOF_RIM).toBe(rim?.d);
  });

  it("has an upright tower apart from the roof, with a centred spire, vane and lit arch", () => {
    const tower = nodesOf(houseLayer()).find((n) => n.part === "tower");
    const inTower = tower === undefined ? [] : nodesOf(tower);
    expect(inTower.filter((n) => n.transform !== undefined)).toEqual([]);
    const spire = inTower.find((n) => n.part === "spire")?.points ?? [];
    const centre = TOWER.x + TOWER.w / 2;
    expect([spire[4], spire[5]]).toEqual([centre, TOWER.apex]);
    expect(centre - (spire[0] ?? 0)).toBe((spire[2] ?? 0) - centre);
    expect(TOWER.x).toBeGreaterThan(ROOF[4]); // clear of the right eave
    const parts = inTower.map((n) => n.part);
    expect(parts).toEqual(
      expect.arrayContaining(["weathervane", "tower-arch"]),
    );
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

  it("is a tall spectre with a ragged tail, a cobweb and a glow, and no mouth, hood or horns", () => {
    expect(parts).toEqual(
      expect.arrayContaining(["outline", "tail-ragged", "cobweb", "glow"]),
    );
    for (const other of ["hem-round", "tail-spiral", "hood", "horns"]) {
      expect(parts).not.toContain(other);
    }
    expect(classesOf(wisp)).not.toContain("ghost-mouth");
    expect(GHOST_BOX.wisp.h / GHOST_BOX.wisp.w).toBeGreaterThan(1.5);
    const idle = nodesOf(wisp).find((n) => n.cls === "ghost-idle");
    expect(idle === undefined ? [] : classesOf(idle)).toContain("ghost-body");
  });

  it("paints the body with a vertical gradient that fades out at the tail", () => {
    const body = nodesOf(wisp).find((n) => n.cls === "ghost-body");
    const fill = nodesOf(wisp).find((n) => n.id === body?.paint);
    expect(fill).toMatchObject({
      kind: "linearGradient",
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 1,
    });
    expect(fill?.children?.at(-1)).toMatchObject({
      cls: "stop-spectre-2",
      offset: 1,
    });
  });

  it("has two small slanted eyes, 4/88 of its height", () => {
    const eyes = nodesOf(wisp).filter((n) => n.part === "eye");
    expect(eyes).toHaveLength(2);
    for (const eye of eyes) {
      expect((2 * (eye.ry ?? 0)) / GHOST_BOX.wisp.h).toBe(4 / 88);
      expect(eye.transform?.rotate).not.toBe(0);
    }
    expect(GHOST_TYPES.wisp.eyeHeight / GHOST_TYPES.wisp.box.h).toBe(4 / 88);
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
        const holder = nodesOf(tree).find((n) =>
          n.cls?.startsWith("slot-ghost "),
        );
        expect(holder?.cls).toContain(`ghost-phase-${slot.index % 4}`);
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

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The points of absolute path data (M L H V C S Q T Z), with H and V read right. */
function pathPoints(d: string): [number, number][] {
  const pts: [number, number][] = [];
  let [x, y] = [0, 0];
  for (const [, cmd = "", args = ""] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const n = (args.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (cmd === "H") n.forEach((v) => pts.push([(x = v), y]));
    else if (cmd === "V") n.forEach((v) => pts.push([x, (y = v)]));
    else if (/[MLCSQT]/.test(cmd)) {
      for (let i = 0; i + 1 < n.length; i += 2) {
        [x, y] = [n[i] ?? 0, n[i + 1] ?? 0];
        pts.push([x, y]);
      }
    } else if (cmd !== "Z") throw new Error(`relative path data: ${cmd}`);
  }
  return pts;
}

/** The box around a leaf's points (stroke paths included, so beams count). */
function boxOf(node: ShapeNode): Box | null {
  const pts =
    node.d === undefined
      ? pointsOf({ ...node, children: [] })
      : pathPoints(node.d);
  if (node.kind === "circle" || node.kind === "ellipse") {
    const [cx = 0, cy = 0] = pts[0] ?? [];
    const rx = node.rx ?? node.r ?? 0;
    const ry = node.ry ?? node.r ?? 0;
    return { x1: cx - rx, y1: cy - ry, x2: cx + rx, y2: cy + ry };
  }
  if (pts.length === 0) return null;
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
  };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

/** The furniture of one floor: every leaf of its group except the room back and its lights. */
function furnitureOf(floor: Floor): ShapeNode[] {
  const group = nodesOf(houseLayer()).find(
    (n) => n.part === FLOOR_CLASS[floor],
  );
  return nodesOf(group ?? g("none", [])).filter(
    (n) =>
      n.children === undefined &&
      !(n.cls ?? "").startsWith("room-back") &&
      !(n.cls ?? "").includes("light"),
  );
}

describe("furniture and slot panes (Requirement 12.5)", () => {
  /** Every pane frame of a floor for 1 to 5 Cards. */
  const panes = (floor: Floor): Box[] =>
    [1, 2, 3, 4, 5].flatMap((count) =>
      slotRects(floor, count).flatMap((rect, index) => {
        const slot: SlotPlacement = {
          key: `${floor}#${index}`,
          floor,
          index,
          variant: 0,
          ghostType: GHOST_TYPE_OF[floor],
          path: "a.ts",
          state: "locked",
          rect,
          ghostScale: 1,
        };
        const frame = nodesOf(slotArt(slot)).find(
          (n) => n.cls === "pane-frame",
        );
        const box = frame === undefined ? null : boxOf(frame);
        return box === null ? [] : [box];
      }),
    );

  it("no pane covers furniture, whatever the number of Cards", () => {
    for (const floor of ["attic", "middle floor", "basement"] as const) {
      const hits = furnitureOf(floor).filter((n) => {
        const box = boxOf(n);
        return box !== null && panes(floor).some((p) => overlaps(p, box));
      });
      expect(hits.map((n) => `${floor}: ${n.cls ?? n.kind}`)).toEqual([]);
    }
  });
});

describe("simple, iconic silhouettes (art review, item 13)", () => {
  const FORBIDDEN =
    /brick-wall|stone-joint|grain|wood|lightning|bolt|human|person|figure|ornate|carving|filigree/;
  const trees = [
    skyLayers(),
    houseLayer(),
    weatherLayer(),
    foregroundLayer(),
    ghostArt("wisp", 0, "haunted"),
    ...["attic", "middle floor", "basement"].map((f) =>
      chainedDoorArt(f as Floor),
    ),
  ];

  it("draws no individual brick wall, wood texture, lightning, people or ornate furniture", () => {
    const names = trees.flatMap((tree) =>
      nodesOf(tree).flatMap((n) => [
        ...(n.cls?.split(" ") ?? []),
        n.part ?? "",
      ]),
    );
    expect(names.filter((name) => FORBIDDEN.test(name))).toEqual([]);
    expect(names.filter((name) => name === "brick").length).toBeLessThanOrEqual(
      5,
    );
  });

  it("keeps every piece of furniture to a few shapes", () => {
    for (const floor of ["attic", "middle floor", "basement"] as const) {
      const group = nodesOf(houseLayer()).find(
        (n) => n.part === FLOOR_CLASS[floor],
      );
      const PIECES =
        /^(?:trunk|telephone-table|shelves|fireplace|boiler|chain)\b/;
      const pieces = nodesOf(group ?? g("none", [])).filter((n) =>
        PIECES.test(n.cls ?? ""),
      );
      expect(pieces.length).toBeGreaterThan(0);
      for (const piece of pieces) {
        const leaves = nodesOf(piece).filter((n) => n.children === undefined);
        expect(leaves.length, `${floor}: ${piece.cls}`).toBeLessThanOrEqual(14);
      }
    }
  });
});

describe("attic volume (art review 3, item 10)", () => {
  const all = nodesOf(houseLayer());
  const clip = all.find((n) => n.id === ATTIC_CLIP)?.children?.[0];
  const pts = clip?.points ?? [];
  const pairs = pts.flatMap((v, i) =>
    i % 2 === 0 ? [`${v} ${pts[i + 1]}`] : [],
  );
  const inside = `M${pairs.join(" L")} Z`;

  it("rises to the ridge with no flat ceiling, and holds the round window", () => {
    const attic = all.find((n) => n.part === FLOOR_CLASS.attic);
    const backs = (attic?.children ?? []).filter((n) =>
      n.cls?.startsWith("room-back"),
    );
    expect(Math.min(...backs.map((n) => n.y ?? 0))).toBe(ROOF_INNER[3]);
    const oculus = nodesOf(attic ?? g("none", [])).find(
      (n) => n.part === "oculus",
    );
    const frame = oculus?.children?.[0];
    expect(
      winding(inside, [frame?.cx ?? 0, (frame?.cy ?? 0) - (frame?.r ?? 0)]),
    ).not.toBe(0);
  });

  it("keeps every piece of attic furniture inside the attic shape", () => {
    for (const n of furnitureOf("attic")) {
      const box = boxOf(n);
      if (box === null) continue;
      for (const corner of [
        [box.x1, box.y1],
        [box.x2, box.y1],
      ] as [number, number][]) {
        expect(winding(inside, corner), `${n.cls}`).not.toBe(0);
      }
    }
  });
});

describe("walls with weight (Requirement 3.1)", () => {
  it("gives floors, foundation, partition and outer walls 8 to 12 units", () => {
    const parts = nodesOf(houseLayer()).find((n) => n.part === "structure");
    for (const n of parts?.children ?? []) {
      expect(Math.min(n.width ?? 0, n.height ?? 0)).toBe(WALL);
    }
    const partition = nodesOf(houseLayer()).find((n) =>
      n.cls?.startsWith("partition"),
    );
    const sides = [
      FLOOR_RECT["middle floor"].x - BODY.left,
      BODY.right -
        (FLOOR_RECT["middle floor"].x + FLOOR_RECT["middle floor"].w),
      partition?.width ?? 0,
    ];
    for (const t of sides) {
      expect(t).toBeGreaterThanOrEqual(8);
      expect(t).toBeLessThanOrEqual(12);
    }
  });
});

describe("light (Requirement 3.1)", () => {
  const all = nodesOf(houseLayer());

  it("the fire has three stacked flames, each one narrower and shorter", () => {
    const flames = all.find((n) => n.part === "flames")?.children ?? [];
    const boxes = flames.flatMap((n) => boxOf(n) ?? []);
    expect(boxes).toHaveLength(3);
    for (let i = 1; i < 3; i += 1) {
      const [outer, inner] = [boxes[i - 1], boxes[i]];
      expect(inner?.x2 ?? 0).toBeLessThan(outer?.x2 ?? 0);
      expect(inner?.y1 ?? 0).toBeGreaterThan(outer?.y1 ?? 0);
    }
  });

  it("every room back is a radial gradient, and three warm cones fade out", () => {
    for (const back of all.filter((n) => n.part === "room-back")) {
      expect(all.find((n) => n.id === back.paint)?.kind).toBe("radialGradient");
    }
    const cones = all.filter(
      (n) => n.kind === "polygon" && n.cls?.startsWith("light-cone"),
    );
    expect(cones).toHaveLength(3);
    for (const cone of cones) {
      const fill = all.find((n) => n.id === cone.paint);
      expect(fill?.children?.map((s) => s.cls)).toEqual([
        "stop-cone-0",
        "stop-cone-1",
      ]);
    }
  });
});

describe("basement in the ground (Requirement 3.1)", () => {
  it("sits in one dark ground block across the whole width, with at most 5 bricks", () => {
    const ground = nodesOf(houseLayer()).find((n) => n.part === "ground");
    expect(ground).toMatchObject({ x: 0, y: 760, width: 1600, height: 240 });
    expect(ground?.cls).toContain("tone-abyss");
    const bricks = furnitureOf("basement").filter((n) => n.cls === "brick");
    expect(bricks.length).toBeGreaterThanOrEqual(4);
    expect(bricks.length).toBeLessThanOrEqual(5);
  });

  it("keeps the boiler well apart from the chained door", () => {
    const boiler = nodesOf(houseLayer()).find((n) => n.cls === "boiler");
    const boxes = (boiler?.children ?? []).flatMap((n) => boxOf(n) ?? []);
    const door = nodesOf(chainedDoorArt("basement")).find(
      (n) => n.cls === "door-panel",
    );
    const right = Math.max(...boxes.map((b) => b.x2));
    expect((door?.x ?? 0) - right).toBeGreaterThan(100);
  });
});

describe("nothing floats (Requirement 3.1)", () => {
  const all = nodesOf(houseLayer());
  const one = (cls: string): ShapeNode | undefined =>
    all.find((n) => n.cls?.split(" ").includes(cls));

  it("the lintel rests on the door frame, and the door sits inside it", () => {
    const [lintel, frame, door] = ["lintel", "door-frame", "door"].map(one);
    expect((lintel?.y ?? 0) + (lintel?.height ?? 0)).toBe(frame?.y);
    expect(lintel?.x).toBeLessThan(frame?.x ?? 0);
    expect(door?.x).toBeGreaterThan(frame?.x ?? 0);
  });

  it("the table legs stand on the middle floor and touch the top", () => {
    const top = one("table-top");
    const legs = all.filter((n) => n.cls === "table-leg");
    expect(legs).toHaveLength(2);
    for (const leg of legs) {
      expect(leg.y).toBe((top?.y ?? 0) + (top?.height ?? 0));
      expect((leg.y ?? 0) + (leg.height ?? 0)).toBe(755);
    }
  });

  it("each basement chain hangs from a ring under the joist", () => {
    const joist = one("joist");
    const rings = all.filter((n) => n.cls === "chain-ring");
    expect(rings).toHaveLength(2);
    for (const ring of rings) {
      const x = ring.cx ?? 0;
      expect(x).toBeGreaterThan(joist?.x ?? 0);
      expect(x).toBeLessThan((joist?.x ?? 0) + (joist?.width ?? 0));
      expect((ring.cy ?? 0) - (ring.r ?? 0)).toBe(
        (joist?.y ?? 0) + (joist?.height ?? 0),
      );
    }
  });

  it("the foreground has no lantern post and the weather no fog bands", () => {
    expect(nodesOf(foregroundLayer()).map((n) => n.part)).not.toContain(
      "lantern",
    );
    const fog = nodesOf(weatherLayer()).filter((n) => n.cls?.includes("fog"));
    expect(fog.filter((n) => n.kind === "path")).toEqual([]);
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
      basement: ["brick", "boiler", "pipe", "chain"],
    } as const;
    for (const [floor, names] of Object.entries(furniture)) {
      const group = part(FLOOR_CLASS[floor as keyof typeof furniture]);
      expect(group === undefined ? [] : classesOf(group)).toEqual(
        expect.arrayContaining([...names]),
      );
    }
  });
});
