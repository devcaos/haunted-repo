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
import { houseOutline } from "./house.js";

// Everything here is in the house viewBox `0 0 1600 1000` (design "World
// geometry"). The top band (y < 110) holds only sky and the left column
// (x < 400) only sky and hills, so the HUD stays readable.

// Atmospheric perspective: the far hill is higher, paler and fainter than the near one.
// The rims are the crests that face the moon, cut from the same path data.
const FAR_RIM =
  "M920 590 C1080 580 1220 612 1360 600 C1460 592 1540 600 1600 612";
const NEAR_RIM = "M1460 684 C1530 681 1570 688 1600 694";
const FAR_HILLS = `M0 650 C140 610 300 596 470 618 C620 638 760 600 920 590 ${FAR_RIM.slice(9)} V1000 H0 Z`;
const NEAR_HILLS = `M0 735 C160 712 330 704 480 722 C560 732 620 744 700 748 L1000 748 C1180 730 1330 690 1460 684 ${NEAR_RIM.slice(10)} V1000 H0 Z`;
/** The moon sits behind the spire, which cuts its left edge. */
export const MOON = { cx: 1340, cy: 196, r: 56 } as const;

/** L0 to L3, back to front: sky gradient, moon and halo, far and near hills. */
export function skyLayers(): ShapeNode {
  return g("sky-layers", [
    defs([
      gradient(
        "linearGradient",
        "sky-fill",
        [
          ["stop-abyss", 0],
          ["stop-slate", 0.42],
        ],
        { x1: 0, y1: 0, x2: 0, y2: 1 },
      ),
      gradient("radialGradient", "moon-halo", [
        ["stop-halo-0", 0],
        ["stop-halo-mid", 0.3],
        ["stop-halo-1", 1],
      ]),
    ]),
    g("sky", [rect("sky-fill", 0, 0, 1600, 1000, { paint: "sky-fill" })]),
    g("moon-sky", [
      circle("moon-halo", MOON.cx, MOON.cy, 360, { paint: "moon-halo" }),
      circle("moon tone-bone", MOON.cx, MOON.cy, MOON.r, { part: "moon" }),
      ellipse("moon-shade tone-mist", MOON.cx + 14, MOON.cy - 14, 12, 9),
      ellipse("moon-shade tone-mist", MOON.cx + 22, MOON.cy + 20, 8, 6),
    ]),
    g("hills-far", [
      path("hill-far tone-mist", FAR_HILLS, { part: "hill-far" }),
      strokePath("rim rim-hill", FAR_RIM, { part: "rim-far" }),
    ]),
    g("hills-near", [
      path("hill-near tone-slate", NEAR_HILLS, { part: "hill-near" }),
      strokePath("rim rim-hill", NEAR_RIM, { part: "rim-near" }),
    ]),
  ]);
}
/**
 * Each column of streaks repeats every (-80, 200) units, the step of the
 * `rain-fall` animation (`--sc-rain-step-x`, `--sc-rain-step-y`), so one step
 * lands every streak where another was and the loop never jumps.
 */
export const RAIN_STEP = [-80, 200] as const;
/** Streaks stop a little below the ground line; the clip hides the rest. */
export const RAIN_BOTTOM = 780;
/** Columns start this far right of the scene, so the leftward drift never leaves a gap. */
const RAIN_SPAN = 1600 + 6 * -RAIN_STEP[0];
/** Columns and streak length of the far (thin, slow) and near (long, fast) rain. */
const RAIN_LAYERS = { far: [64, 12], near: [28, 26] } as const;

/** Slanted streaks along the fall direction, one path for a whole layer. */
export function rainPath(layer: keyof typeof RAIN_LAYERS): string {
  const [columns, length] = RAIN_LAYERS[layer];
  const [sx, sy] = RAIN_STEP;
  const dx = Math.round((length * sx) / sy);
  const seed = layer === "far" ? 97 : 61;
  let d = "";
  for (let i = 0; i < columns; i += 1) {
    // Evenly spread over the span, with a small jitter so they do not line up.
    let x = Math.round((i * RAIN_SPAN) / columns) + ((i * 7) % 13) + 6;
    let y = ((i * seed) % sy) - sy;
    for (; y < RAIN_BOTTOM; x += sx, y += sy) d += `M${x} ${y}l${dx} ${length}`;
  }
  return d;
}

/** Sky outside the house and above the ground: the outer box clockwise, each outline counter-clockwise. */
function rainClip(): string {
  const hole = (pts: number[]): string => {
    const pairs: string[] = [];
    for (let i = pts.length - 2; i >= 0; i -= 2)
      pairs.push(`${pts[i]} ${pts[i + 1]}`);
    return `M${pairs.join(" L")} Z`;
  };
  return `M0 0 H1600 V760 H0 Z ${houseOutline().map(hole).join(" ")}`;
}

/** Rain: `rain-wrap` holds the clip and stays still, each `rain` layer moves. */
export function weatherLayer(): ShapeNode {
  const layer = (name: keyof typeof RAIN_LAYERS): ShapeNode =>
    g(`rain rain-${name}`, [strokePath("rain-streaks", rainPath(name))]);
  return g("weather", [
    defs([
      {
        kind: "clipPath",
        id: "rain-sky",
        children: [path("clip-shape", rainClip())],
      },
      gradient("radialGradient", "fog-puff", [
        ["stop-fog-0", 0],
        ["stop-fog-1", 1],
      ]),
    ]),
    g("rain-wrap", [layer("far"), layer("near")], { clip: "rain-sky" }),
    ...fogLayer(),
  ]);
}

/** [x, y, width, height] of each soft fog puff: sky streaks, then ground mist beside the house. */
// prettier-ignore
const FOG = {
  back: [[560, 200, 230, 20], [930, 118, 240, 14], [1440, 330, 190, 22]],
  front: [[440, 742, 110, 18], [1480, 736, 150, 20]],
} as const;

/** Two drifting fog groups of soft gradient ellipses (no filter, decision Q5). */
function fogLayer(): ShapeNode[] {
  return (["back", "front"] as const).map((name) =>
    g(
      `fog fog-${name}`,
      FOG[name].map(([cx, cy, rx, ry]) =>
        ellipse("fog-puff", cx, cy, rx, ry, { paint: "fog-puff" }),
      ),
    ),
  );
}

/**
 * A limb that tapers to a sharp tip: its spine (base first) offset to both
 * sides by half a width that falls from `base` to 0. Returns the two sides.
 */
function taper(spine: readonly number[], base: number): [number[], number[]] {
  const n = spine.length / 2;
  const at = (i: number): [number, number] => [
    spine[2 * i] ?? 0,
    spine[2 * i + 1] ?? 0,
  ];
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const [x, y] = at(i);
    const [ax, ay] = at(Math.max(0, i - 1));
    const [bx, by] = at(Math.min(n - 1, i + 1));
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const half = (base * (1 - i / (n - 1))) / 2;
    const [nx, ny] = [(-(by - ay) / len) * half, ((bx - ax) / len) * half];
    left.push(Math.round(x - nx), Math.round(y - ny));
    right.push(Math.round(x + nx), Math.round(y + ny));
  }
  return [left, right];
}

/** Open path data through flat x, y pairs. */
function polyline(pts: readonly number[]): string {
  const pairs: string[] = [];
  for (let i = 0; i + 1 < pts.length; i += 2)
    pairs.push(`${pts[i]} ${pts[i + 1]}`);
  return `M${pairs.join(" L")}`;
}

/** Closes the two sides of a limb into one polygon. */
function limb(sides: [number[], number[]]): number[] {
  const [left, right] = sides;
  const back: number[] = [];
  for (let i = right.length - 2; i >= 0; i -= 2)
    back.push(right[i] ?? 0, right[i + 1] ?? 0);
  return [...left, ...back];
}

/** Trunk, then branches and twigs of the dead tree: [spine, base width]. */
// prettier-ignore
const TREE: readonly (readonly [number[], number])[] = [
  [[1478, 1000, 1470, 900, 1484, 800, 1462, 700, 1474, 610, 1452, 520, 1458, 430], 48],
  [[1462, 650, 1420, 612, 1404, 560, 1368, 520], 18],
  [[1474, 700, 1518, 664, 1544, 610, 1590, 584], 20],
  [[1454, 540, 1494, 500, 1506, 448], 13],
  [[1410, 598, 1384, 604, 1356, 594], 8],
  [[1530, 650, 1564, 646, 1596, 628], 9],
  [[1456, 470, 1432, 432, 1440, 396], 10],
  [[1544, 612, 1556, 570, 1580, 552], 7],
];

/** Spear-tipped iron pickets left of the house: [x, tip y]. */
const PICKETS = [404, 421, 438, 455, 472, 489, 506, 523, 540].map(
  (x, i) => [x, 722 + (i % 3) * 7] as const,
);

/** L5, near black: iron fence tips on the left, the twisted dead tree on the right, with a faint moon rim. */
export function foregroundLayer(): ShapeNode {
  const limbs = TREE.map(([spine, base]) => taper(spine, base));
  const [trunkLeft] = limbs[0] ?? [[]];
  return g("foreground", [
    g("fence tone-abyss", [
      ...PICKETS.map(([x, t]) =>
        poly("picket", [
          x,
          1000,
          x,
          t + 14,
          x - 4,
          t + 14,
          x + 2,
          t,
          x + 8,
          t + 14,
          x + 4,
          t + 14,
          x + 4,
          1000,
        ]),
      ),
      rect("rail", 398, 752, 152, 5),
      rect("rail", 398, 800, 152, 5),
    ]),
    g(
      "dead-tree tone-abyss",
      limbs.map((sides) => poly("limb", limb(sides))),
      { part: "dead-tree" },
    ),
    g("rim-fg", [
      strokePath(
        "rim",
        PICKETS.map(([x, t]) => `M${x + 2} ${t} L${x + 8} ${t + 14}`).join(" "),
      ),
      // Only above the ground line (spine points 3 to 6), where the moon reaches.
      strokePath("rim", polyline(trunkLeft.slice(6, 14))),
    ]),
  ]);
}
