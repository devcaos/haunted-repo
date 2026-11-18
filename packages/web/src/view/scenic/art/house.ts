import type { Floor } from "@haunted-repo/core";
import { FLOOR_RECT } from "../model/sceneLayout.js";
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

// The cutaway house in the viewBox `0 0 1600 1000` (design "House composition"
// and "World geometry"). The body (x 548 to 1192) carries a symmetric gable
// whose ridge stands over the body centre; the tower stands apart on the right.

/** Outer roof outline: left eave, ridge, right eave. */
export const ROOF = [530, 394, 870, 160, 1210, 394] as const;
/** Inner roof line (the attic ceiling), parallel to the outer one, 17 units lower. */
export const ROOF_INNER = [555, 394, 870, 177, 1185, 394] as const;
/** Left and right outer faces of the body walls. */
export const BODY = { left: 548, right: 1192 } as const;
const [EAVE_L, EAVE_Y, RIDGE_X, RIDGE_Y, EAVE_R] = ROOF;
const [INNER_L, , , INNER_Y, INNER_R] = ROOF_INNER;
/** The roof as one band between the outer and the inner line. */
const ROOF_BAND = `M${EAVE_L} ${EAVE_Y} L${RIDGE_X} ${RIDGE_Y} L${EAVE_R} ${EAVE_Y} H${INNER_R} L${RIDGE_X} ${INNER_Y} L${INNER_L} ${EAVE_Y} Z`;
/** The moon-facing slope, drawn exactly on the roof polygon edge. */
export const ROOF_RIM = `M${RIDGE_X} ${RIDGE_Y} L${EAVE_R} ${EAVE_Y}`;

/** One class per floor; the floor group's room back is exactly the Scene_Layout floor rectangle. */
export const FLOOR_CLASS: Readonly<Record<Floor, string>> = {
  attic: "floor-attic",
  "middle floor": "floor-middle",
  basement: "floor-basement",
};

/** Y of the slope at `x` on the right side of the roof. */
function slopeY(x: number): number {
  return (
    Math.round(
      (RIDGE_Y + ((EAVE_Y - RIDGE_Y) * (x - RIDGE_X)) / (EAVE_R - RIDGE_X)) *
        10,
    ) / 10
  );
}

/**
 * The outline of everything solid above the ground, clockwise: body with roof
 * and chimney, then the tower. The rain is clipped to the sky outside it.
 */
export function houseOutline(): number[][] {
  const { x, w, top, foot, apex } = TOWER;
  const body = [
    [EAVE_L, EAVE_Y, RIDGE_X, RIDGE_Y, 1004, slopeY(1004), 1004, 212],
    [1052, 212, 1052, slopeY(1052), EAVE_R, EAVE_Y, BODY.right, EAVE_Y],
    [BODY.right, 760, BODY.left, 760, BODY.left, EAVE_Y],
  ].flat();
  const tower = [x - 12, top - 8, x + w / 2, apex, x + w + 12, top - 8];
  return [body, [...tower, x + w, top, x + w, foot, x, foot, x, top]];
}

/** Id of the clip that keeps the attic under the inner roof line (stage.ts clips its dim with it too). */
export const ATTIC_CLIP = "attic-inside";

function floorGroup(floor: Floor, contents: readonly ShapeNode[]): ShapeNode {
  const r = FLOOR_RECT[floor];
  const back = rect("room-back tone-slate", r.x, r.y, r.w, r.h, {
    part: "room-back",
  });
  return g(`floor ${FLOOR_CLASS[floor]}`, [back, ...contents], {
    part: FLOOR_CLASS[floor],
    ...(floor === "attic" ? { clip: ATTIC_CLIP } : {}),
  });
}

/** The tower shaft: upright, apart from the right eave. */
export const TOWER = {
  x: 1226,
  w: 84,
  top: 312,
  foot: 760,
  apex: 118,
} as const;

/** A pointed (gothic) arch from its foot line, centre, half width and height. */
function arch(cx: number, foot: number, half: number, h: number): string {
  const spring = foot - h + half * 1.6;
  const top = foot - h;
  return `M${cx - half} ${foot} V${spring} Q${cx - half} ${top + half * 0.6} ${cx} ${top} Q${cx + half} ${top + half * 0.6} ${cx + half} ${spring} V${foot} Z`;
}

/** The upright tower: shaft, spire, weathervane and one lit pointed-arch opening. */
function tower(): ShapeNode {
  const { x, w, top, foot, apex } = TOWER;
  const cx = x + w / 2;
  const right = x + w;
  return g(
    "tower",
    [
      defs([
        gradient("radialGradient", "tower-glow", [
          ["stop-lamp-0", 0],
          ["stop-lamp-1", 1],
        ]),
      ]),
      rect("tower-shaft tone-night", x, top, w, foot - top),
      rect("tower-cornice tone-night", x - 8, top - 12, w + 16, 12),
      poly(
        "tower-spire tone-night",
        [x - 12, top - 8, right + 12, top - 8, cx, apex],
        { part: "spire" },
      ),
      strokePath(
        "vane",
        `M${cx} ${apex} V${apex - 32} M${cx - 18} ${apex - 22} H${cx + 18} M${cx + 12} ${apex - 27} L${cx + 18} ${apex - 22} L${cx + 12} ${apex - 17}`,
        { part: "weathervane" },
      ),
      circle("tone-night", cx, apex - 8, 3),
      circle("tower-glow", cx, 432, 70, { paint: "tower-glow" }),
      path("tower-arch-frame tone-slate", arch(cx, 476, 18, 92)),
      path("tower-arch-glass", arch(cx, 472, 14, 84), { part: "tower-arch" }),
      strokePath(
        "tower-arch-bars",
        `M${cx} 400 V472 M${cx - 14} 438 H${cx + 14}`,
      ),
      path("tower-slit tone-slate", arch(cx, 640, 7, 44)),
      strokePath(
        "rim",
        `M${cx} ${apex} L${right + 12} ${top - 8} M${right} ${top} V${foot}`,
      ),
      strokePath("rim vane-rim", `M${cx + 2} ${apex} V${apex - 32}`),
    ],
    { part: "tower" },
  );
}

/** The jagged soil edge where the ground is cut open over the basement. */
function groundCut(): string {
  let d = "M380 754 H1330";
  for (let x = 1330, i = 0; x > 380; x -= 38, i += 1) {
    d += ` L${x - 19} ${i % 2 === 0 ? 772 : 764}`;
  }
  return `${d} L380 766 Z`;
}

/** Attic: three beams, cobwebs in both upper corners, an old trunk on the right. */
function attic(): ShapeNode[] {
  return [
    strokePath("beams", "M620 350 H1120 M800 330 V350 M940 330 V350", {
      part: "rafters",
    }),
    strokePath(
      "cobweb",
      "M592 380 H640 M592 380 V424 M592 380 L628 412 M608 380 Q606 394 592 396 M626 380 Q622 410 592 414",
    ),
    strokePath(
      "cobweb",
      "M1148 392 H1104 M1148 392 V432 M1148 392 L1116 420 M1132 392 Q1134 406 1148 408 M1114 392 Q1118 418 1148 422",
    ),
    g("trunk", [
      rect("tone-rust", 1040, 462, 70, 38),
      rect("tone-brass", 1052, 462, 6, 38),
      rect("tone-brass", 1092, 462, 6, 38),
    ]),
  ];
}

/** [x, top, width, tone] of each book; a book stands on the shelf (680) or the case floor (752). */
const BOOKS: readonly (readonly [number, number, number, string])[] = [
  [786, 642, 10, "mist"],
  [797, 636, 8, "rust"],
  [806, 646, 12, "slate"],
  [820, 640, 9, "mist"],
  [831, 650, 10, "rust"],
  [788, 712, 8, "rust"],
  [798, 706, 12, "slate"],
  [812, 716, 9, "mist"],
  [834, 708, 10, "rust"],
];

/** Middle floor: the Entrance_Hall on the left, a wall at x 760, the Parlour on the right. */
function middleFloor(): ShapeNode[] {
  const hall = g(
    "entrance-hall",
    [
      rect("door tone-rust", 575, 610, 80, 150, { part: "front-door" }),
      circle("door-knob tone-brass", 643, 690, 4),
      rect("transom tone-candle", 583, 590, 64, 14),
      rect("portrait-frame tone-brass", 680, 566, 56, 70),
      rect("portrait tone-slate", 685, 571, 46, 60),
      ellipse("portrait-face tone-mist", 708, 596, 10, 14),
      g("telephone-table tone-night", [
        rect("table-top", 664, 700, 88, 8),
        rect("table-leg", 672, 708, 6, 52),
        rect("table-leg", 734, 708, 6, 52),
      ]),
    ],
    { part: "entrance-hall" },
  );
  const parlour = g(
    "parlour",
    [
      g("shelves", [
        rect("bookcase tone-night", 780, 612, 76, 143),
        rect("shelf tone-slate", 780, 680, 76, 5),
        ...BOOKS.map(([x, y, w, tone]) =>
          rect(`books tone-${tone}`, x, y, w, (y < 680 ? 680 : 752) - y),
        ),
      ]),
      g("fireplace", [
        rect("tone-mist", 1040, 630, 110, 130),
        rect("tone-night", 1030, 622, 130, 10),
        rect("tone-night", 1060, 670, 70, 90),
        ellipse("ember tone-candle", 1095, 752, 22, 5),
      ]),
    ],
    { part: "parlour" },
  );
  return [hall, rect("partition tone-night", 756, 500, 8, 260), parlour];
}

/** Stone joints of the basement wall: rows of 30 units, each row shifted by half a block. */
function stoneJoints(): string {
  let d = "";
  for (let row = 0; row < 6; row += 1) {
    const y = 760 + row * 30;
    d += `M580 ${y} H1160 `;
    for (let x = 600 + (row % 2) * 30; x < 1160; x += 60)
      d += `M${x} ${y} v30 `;
  }
  return d.trim();
}

/** Basement: stone walls, the boiler on the left, two pipes, two chains on the right. */
function basement(): ShapeNode[] {
  const chain = (x: number): ShapeNode =>
    g(
      "chain",
      [0, 1, 2, 3, 4, 5].map((i) =>
        ellipse("chain-link", x, 786 + i * 12, 4, 7, { fill: "none" }),
      ),
    );
  return [
    strokePath("stone-joints", stoneJoints()),
    g("boiler", [
      rect("tone-rust", 600, 800, 80, 130, { rx: 12 }),
      circle("tone-brass", 640, 836, 12),
      strokePath("gauge-needle", "M640 836 L647 829"),
    ]),
    rect("pipe tone-mist", 650, 778, 500, 8),
    rect("pipe tone-mist", 680, 792, 470, 6),
    rect("pipe tone-mist", 650, 778, 10, 22),
    chain(1110),
    chain(1136),
  ];
}

/** Walls, roof, chimney, tower, oculus, the three floors and the cut ground line. */
export function houseLayer(): ShapeNode {
  const { left, right } = BODY;
  return g("house", [
    defs([
      {
        kind: "clipPath",
        id: ATTIC_CLIP,
        children: [
          poly("clip-shape", [...ROOF_INNER, INNER_R, 510, INNER_L, 510]),
        ],
      },
    ]),
    rect("ground tone-night", 0, 760, 1600, 240),
    tower(),
    rect("chimney tone-night", 1010, 220, 36, 70),
    rect("chimney-cap tone-night", 1004, 212, 48, 10),
    poly("walls tone-night", [
      left,
      760,
      left,
      EAVE_Y,
      RIDGE_X,
      RIDGE_Y + 10,
      right,
      EAVE_Y,
      right,
      760,
    ]),
    g("oculus", [
      circle("oculus-frame tone-mist", RIDGE_X, 262, 24),
      circle("oculus-glass tone-slate", RIDGE_X, 262, 19),
      circle("oculus-light", RIDGE_X, 262, 19),
      strokePath("oculus-bars", "M851 262 H889 M870 243 V281"),
    ]),
    floorGroup("attic", attic()),
    floorGroup("middle floor", middleFloor()),
    floorGroup("basement", basement()),
    path("roof tone-night", ROOF_BAND, { part: "roof" }),
    rect("floor-slab tone-night", left, 496, right - left, 8),
    path("ground-cut tone-night", groundCut()),
    g("rims", [
      strokePath("rim", ROOF_RIM, { part: "roof-rim" }),
      strokePath("rim", `M${right} ${EAVE_Y} V760`),
      strokePath("rim", "M1046 222 V281 M1004 212 H1052 V222"),
    ]),
  ]);
}
