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
  wisp: { box: GHOST_BOX.wisp, eyeHeight: 11, idle: "wisp-bob" },
};

// The Wisp, Variant 0, in local units: box 60 x 64, origin top left (design
// "The Wisp, Variant 0"). A round dome, straight sides and a hem of five small
// scallops: no tail and no horns.
const WISP_OUTLINE =
  "M30 0 C47 0 60 13 60 31 L60 54 Q55 64 50 56 Q45 64 40 56 Q35 64 30 56 Q25 64 20 56 Q15 64 10 56 Q5 64 0 54 L0 31 C0 13 13 0 30 0 Z";
const WISP_SHADE = "M4 34 C6 48 14 54 24 55 Q14 58 8 54 Q2 48 2 36 Z";
const WISP_RIM = "M34 1 C49 3 59 15 59.5 31 L59.5 38";
/**
 * Cobweb on the top left of the head, centred on (6, 4): three radial threads,
 * two arcs at radius 6 and 11 across them, and one thread hanging down.
 */
const WISP_COBWEB =
  "M6 4 L0 18 M6 4 L16 12 M6 4 L14 0 " +
  "M3.6 9.5 A6 6 0 0 0 10.7 7.8 A6 6 0 0 0 11.4 1.3 " +
  "M1.7 14.1 A11 11 0 0 0 14.6 10.9 A11 11 0 0 0 15.8 -0.9 " +
  "M0 18 L-4 26";
const WISP_EYES: readonly (readonly [number, number])[] = [
  [21, 27],
  [39, 27],
];

/**
 * The drawing of one ghost. Until task 9.1 only the Wisp, Variant 0, in the
 * Haunted look exists, so the types accept only those values.
 *
 * Structure (design "Art System"): `g.ghost` > static glow and floor shadow,
 * then `g.ghost-idle`, the only part the idle animation moves.
 */
export function ghostArt(type: "wisp", variant: 0, look: "haunted"): ShapeNode {
  const glowId = `${type}-${variant}-glow`;
  const eyes = WISP_EYES.flatMap(([cx, cy]) => [
    ellipse("ghost-eye", cx, cy, 5, 5.5, { part: "eye" }),
    circle("ghost-glint", cx + 1.8, cy - 2.2, 1.6),
  ]);
  return g(`ghost ghost--${type} look-${look}`, [
    defs([
      gradient("radialGradient", glowId, [
        ["stop-cold-0", 0],
        ["stop-cold-1", 1],
      ]),
    ]),
    g("ghost-glow", [circle("glow", 30, 34, 52, { paint: glowId })], {
      part: "glow",
    }),
    ellipse("ghost-shadow", 30, 72, 20, 4),
    g("ghost-idle", [
      g(
        "ghost-outline",
        [path("ghost-body", WISP_OUTLINE, { part: "hem-round" })],
        {
          part: "outline",
        },
      ),
      path("ghost-shade", WISP_SHADE),
      ...eyes,
      ellipse("ghost-mouth", 30, 40, 3, 2.5),
      strokePath("ghost-cobweb", WISP_COBWEB, { part: "cobweb" }),
      strokePath("ghost-rim", WISP_RIM),
    ]),
  ]);
}
