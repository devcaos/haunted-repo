/// <reference types="node" />
import { readFileSync } from "node:fs";
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
import { GHOST_TYPES, VARIANTS, ghostArt } from "./ghosts.js";
import { ICON_BOX, bestiaryArt, ghostIconArt, phoneIconArt } from "./icons.js";
import {
  ATTIC_BACK,
  ATTIC_CLIP,
  ATTIC_TRIANGLE,
  GROUND_Y,
  HOUSE_OUTLINE,
  HOUSE_POLYGON,
  ILLUSTRATION_PROPS,
  TOWER_POLYGON,
  TELEPHONE_ANCHOR,
  atticClip,
  sceneBackdrop,
} from "./house.js";
import {
  CANDLE_EXTENT,
  CLOCHE_EXTENT,
  FLOOR_LINE,
  RING_ARC_RADII,
  RING_CENTRE,
  RING_GLOW_RADIUS,
  chainedDoorArt,
  ringEffectsArt,
  slotArt,
} from "./props.js";
import { RAIN_BOTTOM, RAIN_STEP, rainPath, weatherLayer } from "./weather.js";
import { CANDLE_X, ROOM_BOX, roomArt, roomRainPath } from "./room.js";
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

  /** Point in polygon by ray casting, independent of the clip's winding rule. */
  const inside = (
    poly: readonly number[],
    [px, py]: [number, number],
  ): boolean => {
    let hit = false;
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const [xi = 0, yi = 0, xj = 0, yj = 0] = [
        poly[i],
        poly[i + 1],
        poly[j],
        poly[j + 1],
      ];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
        hit = !hit;
    }
    return hit;
  };

  it("lets rain fall only on the sky: never on the house, the tower or below the ground line", () => {
    // Spot checks by name.
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
      [1120, 650], // house and tower overlap
      [700, 800], // basement, under the ground
      [100, GROUND_Y + 5],
    ];
    for (const p of sky) expect(winding(d, p), `${p}`).not.toBe(0);
    for (const p of solid) expect(winding(d, p), `${p}`).toBe(0);
    // Every point of a grid over the viewBox: blocked exactly when it is in
    // the house polygon, in the tower polygon or below the ground line.
    for (let x = 3; x < 1600; x += 11) {
      for (let y = 3; y < 1000; y += 11) {
        const blocked =
          inside(HOUSE_POLYGON, [x, y]) ||
          inside(TOWER_POLYGON, [x, y]) ||
          y > GROUND_Y;
        expect(winding(d, [x, y]) === 0, `${x},${y}`).toBe(blocked);
      }
    }
    // The outline stands on the ground line.
    const ys = HOUSE_OUTLINE.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBe(GROUND_Y);
  });

  it("uses the house and tower polygons of the illustration", () => {
    expect(HOUSE_POLYGON).toEqual([
      362, 511, 756, 127, 1149, 511, 1144, 711, 367, 711,
    ]);
    expect(TOWER_POLYGON).toEqual([
      1102, 711, 1102, 284, 1178, 56, 1253, 284, 1253, 711,
    ]);
  });

  it("draws thin, faint drops: about 1 unit wide and at most 0.3 opacity", () => {
    const css = readFileSync(
      new URL("../styles/stage.css", import.meta.url),
      "utf8",
    );
    const tokens = readFileSync(
      new URL("../styles/scenic-tokens.css", import.meta.url),
      "utf8",
    );
    const width =
      /\.house \.rain-streaks\s*{[^}]*stroke-width:\s*([\d.]+)/.exec(css);
    expect(Number(width?.[1])).toBeLessThanOrEqual(1);
    const far =
      /\.house \.rain-far \.rain-streaks\s*{[^}]*stroke-width:\s*([\d.]+)/.exec(
        css,
      );
    expect(Number(far?.[1])).toBeLessThanOrEqual(1);
    const opacity = /--sc-rain:\s*([\d.]+)/.exec(tokens);
    expect(Number(opacity?.[1])).toBeGreaterThan(0.2);
    expect(Number(opacity?.[1])).toBeLessThanOrEqual(0.3);
    expect(Number(/--sc-rain-far:\s*([\d.]+)/.exec(tokens)?.[1])).toBeLessThan(
      Number(opacity?.[1]),
    );
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

describe("the three Ghost_Types, Variant 0 (Requirements 5.4, 5.6, 6.1; director's decision, 18 Nov)", () => {
  const TYPES = ["wisp", "lantern-wraith", "chained-brute"] as const;
  const art = (type: (typeof TYPES)[number]) => ghostArt(type, 0, "haunted");
  const partsOf = (tree: ShapeNode): string[] =>
    nodesOf(tree).flatMap((n) => (n.part === undefined ? [] : [n.part]));
  const boxOfAll = (nodes: ShapeNode[]): Box => {
    const pts = nodes.flatMap((n) => pointsOf(n));
    const xs = pts.map(([x]) => x);
    const ys = pts.map(([, y]) => y);
    return {
      x1: Math.min(...xs),
      y1: Math.min(...ys),
      x2: Math.max(...xs),
      y2: Math.max(...ys),
    };
  };

  it("every type passes the Shape_Data rules", () => {
    for (const type of TYPES) expect(shapeProblems(art(type))).toEqual([]);
  });

  it("is a hooded wraith with a pointed hood, a dark face, a reaching arm and a glow, and no mouth", () => {
    for (const type of TYPES) {
      const tree = art(type);
      expect(partsOf(tree)).toEqual(
        expect.arrayContaining([
          "outline",
          "hooded-robe",
          "arm",
          "face",
          "glow",
        ]),
      );
      expect(classesOf(tree)).not.toContain("ghost-mouth");
      // The hood ends in one point: the path starts at its single topmost point.
      const robe = nodesOf(tree).find((n) => n.part === "hooded-robe");
      const pts = pathPoints(robe?.d ?? "");
      const top = Math.min(...pts.map(([, y]) => y));
      expect(pts[0]?.[1]).toBe(top);
      expect(pts.filter(([, y]) => y === top)).toHaveLength(2); // start and close
      // The face sits under the hood point, in the upper third.
      const face = boxOf(nodesOf(tree).find((n) => n.part === "face")!);
      expect(face?.y1 ?? 0).toBeGreaterThan(top);
      expect(face?.y2 ?? 0).toBeLessThan(GHOST_BOX[type].h / 3);
      const idle = nodesOf(tree).find((n) => n.cls === "ghost-idle");
      expect(idle === undefined ? [] : classesOf(idle)).toContain("ghost-body");
    }
  });

  it("ends the robe in long asymmetric points", () => {
    const robe = nodesOf(art("wisp")).find((n) => n.part === "hooded-robe");
    const pts = pathPoints(robe?.d ?? "");
    const h = GHOST_BOX.wisp.h;
    // Tips: points in the lowest third that are lower than both neighbours.
    const tips = pts.filter(
      ([, y], i) =>
        y > (2 * h) / 3 &&
        y > (pts[i - 1]?.[1] ?? Infinity) &&
        y > (pts[i + 1]?.[1] ?? Infinity),
    );
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(new Set(tips.map(([, y]) => y)).size).toBe(tips.length);
  });

  it("paints the body with a vertical gradient that fades out at the bottom", () => {
    for (const type of TYPES) {
      const tree = art(type);
      const body = nodesOf(tree).find((n) => n.cls === "ghost-body");
      const fill = nodesOf(tree).find((n) => n.id === body?.paint);
      expect(fill).toMatchObject({
        kind: "linearGradient",
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 1,
      });
      expect(fill?.children?.at(-1)).toMatchObject({
        cls: "stop-spectre-3",
        offset: 1,
      });
    }
  });

  it("floats: it casts no shadow, and its only ellipse behind the body is the glow", () => {
    for (const type of TYPES) {
      const tree = art(type);
      expect(classesOf(tree).filter((c) => /shadow/.test(c))).toEqual([]);
      const idleAt = (tree.children ?? []).findIndex(
        (n) => n.cls === "ghost-idle",
      );
      const before = (tree.children ?? []).slice(0, idleAt);
      expect(before.map((n) => n.part ?? n.kind)).toEqual(["defs", "glow"]);
    }
  });

  it("makes its glow a radial-gradient ellipse behind the body", () => {
    for (const type of TYPES) {
      const tree = art(type);
      const kids = tree.children ?? [];
      const glowAt = kids.findIndex((n) => n.part === "glow");
      const idleAt = kids.findIndex((n) => n.cls === "ghost-idle");
      expect(glowAt).toBeGreaterThanOrEqual(0);
      expect(glowAt).toBeLessThan(idleAt);
      const glow = kids[glowAt]?.children?.[0];
      expect(glow?.kind).toBe("ellipse");
      const fill = nodesOf(tree).find((n) => n.id === glow?.paint);
      expect(fill?.kind).toBe("radialGradient");
      expect(fill?.children?.map((s) => s.cls)).toEqual([
        "stop-cold-0",
        "stop-cold-1",
      ]);
    }
  });

  it("has two small slanted pale eyes", () => {
    for (const type of TYPES) {
      const eyes = nodesOf(art(type)).filter((n) => n.part === "eye");
      expect(eyes).toHaveLength(2);
      const { box, eyeHeight } = GHOST_TYPES[type];
      for (const eye of eyes) {
        expect(2 * (eye.ry ?? 0)).toBeCloseTo(eyeHeight, 2);
        expect(eye.transform?.rotate).not.toBe(0);
      }
      expect(eyeHeight / box.h).toBeLessThan(0.05);
    }
  });

  it("gives each type its own part: the Wisp is plain, the Lantern_Wraith holds a lantern, the Chained_Brute wears shackles and chains", () => {
    const parts = Object.fromEntries(
      TYPES.map((type) => [type, partsOf(art(type))]),
    );
    const own = ["lantern", "shackles", "chain"];
    expect(parts.wisp?.filter((p) => own.includes(p))).toEqual([]);
    expect(parts["lantern-wraith"]).toContain("lantern");
    expect(parts["lantern-wraith"]).not.toContain("shackles");
    expect(parts["chained-brute"]).toEqual(
      expect.arrayContaining(["shackles", "chain"]),
    );
    expect(parts["chained-brute"]).not.toContain("lantern");
    // The lantern light is cold: its stops are the lantern tokens, never warm.
    const lantern = nodesOf(art("lantern-wraith"));
    const light = lantern.find((n) => n.cls === "lantern-light");
    expect(
      lantern.find((n) => n.id === light?.paint)?.children?.map((s) => s.cls),
    ).toEqual(["stop-lantern-0", "stop-lantern-1"]);
    expect(classesOf(art("lantern-wraith")).join(" ")).not.toMatch(
      /warm|candle|pumpkin/,
    );
    // Dark iron with no light outline.
    expect(classesOf(art("chained-brute"))).not.toContain("ghost-rim");
  });

  it("the Wisp outline box equals its box; every type fits its box; the Wisp is the smallest and the Chained_Brute the widest", () => {
    const wispOutline = nodesOf(art("wisp")).find((n) => n.part === "outline");
    expect(boxOfAll(wispOutline === undefined ? [] : [wispOutline])).toEqual({
      x1: 0,
      y1: 0,
      x2: GHOST_BOX.wisp.w,
      y2: GHOST_BOX.wisp.h,
    });
    for (const type of TYPES) {
      const nodes = nodesOf(art(type)).filter((n) =>
        ["outline", "lantern-frame", "shackles", "chain"].includes(
          n.part ?? "",
        ),
      );
      const box = boxOfAll(nodes);
      expect(box.x1).toBeGreaterThanOrEqual(0);
      expect(box.y1).toBeGreaterThanOrEqual(0);
      expect(box.x2).toBeLessThanOrEqual(GHOST_BOX[type].w);
      expect(box.y2).toBeLessThanOrEqual(GHOST_BOX[type].h);
      expect(GHOST_TYPES[type].box).toEqual(GHOST_BOX[type]);
    }
    const {
      wisp,
      "lantern-wraith": wraith,
      "chained-brute": brute,
    } = GHOST_BOX;
    expect(wisp.w).toBeLessThan(wraith.w);
    expect(wraith.w).toBeLessThan(brute.w);
    expect(wisp.h).toBeLessThan(wraith.h);
  });
});

describe("the five Variants (Requirements 5.6, 5.9)", () => {
  const TYPES = ["wisp", "lantern-wraith", "chained-brute"] as const;
  const NUMBERS: readonly VariantNumber[] = [0, 1, 2, 3, 4];
  const partsOf = (tree: ShapeNode): string[] =>
    nodesOf(tree).flatMap((n) => (n.part === undefined ? [] : [n.part]));
  const eyesOf = (tree: ShapeNode): ShapeNode[] =>
    nodesOf(tree).filter((n) => n.part === "eye");

  it("every type at every Variant passes the Shape_Data rules, in both looks", () => {
    for (const type of TYPES) {
      for (const v of NUMBERS) {
        expect(shapeProblems(ghostArt(type, v, "haunted"))).toEqual([]);
        expect(shapeProblems(ghostArt(type, v, "locked"))).toEqual([]);
      }
    }
  });

  it("any two Variants of one type differ, in scale and in eye style", () => {
    for (const type of TYPES) {
      const trees = NUMBERS.map((v) => ghostArt(type, v, "haunted"));
      for (const [i, a] of trees.entries()) {
        for (const b of trees.slice(i + 1)) {
          expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
          expect(JSON.stringify(eyesOf(a))).not.toBe(JSON.stringify(eyesOf(b)));
        }
      }
    }
    expect(new Set(NUMBERS.map((v) => VARIANTS[v].scale)).size).toBe(5);
  });

  it("uses the same scale and tilt for the three types, so the size order holds at every Variant", () => {
    for (const v of NUMBERS) {
      const { scale, tilt } = VARIANTS[v];
      const widths = TYPES.map((type) => {
        const root = ghostArt(type, v, "haunted");
        expect(root.transform?.scale ?? 1).toBe(scale);
        expect(root.transform?.rotate ?? 0).toBe(tilt);
        return GHOST_BOX[type].w * (root.transform?.scale ?? 1);
      });
      expect(widths[0]).toBeLessThan(widths[1] ?? 0);
      expect(widths[1]).toBeLessThan(widths[2] ?? 0);
      expect(GHOST_BOX.wisp.h * scale).toBeLessThan(
        GHOST_BOX["lantern-wraith"].h * scale,
      );
    }
  });

  it("keeps the centre of the box where it is, so a Variant never moves the ghost", () => {
    for (const type of TYPES) {
      for (const v of NUMBERS) {
        const t = ghostArt(type, v, "haunted").transform;
        const { scale, tilt } = VARIANTS[v];
        const [tx, ty] = t?.translate ?? [0, 0];
        const { w, h } = GHOST_BOX[type];
        const a = (tilt * Math.PI) / 180;
        const [px, py] = [w / 2, h / 2];
        expect(tx + scale * (Math.cos(a) * px - Math.sin(a) * py)).toBeCloseTo(
          px,
          1,
        );
        expect(ty + scale * (Math.sin(a) * px + Math.cos(a) * py)).toBeCloseTo(
          py,
          1,
        );
      }
    }
  });

  it("keeps the eyes small at every Variant: two eyes, each under 5 % of the box height", () => {
    for (const type of TYPES) {
      for (const v of NUMBERS) {
        const eyes = eyesOf(ghostArt(type, v, "haunted"));
        expect(eyes).toHaveLength(2);
        for (const eye of eyes) {
          expect((2 * (eye.ry ?? 0)) / GHOST_BOX[type].h).toBeLessThan(0.05);
        }
      }
    }
  });

  it("keeps each type's own part at every Variant: the lantern, or the shackles and chain, or neither", () => {
    for (const v of NUMBERS) {
      const own = ["lantern", "shackles", "chain"];
      expect(
        partsOf(ghostArt("wisp", v, "haunted")).filter((p) => own.includes(p)),
      ).toEqual([]);
      const wraith = partsOf(ghostArt("lantern-wraith", v, "haunted"));
      expect(wraith).toContain("lantern");
      expect(wraith).not.toContain("shackles");
      const brute = partsOf(ghostArt("chained-brute", v, "haunted"));
      expect(brute).toEqual(expect.arrayContaining(["shackles", "chain"]));
      expect(brute).not.toContain("lantern");
    }
  });

  it("draws the Locked look with a glow and with the look-locked class", () => {
    for (const type of TYPES) {
      const tree = ghostArt(type, 2, "locked");
      expect(tree.cls).toContain("look-locked");
      expect(partsOf(tree)).toContain("glow");
    }
  });
});

describe("slots and chained doors (Requirements 3.5, 6.1, 8.6)", () => {
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

  it("draws no window in any slot (director's decision, 18 Nov)", () => {
    for (const slot of allSlots) {
      const names = nodesOf(slotArt(slot)).flatMap((n) => [
        ...(n.cls?.split(" ") ?? []),
        n.part ?? "",
      ]);
      expect(names.filter((name) => /pane|window|sill/.test(name))).toEqual([]);
    }
  });

  it("a Haunted slot draws its ghost with its glow; a Locked slot draws it with its glow, still, in a Cloche; an Exorcised slot draws no ghost", () => {
    for (const slot of allSlots) {
      const tree = slotArt(slot);
      const parts = nodesOf(tree).map((n) => n.part);
      expect(parts.includes("glow")).toBe(slot.state !== "exorcised");
      for (const type of ["wisp", "lantern-wraith", "chained-brute"]) {
        expect(classesOf(tree).includes(`ghost--${type}`)).toBe(
          slot.state !== "exorcised" && type === GHOST_TYPE_OF[slot.floor],
        );
      }
      if (slot.state === "haunted") {
        const holder = nodesOf(tree).find((n) =>
          n.cls?.startsWith("slot-ghost "),
        );
        expect(holder?.cls).toContain(`ghost-phase-${slot.index % 4}`);
        expect(holder?.transform?.scale).toBeCloseTo(slot.ghostScale, 2);
      }
    }
  });

  it("each slot draws the Variant of its Card, in the look of its state", () => {
    for (const slot of allSlots.filter((s) => s.state !== "exorcised")) {
      const look = slot.state === "haunted" ? "haunted" : "locked";
      const ghost = nodesOf(slotArt(slot)).find((n) =>
        n.cls?.startsWith("ghost "),
      );
      expect(ghost, slot.key).toEqual(
        ghostArt(slot.ghostType, slot.variant, look),
      );
    }
  });

  it("puts every Locked ghost in the same Cloche up to scale, with its padlock, and the whole drawing inside the slot", () => {
    const locked = allSlots.filter((s) => s.state === "locked");
    const clocheOf = (slot: SlotPlacement): string =>
      JSON.stringify(nodesOf(slotArt(slot)).find((n) => n.part === "cloche"));
    for (const slot of locked) {
      const tree = slotArt(slot);
      expect(clocheOf(slot)).toBe(clocheOf(locked[0] as SlotPlacement));
      expect(nodesOf(tree).filter((n) => n.part === "padlock")).toHaveLength(1);
      const group = nodesOf(tree).find((n) => n.cls === "slot-locked");
      const [x = 0, y = 0] = group?.transform?.translate ?? [];
      const c = group?.transform?.scale ?? 1;
      const { x1, y1, x2, y2 } = CLOCHE_EXTENT;
      const label = `${slot.key} of ${slot.rect.w}`;
      expect(x + x1 * c, label).toBeGreaterThanOrEqual(slot.rect.x - 0.05);
      expect(x + x2 * c, label).toBeLessThanOrEqual(
        slot.rect.x + slot.rect.w + 0.05,
      );
      expect(y + y1 * c, label).toBeGreaterThanOrEqual(slot.rect.y - 0.05);
      expect(y + y2 * c, label).toBeLessThanOrEqual(
        slot.rect.y + slot.rect.h + 0.05,
      );
    }
  });

  it("draws an Exorcised slot as a lit candle on the slot bottom with a pool of light, and no ghost", () => {
    for (const slot of allSlots.filter((s) => s.state === "exorcised")) {
      const tree = slotArt(slot);
      const parts = nodesOf(tree).map((n) => n.part);
      expect(parts).toEqual(
        expect.arrayContaining(["candle", "flame", "candle-light"]),
      );
      expect(classesOf(tree).filter((c) => /^ghost/.test(c))).toEqual([]);
      const group = nodesOf(tree).find((n) => n.cls === "slot-exorcised");
      const [x = 0, y = 0] = group?.transform?.translate ?? [];
      const s = group?.transform?.scale ?? 1;
      const { x1, y1, x2, y2 } = CANDLE_EXTENT;
      // The candle stands on the slot bottom, inside the slot, up to half its height.
      expect(y + y2 * s).toBeCloseTo(slot.rect.y + slot.rect.h, 1);
      expect(x + x1 * s).toBeGreaterThanOrEqual(slot.rect.x);
      expect(x + x2 * s).toBeLessThanOrEqual(slot.rect.x + slot.rect.w);
      expect((y2 - y1) * s).toBeLessThanOrEqual(slot.rect.h / 2 + 0.01);
      expect((y2 - y1) * s).toBeGreaterThan(slot.rect.h / 4);
    }
  });

  it("draws all 3 types at all 5 Variants in all 3 states within the Shape_Data rules", () => {
    for (const floor of FLOORS) {
      for (const state of STATES) {
        for (let index = 0; index < 5; index += 1) {
          expect(
            shapeProblems(slotArt(slotOf(floor, state, index, 5))),
          ).toEqual([]);
        }
      }
    }
  });
  it("every ghost box lies inside its slot, so no ghost pokes through a roof or floor line", () => {
    for (const slot of allSlots.filter((s) => s.state === "haunted")) {
      const holder = nodesOf(slotArt(slot)).find((n) =>
        n.cls?.startsWith("slot-ghost "),
      );
      const [x = 0, y = 0] = holder?.transform?.translate ?? [];
      const k = holder?.transform?.scale ?? 1;
      const { box } = GHOST_TYPES[slot.ghostType];
      const label = `${slot.key} of ${slot.rect.w}`;
      expect(x, label).toBeGreaterThanOrEqual(slot.rect.x - 0.01);
      expect(x + box.w * k, label).toBeLessThanOrEqual(
        slot.rect.x + slot.rect.w + 0.01,
      );
      expect(y, label).toBeGreaterThanOrEqual(slot.rect.y);
      expect(y + box.h * k, label).toBeLessThanOrEqual(
        slot.rect.y + slot.rect.h,
      );
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
      const room = FLOOR_RECT[floor];
      const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = (panel && boxOf(panel)) ?? {};
      expect(x1).toBeGreaterThanOrEqual(band.x);
      expect(x2).toBeLessThanOrEqual(band.x + band.w);
      expect(y1).toBeGreaterThanOrEqual(room.y);
      expect(y2).toBeLessThanOrEqual(room.y + room.h);
      // Dark iron with no light outline: no rim stroke on the door.
      expect(classesOf(door)).not.toContain("rim");
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
  const FLOORS = ["attic", "middle floor", "basement"] as const;
  const panelBox = (floor: Floor): Box => {
    const panel = nodesOf(chainedDoorArt(floor)).find(
      (n) => n.cls === "door-panel",
    );
    const box = panel === undefined ? null : boxOf(panel);
    if (box === null) throw new Error(`no door panel on ${floor}`);
    return box;
  };

  it("every chained door is arched, stands on its floor inside a surround, over a threshold", () => {
    for (const floor of FLOORS) {
      const door = nodesOf(chainedDoorArt(floor));
      const panel = door.find((n) => n.cls === "door-panel");
      const sill = door.find((n) => n.cls === "door-threshold");
      expect(panelBox(floor).y2).toBe(FLOOR_LINE[floor]);
      expect((sill?.y ?? 0) + (sill?.height ?? 0)).toBe(FLOOR_LINE[floor]);
      expect(panel?.d).toContain("Q"); // rounded shoulders: an arched top
      const frame = door.find((n) => n.cls === "door-frame");
      const outer = frame === undefined ? null : boxOf(frame);
      expect(outer?.x1 ?? 0).toBeLessThan(panelBox(floor).x1);
      expect(outer?.x2 ?? 0).toBeGreaterThan(panelBox(floor).x2);
      expect(outer?.y1 ?? 0).toBeLessThan(panelBox(floor).y1);
    }
  });

  it("the basement door has the size and place of the painted cellar door, so it shows no painted door around it", () => {
    // The painted door spans x 693 to 773, from the arch top at y 739 to its foot at y 849.
    const box = panelBox("basement");
    expect(box.x1).toBeLessThanOrEqual(693);
    expect(box.x1).toBeGreaterThanOrEqual(690);
    expect(box.x2).toBeGreaterThanOrEqual(773);
    expect(box.x2).toBeLessThanOrEqual(776);
    expect(box.y1).toBe(737);
    expect(box.y2).toBeGreaterThanOrEqual(849);
    expect(box.y2).toBeLessThanOrEqual(852);
    // Same centre as the painted door (x 733).
    expect((box.x1 + box.x2) / 2).toBe(733);
    // The painted padlock (near 733, 795) is under the door.
    const panel = nodesOf(chainedDoorArt("basement")).find(
      (n) => n.cls === "door-panel",
    );
    expect(winding(panel?.d ?? "", [733, 795])).not.toBe(0);
  });

  it("the basement surround covers the chain ends the painted door sticks out at both sides", () => {
    const frame = nodesOf(chainedDoorArt("basement")).find(
      (n) => n.cls === "door-frame",
    );
    // Tips of the painted chains, measured on the illustration.
    const tips: [number, number][] = [
      [681, 757],
      [686, 765],
      [785, 759],
      [780, 766],
      [682, 832],
      [688, 835],
      [786, 833],
      [781, 836],
    ];
    for (const tip of tips) {
      expect(winding(frame?.d ?? "", tip), `${tip}`).not.toBe(0);
    }
  });

  it("draws no chain piece outside its door, and every link is dark iron with a faint inner glint", () => {
    for (const floor of FLOORS) {
      const door = nodesOf(chainedDoorArt(floor));
      const box = panelBox(floor);
      const links = door.filter((n) => n.cls === "door-chain-link");
      const glints = door.filter((n) => n.cls === "door-chain-glint");
      expect(links.length).toBeGreaterThan(0);
      // No link at the crossing of the two chains (the centre of the door).
      const mid = (box.x1 + box.x2) / 2;
      for (const link of links) {
        expect(
          Math.abs((link.transform?.translate?.[0] ?? 0) - mid),
        ).toBeGreaterThan(2);
      }
      expect(glints).toHaveLength(links.length);
      for (const link of links) {
        const [x = 0, y = 0] = link.transform?.translate ?? [];
        // A link lies on a diagonal; its longest reach is its half length.
        expect(x - (link.rx ?? 0), `${floor}`).toBeGreaterThanOrEqual(box.x1);
        expect(x + (link.rx ?? 0), `${floor}`).toBeLessThanOrEqual(box.x2);
        expect(y - (link.rx ?? 0), `${floor}`).toBeGreaterThanOrEqual(box.y1);
        expect(y + (link.rx ?? 0), `${floor}`).toBeLessThanOrEqual(box.y2);
      }
      for (const glint of glints) {
        const link = links[glints.indexOf(glint)];
        expect(glint.rx ?? 0).toBeLessThan(link?.rx ?? 0);
        expect(glint.ry ?? 0).toBeLessThan(link?.ry ?? 0);
        expect(glint.transform).toEqual(link?.transform);
      }
      expect(door.flatMap((n) => n.cls?.split(" ") ?? [])).not.toContain("rim");
    }
    const css = readFileSync(
      new URL("../styles/ghosts.css", import.meta.url),
      "utf8",
    );
    const rule = (name: string): string =>
      new RegExp(`\\.chained-door \\.${name}\\s*{([^}]*)}`).exec(css)?.[1] ??
      "";
    expect(rule("door-chain-link")).toMatch(/stroke:\s*var\(--sc-iron\)/);
    expect(rule("door-chain-glint")).toMatch(/stroke:\s*var\(--sc-mist\)/);
    expect(
      Number(/opacity:\s*([\d.]+)/.exec(rule("door-chain-glint"))?.[1]),
    ).toBeLessThanOrEqual(0.25);
    for (const name of ["door-frame", "door-threshold", "door-hook"]) {
      expect(rule(name)).toMatch(/var\(--sc-iron-dark\)/);
    }
  });
});

describe("Bestiary art and Ghost_Icons (Requirements 4.4, 5.12, 7.1, 7.4)", () => {
  const TYPES = ["wisp", "lantern-wraith", "chained-brute"] as const;

  it("the Bestiary art is Variant 0 in the Haunted look for any input", () => {
    for (const type of TYPES) {
      const tree = bestiaryArt(type);
      expect(tree).toEqual(ghostArt(type, 0, "haunted"));
      expect(tree.cls).toContain("look-haunted");
      expect(tree.cls).not.toContain("look-locked");
      expect(tree.transform).toBeUndefined();
      expect(shapeProblems(tree)).toEqual([]);
    }
  });

  it("an exorcised icon is a flame and a haunted icon is a Wisp head", () => {
    const flame = nodesOf(ghostIconArt("exorcised"));
    const wisp = nodesOf(ghostIconArt("haunted"));
    expect(flame.map((n) => n.part)).toContain("icon-flame");
    expect(flame.some((n) => n.part === "icon-wisp")).toBe(false);
    expect(wisp.map((n) => n.part)).toContain("icon-wisp");
    expect(wisp.some((n) => n.part === "icon-flame")).toBe(false);
  });

  it("both icons pass the Shape_Data rules and stay inside their box", () => {
    for (const state of ["haunted", "exorcised"] as const) {
      const tree = ghostIconArt(state);
      expect(shapeProblems(tree), state).toEqual([]);
      for (const node of nodesOf(tree)) {
        for (const n of [node.d?.match(/-?\d+(?:\.\d+)?/g) ?? []].flat()) {
          expect(Number(n)).toBeGreaterThanOrEqual(0);
          expect(Number(n)).toBeLessThanOrEqual(ICON_BOX);
        }
        if (node.kind === "circle") {
          expect((node.cx ?? 0) + (node.r ?? 0)).toBeLessThanOrEqual(ICON_BOX);
        }
      }
    }
  });
});

describe("Ring effects over the painted telephone (Requirements 9.1, 22.1)", () => {
  const tree = ringEffectsArt();
  const nodes = nodesOf(tree);
  const arcs = nodes.filter((n) => n.cls?.startsWith("phone-line "));
  const glow = nodes.find((n) => n.part === "phone-glow");
  it("passes the Shape_Data rules", () => {
    expect(shapeProblems(tree)).toEqual([]);
  });
  it("has the phone-lines and phone-glow parts and no telephone of its own", () => {
    const parts = nodes.map((n) => n.part);
    expect(parts).toContain("phone-lines");
    expect(parts).toContain("phone-glow");
    const names = nodes.map((n) => `${n.cls ?? ""} ${n.part ?? ""}`).join(" ");
    expect(names).not.toMatch(/handset|base|logo|text/);
  });
  it("draws three arcs on each side, at radius 26, 35 and 44", () => {
    expect(arcs).toHaveLength(6);
    const radii = arcs.map((n) => Number(/A(\d+) /.exec(n.d ?? "")?.[1]));
    expect(radii.slice(0, 3)).toEqual([...RING_ARC_RADII]);
    expect(radii.slice(3)).toEqual([...RING_ARC_RADII]);
    expect([...RING_ARC_RADII]).toEqual([26, 35, 44]);
  });
  it("is centred on the telephone anchor, with a glow of radius about 60", () => {
    expect(RING_CENTRE.x).toBe(TELEPHONE_ANCHOR.x);
    expect(Math.abs(RING_CENTRE.y - TELEPHONE_ANCHOR.y)).toBeLessThanOrEqual(
      10,
    );
    expect(glow?.cx).toBe(RING_CENTRE.x);
    expect(glow?.cy).toBe(RING_CENTRE.y);
    expect(glow?.r).toBe(RING_GLOW_RADIUS);
    expect(RING_GLOW_RADIUS).toBeGreaterThanOrEqual(55);
    expect(RING_GLOW_RADIUS).toBeLessThanOrEqual(65);
    // The arcs mirror each other about the anchor's vertical line.
    const ends = (n: ShapeNode): number[] =>
      /^M([\d.]+) ([\d.]+) A\d+ \d+ 0 0 [01] ([\d.]+) ([\d.]+)$/
        .exec(n.d ?? "")
        ?.slice(1)
        .map(Number) ?? [];
    for (let i = 0; i < 3; i += 1) {
      const left = ends(arcs[i] as ShapeNode);
      const right = ends(arcs[i + 3] as ShapeNode);
      expect(left).toHaveLength(4);
      expect((left[0] ?? 0) + (right[0] ?? 0)).toBeCloseTo(
        2 * TELEPHONE_ANCHOR.x,
        1,
      );
      expect(left[1]).toBe(right[1]);
      expect(left[3]).toBe(right[3]);
    }
  });
  it("keeps the glow and every arc inside the middle floor rectangle", () => {
    const room = FLOOR_RECT["middle floor"];
    const inRoom = (x1: number, y1: number, x2: number, y2: number): void => {
      expect(x1).toBeGreaterThanOrEqual(room.x);
      expect(y1).toBeGreaterThanOrEqual(room.y);
      expect(x2).toBeLessThanOrEqual(room.x + room.w);
      expect(y2).toBeLessThanOrEqual(room.y + room.h);
    };
    const { x, y } = RING_CENTRE;
    inRoom(
      x - RING_GLOW_RADIUS,
      y - RING_GLOW_RADIUS,
      x + RING_GLOW_RADIUS,
      y + RING_GLOW_RADIUS,
    );
    // An arc lies on the circle of its radius, so that circle's box bounds it.
    for (const arc of arcs) {
      const r = Number(/A(\d+) /.exec(arc.d ?? "")?.[1]);
      inRoom(x - r, y - r, x + r, y + r);
    }
  });
});

describe("the Answer_Button icon (director's decision, 19 Nov)", () => {
  const tree = phoneIconArt();
  it("is a handset, a base and a dial that pass the Shape_Data rules", () => {
    expect(shapeProblems(tree)).toEqual([]);
    expect(nodesOf(tree).map((n) => n.cls)).toEqual(
      expect.arrayContaining([
        "icon-phone-handset",
        "icon-phone-base",
        "icon-phone-dial",
      ]),
    );
  });
  it("stays inside its box", () => {
    for (const [x, y] of pointsOf(tree)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ICON_BOX);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(ICON_BOX);
    }
  });
});

describe("the exorcism room (Requirements 10.1, 10.8, 22.1)", () => {
  const withPicture = roomArt("/haunted-repo/assets/room-scene.svg");
  const fallback = roomArt(null);

  it("passes the Shape_Data rules, with the picture and with the fallback", () => {
    expect(shapeProblems(withPicture)).toEqual([]);
    expect(shapeProblems(fallback)).toEqual([]);
  });

  it("draws exactly three Question_Candles, each with a flame-wrap", () => {
    for (const tree of [withPicture, fallback]) {
      const candles = nodesOf(tree).filter((n) => n.cls === "qcandle");
      expect(candles).toHaveLength(3);
      expect(CANDLE_X).toHaveLength(3);
      for (const candle of candles) {
        expect(classesOf(candle)).toContain("flame-wrap");
      }
    }
  });

  it("has the cold and warm lights, twelve sparks and the smoke question mark", () => {
    const names = classesOf(withPicture);
    expect(names).toContain("room-light-cold");
    expect(names).toContain("room-light-warm");
    expect(names.filter((n) => n === "spark")).toHaveLength(12);
    expect(names).toContain("smoke-q");
  });

  it("shows the picture as one image the size of the room, or a plain rectangle", () => {
    const images = nodesOf(withPicture).filter((n) => n.kind === "image");
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ width: ROOM_BOX.w, height: ROOM_BOX.h });
    expect(nodesOf(fallback).some((n) => n.kind === "image")).toBe(false);
    expect(classesOf(fallback)).toContain("room-fallback");
  });

  it("clips the window rain to the glass and repeats it by one rain step", () => {
    const wrap = nodesOf(withPicture).find((n) => n.cls === "room-rain-wrap");
    expect(wrap?.clip).toBe("room-glass");
    expect(roomRainPath()).toMatch(/^M/);
    expect(RAIN_STEP).toEqual([-80, 200]);
  });
});
