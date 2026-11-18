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

/**
 * The house with its tower above the ground, clockwise, after the
 * illustration's own rain mask. The rain overlay is clipped outside it.
 */
// prettier-ignore
export const HOUSE_OUTLINE = [
  364, 711, 362, 511, 756, 127, 1102, 465, 1102, 284, 1178, 56, 1253, 284,
  1253, 711,
] as const;

/** Id of the clip that keeps the attic dim inside the attic. */
export const ATTIC_CLIP = "attic-inside";

/** The whole attic volume, from the ridge down to the attic floor. */
export const ATTIC_BACK = { x: 555, y: 177, w: 630, h: 333 } as const;

/** The clip path of the attic dim. */
export function atticClip(): ShapeNode {
  return {
    kind: "clipPath",
    id: ATTIC_CLIP,
    children: [
      poly("clip-shape", [555, 394, 870, 177, 1185, 394, 1185, 510, 555, 510]),
    ],
  };
}
