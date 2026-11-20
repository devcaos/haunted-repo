import { ellipse, g, gradient, poly, type ShapeNode } from "./shapes.js";

// The earth that the Gate_Panel breaks as it rises (director's decision,
// 19 Nov: particles only, no strip of earth and no cracks). Every number is
// in gate units. The pieces sit on the ground line and stay hidden; the CSS
// of `gate-motion.css` throws them up once, while the gate rises.

/** The ground line of the gate, where the pieces start. */
export const GROUND_Y = 846;

/** One burst of pieces: when (CSS class), how many, how big, which paths. */
interface Burst {
  /** 0 is the rumble before the first push, 1 to 4 the pushes, 5 the landing. */
  at: number;
  pieces: number;
  minSize: number;
  maxSize: number;
  /** The `gate-fly-N` paths it may use: 0 to 3 are high, 4 to 7 are short hops. */
  paths: readonly number[];
  puffs: number;
}

// prettier-ignore
const BURSTS: readonly Burst[] = [
  { at: 0, pieces: 26, minSize: 2, maxSize: 6,  paths: [4, 5, 6, 7],       puffs: 0 },
  { at: 1, pieces: 16, minSize: 3, maxSize: 11, paths: [0, 1, 2, 3, 4, 5], puffs: 2 },
  { at: 2, pieces: 16, minSize: 3, maxSize: 11, paths: [0, 1, 2, 3, 6, 7], puffs: 2 },
  { at: 3, pieces: 16, minSize: 3, maxSize: 11, paths: [0, 1, 2, 3, 4, 6], puffs: 2 },
  { at: 4, pieces: 16, minSize: 3, maxSize: 11, paths: [0, 1, 2, 3, 5, 7], puffs: 2 },
  { at: 5, pieces: 22, minSize: 4, maxSize: 13, paths: [0, 1, 2, 3],       puffs: 4 },
];

/** Earth more often than stone: the classes that give a piece its colour. */
const COLOURS = [
  "gate-earth-1",
  "gate-earth-2",
  "gate-earth-3",
  "gate-earth-1",
  "gate-stone-1",
  "gate-stone-2",
] as const;

/** A small fixed pseudo-random sequence, so the drawing is the same on every load. */
function sequence(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
}

const round = (n: number): number => Math.round(n * 10) / 10;

/** A six-sided stone of about `size` units around (x, y). */
function stone(
  x: number,
  y: number,
  size: number,
  next: () => number,
): number[] {
  const points: number[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3 + (next() - 0.5) * 0.6;
    const radius = (size / 2) * (0.65 + next() * 0.35);
    points.push(
      round(x + Math.cos(angle) * radius),
      round(y + Math.sin(angle) * radius),
    );
  }
  return points;
}

/**
 * The pieces of earth and stone and the dust puffs, in gate units. Each piece
 * has its colour, its path (`gate-fly-N`), its burst (`gate-burst-N`) and a
 * small lag (`gate-lag-N`) as classes; it has no `transform`, so the CSS
 * animation owns its movement.
 */
export function gateDust(): ShapeNode {
  const next = sequence(19112026);
  const pieces: ShapeNode[] = [];
  const puffs: ShapeNode[] = [];
  for (const burst of BURSTS) {
    for (let n = 0; n < burst.pieces; n++) {
      const size = round(
        burst.minSize + next() * (burst.maxSize - burst.minSize),
      );
      const x = round(20 + next() * 440);
      const path = burst.paths[n % burst.paths.length] ?? 0;
      const colour = COLOURS[Math.floor(next() * COLOURS.length)] ?? "";
      pieces.push(
        poly(
          `gate-debris ${colour} gate-fly-${path} gate-burst-${burst.at} gate-lag-${n % 4}`,
          stone(x, GROUND_Y, size, next),
        ),
      );
    }
    for (let n = 0; n < burst.puffs; n++) {
      puffs.push(
        ellipse(
          `gate-dust-puff gate-burst-${burst.at} gate-lag-${n % 4}`,
          round(40 + next() * 400),
          GROUND_Y,
          round(60 + next() * 40),
          22,
          { paint: "dust-puff" },
        ),
      );
    }
  }
  return g("gate-dust", [
    gradient("radialGradient", "dust-puff", [
      ["gate-stop-dust", 0],
      ["gate-stop-dust-end", 1],
    ]),
    ...puffs,
    ...pieces,
  ]);
}
