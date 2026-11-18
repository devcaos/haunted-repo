import { GHOST_BOX } from "../model/sceneLayout.js";
import {
  circle,
  defs,
  ellipse,
  g,
  gradient,
  path,
  strokePath,
  type ShapeNode,
} from "./shapes.js";

/** Local y of the floor shadow: the Wisp floats 8 units above it. */
export const WISP_SHADOW_Y = 96;

/** What every drawing of one Ghost_Type shares. */
export interface GhostTypeSpec {
  /** Natural size at Variant 0, in viewBox units (the Scene_Layout box). */
  box: { w: number; h: number };
  /** Height of one eye, for the eye share of Requirement 5.6. */
  eyeHeight: number;
  /** Name of the idle `@keyframes` in motion.css. */
  idle: string;
}

/**
 * The Ghost_Types drawn so far. Only the Wisp exists until task 9.1 adds the
 * Lantern_Wraith and the Chained_Brute.
 */
export const GHOST_TYPES: Readonly<Record<"wisp", GhostTypeSpec>> = {
  wisp: { box: GHOST_BOX.wisp, eyeHeight: 4, idle: "wisp-float" },
};

// The Wisp, Variant 0, in local units: box 56 x 88, origin top left. A tall
// gothic spectre (director's art review, 18 Nov): a narrow head, sleeves that
// sweep out, and a ragged tail of four Bezier tatters. No mouth, no horns.
const WISP_OUTLINE =
  "M28 0 C36 1 42 9 42 21 C42 29 49 34 56 42 C50 42 48 48 48 54 C48 62 46 68 44 72 " +
  "Q44 80 46 86 Q40 80 38 76 Q37 84 34 88 Q30 80 27 76 Q25 82 22 84 Q19 77 17 72 " +
  "Q13 76 10 78 Q12 70 10 62 C8 54 2 48 0 40 C6 40 12 34 14 26 C14 10 20 1 28 0 Z";
/** Two cloth folds running down the body. */
const WISP_FOLDS = "M24 34 C22 48 24 60 21 74 M34 36 C36 50 34 62 37 76";
const WISP_RIM = "M30 1 C37 2 42 10 42 21 C42 29 49 34 55 41";
/** A torn cobweb on the left sleeve: three threads from (9, 30) and one arc. */
const WISP_COBWEB = "M9 30 L1 40 M9 30 L4 44 M9 30 L13 42 M3 37 Q8 38 12 38";
/** The eyes: small slanted sockets, each with a glowing core. */
const WISP_EYES: readonly (readonly [number, number, number])[] = [
  [22, 19, 14],
  [34, 19, -14],
];

/**
 * The drawing of one ghost. Until task 9.1 only the Wisp, Variant 0, in the
 * Haunted look exists, so the types accept only those values.
 *
 * Structure (design "Art System"): `g.ghost` > static glow and floor shadow,
 * then `g.ghost-idle`, the only part the idle animation moves.
 */
export function ghostArt(type: "wisp", variant: 0, look: "haunted"): ShapeNode {
  const id = (name: string): string => `${type}-${variant}-${name}`;
  const eyes = WISP_EYES.flatMap(([cx, cy, tilt]) => [
    circle("ghost-eye-glow", cx, cy, 5, { paint: id("eye") }),
    ellipse("ghost-eye", 0, 0, 3.6, 2, {
      part: "eye",
      transform: { translate: [cx, cy], rotate: tilt },
    }),
    circle("ghost-pupil", cx, cy, 0.8),
  ]);
  return g(`ghost ghost--${type} look-${look}`, [
    defs([
      gradient("radialGradient", id("glow"), [
        ["stop-cold-0", 0],
        ["stop-cold-1", 1],
      ]),
      gradient("radialGradient", id("eye"), [
        ["stop-eye-0", 0],
        ["stop-eye-1", 1],
      ]),
      // Cold white at the head, fading to nothing at the tail.
      gradient(
        "linearGradient",
        id("body"),
        [
          ["stop-spectre-0", 0],
          ["stop-spectre-1", 0.5],
          ["stop-spectre-2", 1],
        ],
        { x1: 0, y1: 0, x2: 0, y2: 1 },
      ),
    ]),
    g("ghost-glow", [ellipse("glow", 28, 40, 46, 58, { paint: id("glow") })], {
      part: "glow",
    }),
    ellipse("ghost-shadow", 28, WISP_SHADOW_Y, 16, 3),
    g("ghost-idle", [
      g(
        "ghost-outline",
        [
          path("ghost-body", WISP_OUTLINE, {
            part: "tail-ragged",
            paint: id("body"),
          }),
        ],
        { part: "outline" },
      ),
      strokePath("ghost-fold", WISP_FOLDS),
      ...eyes,
      strokePath("ghost-cobweb", WISP_COBWEB, { part: "cobweb" }),
      strokePath("ghost-rim", WISP_RIM),
    ]),
  ]);
}
