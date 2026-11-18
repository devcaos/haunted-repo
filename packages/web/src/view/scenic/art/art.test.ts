import { describe, expect, it } from "vitest";
import {
  circle,
  defs,
  ellipse,
  g,
  gradient,
  image,
  isSameSiteHref,
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
  type Rect,
  type SlotPlacement,
  type VariantNumber,
} from "../model/sceneLayout.js";
import { GHOST_TYPES, ghostArt } from "./ghosts.js";
import {
  ATTIC_BACK,
  ATTIC_CLIP,
  ATTIC_TRIANGLE,
  GROUND_Y,
  HOUSE_OUTLINE,
  ILLUSTRATION_PROPS,
  TELEPHONE_ANCHOR,
  atticClip,
  sceneBackdrop,
} from "./house.js";
import { FLOOR_LINE, chainedDoorArt, slotArt } from "./props.js";
import { RAIN_BOTTOM, RAIN_STEP, rainPath, weatherLayer } from "./weather.js";
// The Shape_Data rules (Requirements 22.1, 17.1; design "Shape_Data").
// prettier-ignore
const KINDS = new Set<string>([
  "g", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line",
  "defs", "linearGradient", "radialGradient", "stop", "clipPath", "image",
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
  ...["paint", "clip", "fill", "stroke", "children", "href"],
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
    // The only address: a same-site path, on an image only.
    if (node.href !== undefined) {
      if (node.kind !== "image") problems.push(`href on ${node.kind}`);
      if (!isSameSiteHref(node.href)) problems.push(`href "${node.href}"`);
    }
    if (node.kind === "image" && node.children !== undefined) {
      problems.push("children on image");
    }
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

  it("accepts an image with a same-site path and catches any other address", () => {
    const art = "/haunted-repo/assets/house-scene-B1x_9.svg";
    expect(shapeProblems(image("scene-art", art, 0, 0, 1600, 1000))).toEqual(
      [],
    );
    expect(
      shapeProblems(
        image(
          "a",
          "/haunted-repo/src/view/assets/files/house-scene.svg",
          0,
          0,
          1,
          1,
        ),
      ),
    ).toEqual([]);
    for (const bad of [
      "https://cdn.example/a.svg",
      "http://example.com/a.svg",
      "//cdn.example/a.svg",
      "data:image/svg+xml,<svg/>",
      "javascript:alert(1)",
      "assets/a.svg",
      "/a/../b.svg",
      "/a.svg?x=1",
      '/a.svg" onload="x',
      "/folder/",
    ]) {
      expect(isSameSiteHref(bad), bad).toBe(false);
      expect(shapeProblems(image("a", bad, 0, 0, 1, 1))).toEqual([
        `href "${bad}"`,
      ]);
    }
    expect(shapeProblems({ ...rect("a", 0, 0, 1, 1), href: art })).toEqual([
      "href on rect",
    ]);
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

describe("weather overlay (Requirement 3.3)", () => {
  const weather = weatherLayer();
  const wrap = nodesOf(weather).find((n) => n.cls === "rain-wrap");
  const clip = nodesOf(weather).find((n) => n.id === wrap?.clip);
  const d = clip?.children?.[0]?.d ?? "";

  it("passes the Shape_Data rules", () => {
    expect(shapeProblems(weather)).toEqual([]);
  });

  it("the still wrapper holds the clip; only the two layers inside it move", () => {
    expect(wrap?.clip).toBe("rain-sky");
    expect(wrap?.children?.map((n) => n.cls)).toEqual([
      "rain rain-far",
      "rain rain-near",
    ]);
  });

  it("lets rain fall only on the sky outside the illustrated house and above the ground", () => {
    const sky: [number, number][] = [
      [200, 300],
      [1400, 500],
      [756, 100],
      [1060, 300], // right of the roof, left of the tower
      [1300, 650],
    ];
    const solid: [number, number][] = [
      [756, 300], // attic
      [700, 600], // middle floor
      [1178, 200], // tower spire
      [1178, 600], // tower shaft
      [700, 800], // basement, under the ground
      [100, GROUND_Y + 5],
    ];
    for (const p of sky) expect(winding(d, p), `${p}`).not.toBe(0);
    for (const p of solid) expect(winding(d, p), `${p}`).toBe(0);
    // The outline stands on the ground line.
    const ys = HOUSE_OUTLINE.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBe(GROUND_Y);
  });

  it("draws the fog as soft gradient puffs in two drifting groups", () => {
    const all = nodesOf(weather);
    const fogs = all.filter((n) => n.cls?.startsWith("fog "));
    expect(fogs.map((n) => n.cls)).toEqual(["fog fog-back", "fog fog-front"]);
    for (const puff of fogs.flatMap((n) => n.children ?? [])) {
      expect(puff.kind).toBe("ellipse");
      expect(all.find((n) => n.id === puff.paint)?.kind).toBe("radialGradient");
    }
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

describe("scene backdrop (director's decision, 18 Nov)", () => {
  const href = "/haunted-repo/assets/house-scene-B1x_9.svg";

  it("is one image over the whole viewBox, with nothing parsed from it", () => {
    const art = sceneBackdrop(href);
    expect(art).toEqual({
      kind: "image",
      cls: "scene-art",
      href,
      x: 0,
      y: 0,
      width: 1600,
      height: 1000,
    });
    expect(shapeProblems(art)).toEqual([]);
  });

  it("falls back to a plain token-colour rectangle without the file", () => {
    const art = sceneBackdrop(null);
    expect(art).toEqual(rect("scene-fallback", 0, 0, 1600, 1000));
    expect(art.href).toBeUndefined();
    expect(shapeProblems(art)).toEqual([]);
  });

  it("keeps the attic dim clip a valid Shape_Data tree", () => {
    const tree = g("dims", [
      defs([atticClip()]),
      rect("dim", ATTIC_BACK.x, ATTIC_BACK.y, ATTIC_BACK.w, ATTIC_BACK.h, {
        clip: ATTIC_CLIP,
      }),
    ]);
    expect(shapeProblems(tree)).toEqual([]);
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

  it("the pane is a centred gothic arch about 1:2, 4 units below the slot top, on a wider sill", () => {
    for (const slot of allSlots) {
      const nodes = nodesOf(slotArt(slot));
      const frame = nodes.find((n) => n.cls === "pane-frame");
      const box = frame === undefined ? null : boxOf(frame);
      const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = box ?? {};
      expect((x1 + x2) / 2).toBeCloseTo(slot.rect.x + slot.rect.w / 2, 1);
      expect(y1).toBe(slot.rect.y + 4);
      expect((y2 - y1) / (x2 - x1)).toBeCloseTo(2, 0);
      expect(frame?.d).toContain("Q"); // pointed top
      const sill = nodes.find((n) => n.cls === "pane-sill");
      expect(sill?.width ?? 0).toBeGreaterThan(x2 - x1);
      expect(sill?.y).toBe(y2);
      expect(nodes.some((n) => n.cls === "pane-glint")).toBe(true);
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

describe("slots on the scene illustration (director's decision, 18 Nov)", () => {
  const FLOORS = ["attic", "middle floor", "basement"] as const;
  const apart = (a: Rect, b: Rect): boolean =>
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y;
  const triangle = (() => {
    const [ax, ay, bx, by, cx, cy] = ATTIC_TRIANGLE;
    return `M${ax} ${ay} L${bx} ${by} L${cx} ${cy} Z`;
  })();

  it("the attic dim box is the floor rectangle around the attic triangle", () => {
    const xs = ATTIC_TRIANGLE.filter((_, i) => i % 2 === 0);
    const ys = ATTIC_TRIANGLE.filter((_, i) => i % 2 === 1);
    const box = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
    expect(box).toEqual({ ...ATTIC_BACK });
    expect(FLOOR_RECT.attic).toEqual(box);
    expect(atticClip().children?.[0]?.points).toEqual(ATTIC_TRIANGLE);
  });

  it("no slot covers the telephone, the boiler or the stairs, with 1 to 5 Cards", () => {
    for (const floor of FLOORS) {
      for (let count = 1; count <= 5; count += 1) {
        for (const slot of slotRects(floor, count)) {
          for (const [name, prop] of Object.entries(ILLUSTRATION_PROPS)) {
            expect(apart(slot, prop), `${floor} ${count}: ${name}`).toBe(true);
          }
        }
      }
    }
  });

  it("no attic slot pokes through the roof, and every slot stands above its floor line", () => {
    for (let count = 1; count <= 5; count += 1) {
      for (const slot of slotRects("attic", count)) {
        for (const corner of [
          [slot.x, slot.y],
          [slot.x + slot.w, slot.y],
        ] as [number, number][]) {
          expect(winding(triangle, corner), `${count}: ${corner}`).not.toBe(0);
        }
      }
    }
    for (const floor of FLOORS) {
      const band = SLOT_BAND[floor];
      const room = FLOOR_RECT[floor];
      expect(band.y + band.h).toBeLessThanOrEqual(room.y + room.h);
      expect(band.y).toBeGreaterThanOrEqual(room.y);
    }
  });

  it("anchors the telephone on its table in the hall, left of every middle-floor slot", () => {
    const phone = ILLUSTRATION_PROPS.telephone;
    expect(TELEPHONE_ANCHOR.x).toBeGreaterThan(phone.x);
    expect(TELEPHONE_ANCHOR.x).toBeLessThan(phone.x + phone.w);
    expect(TELEPHONE_ANCHOR.y).toBeGreaterThan(phone.y);
    expect(TELEPHONE_ANCHOR.y).toBeLessThan(phone.y + phone.h);
    expect(TELEPHONE_ANCHOR.x).toBeLessThan(SLOT_BAND["middle floor"].x);
  });
});

describe("chained doors stand on their floor", () => {
  it("every chained door stands on its floor inside a frame, over a threshold", () => {
    for (const floor of ["attic", "middle floor", "basement"] as const) {
      const door = nodesOf(chainedDoorArt(floor));
      const panel = door.find((n) => n.cls === "door-panel");
      const sill = door.find((n) => n.cls === "door-threshold");
      expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBe(FLOOR_LINE[floor]);
      expect((sill?.y ?? 0) + (sill?.height ?? 0)).toBe(FLOOR_LINE[floor]);
      expect(door.some((n) => n.cls === "door-frame")).toBe(true);
    }
  });
});
