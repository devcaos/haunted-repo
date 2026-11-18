import { image, poly, rect, type ShapeNode } from "./shapes.js";

/**
 * The scene illustration as one `<image>` over the whole viewBox (same 1.6
 * ratio, so nothing is stretched), or a plain token-colour rectangle when
 * the `scene.house` slot falls back. `href` is the built URL of the local
 * asset; `mountShape` sets it only when it is a same-site path, and the
 * browser shows the file as a picture, so no markup is parsed.
 */
export function sceneBackdrop(href: string | null): ShapeNode {
  return href === null
    ? rect("scene-fallback", 0, 0, 1600, 1000)
    : image("scene-art", href, 0, 0, 1600, 1000);
}

// Geometry of the scene illustration (`assets/files/house-scene.svg`, drafted
// with Claude and declared, director's decision of 18 Nov). The picture is
// drawn in `0 0 1440 900`; every number here is in the house viewBox
// `0 0 1600 1000`, that is asset units x 10/9. The picture itself is never
// rebuilt in code: these numbers only place what the page draws over it.

/** The ground line of the illustration: the rain stops here. */
export const GROUND_Y = 711;

/** The house of the illustration, clockwise: left foot, ridge, right foot, bottom right, bottom left. */
// prettier-ignore
export const HOUSE_POLYGON = [362, 511, 756, 127, 1149, 511, 1144, 711, 367, 711] as const;

/** The tower of the illustration, clockwise: bottom left, top left, spire tip, top right, bottom right. */
// prettier-ignore
export const TOWER_POLYGON = [1102, 711, 1102, 284, 1178, 56, 1253, 284, 1253, 711] as const;

/**
 * The outline of the house and the tower together (their union), clockwise.
 * The rain clip cuts this one outline out of the sky. The two polygons
 * overlap, and a clip hole must not overlap another one (the nonzero rule
 * would let rain back in), so the clip takes the union: the right roof slope
 * meets the tower's left side at (1102, 465.06).
 */
// prettier-ignore
export const HOUSE_OUTLINE = [
  367, 711, 362, 511, 756, 127, 1102, 465.06, 1102, 284, 1178, 56, 1253, 284,
  1253, 711,
] as const;

/** The attic of the illustration: left foot, ridge, right foot. Its floor line is y 473. */
// prettier-ignore
export const ATTIC_TRIANGLE = [437, 473, 756, 173, 1074, 473] as const;

/** Id of the clip that keeps the attic dim inside the attic triangle. */
export const ATTIC_CLIP = "attic-inside";

/** The box around the attic triangle; the clip cuts its top corners. */
export const ATTIC_BACK = { x: 437, y: 173, w: 637, h: 300 } as const;

/** The clip path of the attic dim: exactly the attic triangle. */
export function atticClip(): ShapeNode {
  return {
    kind: "clipPath",
    id: ATTIC_CLIP,
    children: [poly("clip-shape", ATTIC_TRIANGLE)],
  };
}

/**
 * Where the old telephone stands in the hall of the illustration (the dial
 * on the table, left of the parlour). Task 11.1 pins the Telephone widget
 * here.
 */
export const TELEPHONE_ANCHOR = { x: 536, y: 611 } as const;

/**
 * Boxes around the pieces of the illustration that no ghost may cover,
 * whatever the number of Cards: the telephone on its table, the boiler and
 * the cellar stairs.
 */
export const ILLUSTRATION_PROPS = {
  telephone: { x: 505, y: 605, w: 62, h: 85 },
  boiler: { x: 466, y: 748, w: 82, h: 112 },
  stairs: { x: 878, y: 718, w: 189, h: 195 },
} as const;
