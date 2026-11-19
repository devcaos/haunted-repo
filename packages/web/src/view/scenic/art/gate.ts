import {
  ellipse,
  g,
  gradient,
  image,
  path,
  strokePath,
  circle,
  type ShapeNode,
} from "./shapes.js";

// The Gate_Panel: the HUD drawn as a stone gate inside the world (director's
// decision, 19 Nov). Every number is in gate units: the frame picture is
// 480 x 900 and fills the height of the screen, so one unit is 100vh / 900.
// The pictures are local files `panel-*.svg`); this file only places them
// and draws the gargoyle's eyes and the lantern's light over them.

/** The whole gate drawing, wide screens only: frame, gargoyle, lantern, pumpkin. */
export const GATE_BOX = { x: 0, y: 0, w: 640, h: 900 } as const;

/** Where each picture sits inside GATE_BOX. Heights keep each file's ratio. */
// prettier-ignore
export const GATE_PLACES = {
  frame:    { x: 0,   y: 0,   w: 480, h: 900 },
  gargoyle: { x: 132, y: -16, w: 204, h: 186.4 },
  lantern:  { x: 434, y: 300, w: 76,  h: 110 },
  pumpkin:  { x: 6,   y: 806, w: 96,  h: 97.4 },
} as const;

/** The gargoyle picture's own box (its file's viewBox). */
export const GARGOYLE_BOX = { x: 0, y: 0, w: 590, h: 539 } as const;

/** The pumpkin picture's own box (its file's viewBox). */
export const PUMPKIN_BOX = { x: 0, y: 0, w: 284, h: 288 } as const;

/** Built URLs of the four gate pictures; null when a file is missing. */
export interface GateHrefs {
  frame: string | null;
  gargoyle: string | null;
  lantern: string | null;
  pumpkin: string | null;
}

/** One eye: socket, cold rim and a white slit. `side` 1 is the left eye. */
function eye(cx: number, side: 1 | -1): ShapeNode[] {
  const o = cx - side * 17; // outer corner
  const i = cx + side * 15; // inner corner, lower: the brow frowns
  const socket =
    `M${o} 126 L${i} 139 C${i + side} 147 ${cx + side * 6} 153 ${cx - side} 152` +
    `C${cx - side * 11} 151 ${o - side * 3} 141 ${o} 126Z`;
  const rim =
    `M${i} 140 C${i + side} 147 ${cx + side * 6} 153 ${cx - side} 152` +
    `C${cx - side * 7} 151.5 ${cx - side * 11} 149 ${cx - side * 13} 145`;
  return [
    ellipse("gate-eye-brow", cx, 128, 20, 9, { paint: "eye-brow" }),
    ellipse("gate-eye-glow", cx, 140, 28, 22, { paint: "eye-glow" }),
    path("gate-eye-socket", socket, { paint: "eye-hole" }),
    strokePath("gate-eye-rim-soft", rim),
    strokePath("gate-eye-rim", rim),
    g("gate-eye-slit", [
      path(
        "gate-eye-slit-haze",
        `M${cx} 130 Q${cx + 6.5} 141.5 ${cx} 153 Q${cx - 6.5} 141.5 ${cx} 130Z`,
      ),
      path(
        "gate-eye-slit-core",
        `M${cx} 133 Q${cx + 2.6} 141.5 ${cx} 150 Q${cx - 2.6} 141.5 ${cx} 133Z`,
      ),
    ]),
  ];
}

/**
 * The gargoyle's eyes in GARGOYLE_BOX units: empty black sockets with a cold
 * rim and a white slit (idea from a Gemini image, drawn by hand in code).
 */
export function gargoyleEyes(): ShapeNode {
  return g("gate-eyes", [
    gradient("radialGradient", "eye-brow", [
      ["gate-stop-brow", 0],
      ["gate-stop-brow-end", 1],
    ]),
    gradient("radialGradient", "eye-glow", [
      ["gate-stop-glow", 0],
      ["gate-stop-glow-mid", 0.6],
      ["gate-stop-glow-end", 1],
    ]),
    gradient(
      "radialGradient",
      "eye-hole",
      [
        ["gate-stop-hole", 0],
        ["gate-stop-hole-mid", 0.8],
        ["gate-stop-hole-end", 1],
      ],
      { cx: 0.5, cy: 0.42 },
    ),
    ...eye(274, 1),
    ...eye(316, -1),
  ]);
}

/** A picture placed in its box, or nothing when its file is missing. */
function placed(
  cls: string,
  href: string | null,
  box: { x: number; y: number; w: number; h: number },
): ShapeNode[] {
  return href === null ? [] : [image(cls, href, box.x, box.y, box.w, box.h)];
}

/** The gargoyle picture with its eyes, in GARGOYLE_BOX units. */
export function gargoyleArt(href: string | null): ShapeNode {
  return g(
    "gate-gargoyle",
    href === null
      ? []
      : [
          image(
            "gate-gargoyle-art",
            href,
            0,
            0,
            GARGOYLE_BOX.w,
            GARGOYLE_BOX.h,
          ),
          gargoyleEyes(),
        ],
  );
}

/** The whole gate in GATE_BOX units (wide screens). */
export function gateArt(hrefs: GateHrefs): ShapeNode {
  const gp = GATE_PLACES.gargoyle;
  const lp = GATE_PLACES.lantern;
  return g("gate", [
    gradient("radialGradient", "lamp-halo", [
      ["gate-stop-lamp", 0],
      ["gate-stop-lamp-mid", 0.55],
      ["gate-stop-lamp-end", 1],
    ]),
    ...placed("gate-frame", hrefs.frame, GATE_PLACES.frame),
    g("gate-lamp", [
      ...(hrefs.lantern === null
        ? []
        : [
            circle("gate-lamp-halo", lp.x + 66, lp.y + 75, 130, {
              paint: "lamp-halo",
            }),
          ]),
      ...placed("gate-lantern", hrefs.lantern, lp),
    ]),
    g("gate-crown", [gargoyleArt(hrefs.gargoyle)], {
      transform: { translate: [gp.x, gp.y], scale: gp.w / GARGOYLE_BOX.w },
    }),
    ...placed("gate-pumpkin", hrefs.pumpkin, GATE_PLACES.pumpkin),
  ]);
}
