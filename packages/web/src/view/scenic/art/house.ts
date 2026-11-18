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

/** The whole attic volume, from the inner ridge down to the attic floor (the roof clip cuts its top corners). */
export const ATTIC_BACK = {
  x: 590,
  y: INNER_Y,
  w: 560,
  h: 500 - INNER_Y,
} as const;

/** Centre and radius of each room's light: the ghosts and the moonlit oculus, the fire, the boiler dial. */
const ROOM_LIGHT: Readonly<Record<Floor, readonly [number, number, number]>> = {
  attic: [870, 380, 360],
  "middle floor": [1050, 700, 470],
  basement: [636, 880, 440],
};

function floorGroup(floor: Floor, contents: readonly ShapeNode[]): ShapeNode {
  const r = FLOOR_RECT[floor];
  const [cx, cy, radius] = ROOM_LIGHT[floor];
  const id = `room-${FLOOR_CLASS[floor]}`;
  const back = rect("room-back", r.x, r.y, r.w, r.h, {
    part: "room-back",
    paint: id,
  });
  // The attic has no flat ceiling: its back rises to the ridge, cut by the roof clip.
  const upper =
    floor === "attic"
      ? [
          rect(
            "room-back-upper",
            ATTIC_BACK.x,
            ATTIC_BACK.y,
            ATTIC_BACK.w,
            r.y - ATTIC_BACK.y + 1,
            { paint: id },
          ),
        ]
      : [];
  const fill = gradient(
    "radialGradient",
    id,
    [
      ["stop-room-0", 0],
      ["stop-room-1", 1],
    ],
    {
      units: "userSpaceOnUse",
      cx,
      cy,
      r: radius,
    },
  );
  return g(
    `floor ${FLOOR_CLASS[floor]}`,
    [defs([fill]), ...upper, back, ...contents],
    {
      part: FLOOR_CLASS[floor],
      ...(floor === "attic" ? { clip: ATTIC_CLIP } : {}),
    },
  );
}

/** [polygon, gradient start, gradient end] of each light cone: the tower arch. */
// prettier-ignore
const CONES: readonly (readonly [number[], number[]])[] = [
  [[1264, 474, 1288, 474, 1368, 760, 1240, 760], [1276, 474, 1304, 760]],
];

/** The warm cone that leaves the tower arch. */
function lightCones(): ShapeNode {
  return g(
    "light-cones",
    [
      ...CONES.map(([, [x1, y1, x2, y2]], i) =>
        defs([
          gradient(
            "linearGradient",
            `cone-${i}`,
            [
              ["stop-cone-0", 0],
              ["stop-cone-1", 1],
            ],
            {
              units: "userSpaceOnUse",
              x1,
              y1,
              x2,
              y2,
            },
          ),
        ]),
      ),
      ...CONES.map(([points], i) =>
        poly("light-cone", points, { paint: `cone-${i}` }),
      ),
    ],
    { part: "light-cones" },
  );
}

/** The tower shaft: upright, apart from the right eave. */
export const TOWER = {
  x: 1226,
  w: 100,
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

/** Dust motes floating in the moonlight under the round window. */
// prettier-ignore
const MOTES = [[846, 300], [828, 338], [840, 362], [812, 392], [824, 420], [796, 446], [778, 472]] as const;

/** Attic: the round window in the gable, a collar beam, cobwebs in both corners, an old trunk. */
function attic(): ShapeNode[] {
  return [
    g(
      "oculus",
      [
        circle("oculus-frame tone-mist", RIDGE_X, 262, 24),
        circle("oculus-glass tone-slate", RIDGE_X, 262, 19),
        circle("oculus-light", RIDGE_X, 262, 19),
        strokePath("oculus-bars", "M851 262 H889 M870 243 V281"),
      ],
      { part: "oculus" },
    ),
    // Cold moonlight falls from the round window down to the left, with dust in it.
    defs([
      gradient(
        "linearGradient",
        "moonbeam",
        [
          ["stop-moonbeam-0", 0],
          ["stop-moonbeam-1", 1],
        ],
        {
          units: "userSpaceOnUse",
          x1: 870,
          y1: 262,
          x2: 700,
          y2: 492,
        },
      ),
    ]),
    poly("moonlight", [858, 250, 884, 276, 790, 492, 712, 492], {
      paint: "moonbeam",
    }),
    poly("moonlight", [850, 258, 866, 282, 664, 492, 626, 470], {
      paint: "moonbeam",
    }),
    g(
      "dust-motes",
      MOTES.map(([x, y]) => circle("mote", x, y, 1.4)),
      { part: "dust-motes" },
    ),
    // A collar beam ties the two slopes; it is not a ceiling.
    strokePath("beams", "M676 312 H1064", { part: "rafters" }),
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
      // Very dark blue instead of black, and the parlour's fire spilling in through the doorway.
      defs([
        gradient(
          "radialGradient",
          "hall-dusk",
          [
            ["stop-hall-0", 0],
            ["stop-hall-1", 1],
          ],
          {
            units: "userSpaceOnUse",
            cx: 660,
            cy: 650,
            r: 240,
          },
        ),
        gradient(
          "radialGradient",
          "hall-spill",
          [
            ["stop-warmth-0", 0],
            ["stop-warmth-1", 1],
          ],
          // Centred on the doorway; it fades out before any edge of the hall.
          { units: "userSpaceOnUse", cx: 756, cy: 720, r: 170 },
        ),
      ]),
      rect("hall-back", 560, 505, 196, 250, { paint: "hall-dusk" }),
      rect("spill-light", 560, 505, 196, 250, { paint: "hall-spill" }),
      // One Brass door surround: jambs and lintel touch, the lit transom and door sit inside.
      rect("door-frame tone-brass", 571, 604, 88, 151),
      rect("transom tone-candle", 579, 612, 72, 12),
      rect("door tone-rust", 579, 628, 72, 127, { part: "front-door" }),
      circle("door-knob tone-brass", 640, 696, 4),
      rect("lintel tone-brass", 563, 594, 104, 10, { part: "lintel" }),
      rect("portrait-frame tone-brass", 680, 566, 56, 70),
      rect("portrait tone-slate", 685, 571, 46, 60),
      ellipse("portrait-face tone-mist", 708, 596, 10, 14),
      // The legs stand on the floor (755), so the top never floats.
      g("telephone-table tone-rust", [
        rect("table-top", 668, 694, 80, 8),
        rect("table-leg", 674, 702, 6, 53),
        rect("table-leg", 736, 702, 6, 53),
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
      // The visual anchor of the floor: a warm light over the parlour, then the fire.
      rect("fire-light", 764, 505, 416, 250, { paint: "fire-warmth" }),
      g("fireplace", [
        rect("tone-slate", 985, 646, 130, 109),
        rect("tone-night", 975, 636, 150, 10),
        rect("tone-abyss", 1012, 680, 76, 75),
        circle("fire-glow", 1050, 728, 56, { paint: "fire-glow" }),
        g(
          "flames",
          [
            poly(
              "tone-pumpkin",
              [
                1018, 748, 1030, 712, 1040, 722, 1050, 684, 1060, 718, 1070,
                706, 1082, 748,
              ],
            ),
            poly(
              "tone-candle",
              [1028, 748, 1040, 724, 1050, 700, 1060, 726, 1072, 748],
            ),
            poly("tone-bone", [1040, 748, 1050, 720, 1060, 748]),
          ],
          { part: "flames" },
        ),
        rect("tone-rust", 1020, 746, 60, 7),
      ]),
      // The hatch lid stands open against the wall.
      rect("hatch-lid tone-rust", 1166, 712, 7, 43, { part: "hatch-lid" }),
    ],
    { part: "parlour" },
  );
  // The partition stops above a doorway (y 640 to 755) between hall and parlour.
  return [hall, rect("partition tone-night", 756, 500, 8, 140), parlour];
}

/** Five bricks that suggest the wall, low down and clear of the panes, pipe and stairs. */
// prettier-ignore
const BRICKS = [[690, 904, 28, 12], [706, 918, 22, 10], [930, 880, 28, 12], [950, 894, 24, 12], [990, 866, 26, 10]] as const;

/** The hatch in the middle floor, right of the fireplace, where the cellar stairs start. */
export const HATCH = { x1: 1126, x2: 1160 } as const;
/** The upper edge of the stairs runs from under the hatch down to the cellar floor. */
const STAIR_TOP: readonly [number, number] = [1154, 765];
const STAIR_FOOT: readonly [number, number] = [1050, 940];

function stairX(y: number): number {
  const [tx, ty] = STAIR_TOP;
  const [fx, fy] = STAIR_FOOT;
  return Math.round(tx + ((fx - tx) * (y - ty)) / (fy - ty));
}

/**
 * The cellar stairs: a back and a front stringer and six thick treads. The
 * front stringer is split at y 845 so each half keeps clear of the slot panes.
 */
function stairs(): ShapeNode {
  const band = (
    x: number,
    y1: number,
    y2: number,
    dx: number,
    dy: number,
  ): number[] =>
    [
      stairX(y1) + dx,
      y1 + dy,
      stairX(y1) + dx + 14,
      y1 + dy,
      stairX(y2) + dx + 14,
      y2 + dy,
      stairX(y2) + dx,
      y2 + dy,
    ].map((v, i) => (i % 2 === 0 ? v + x : v));
  const treads = [1, 2, 3, 4, 5, 6].map((i) => {
    const y = 765 + 25 * i;
    return rect("tread", stairX(y) - 4, y - 8, 26, 8);
  });
  return g(
    "stairs",
    [
      poly(
        "stair-light",
        [HATCH.x1, 765, HATCH.x2, 765, 1124, 940, 1036, 940],
        { paint: "stair-warmth" },
      ),
      poly("stringer stringer-back", band(6, 765, 845, 0, -4)),
      poly("stringer stringer-back", band(6, 845, 940, 0, -4)),
      ...treads,
      poly("stringer", band(0, 765, 845, 0, 0)),
      poly("stringer", band(0, 845, 940, 0, 0)),
    ],
    { part: "stairs" },
  );
}

/** Basement: a few bricks, the boiler with its glowing dial on the left, two chains on the right. */
function basement(): ShapeNode[] {
  // Each chain hangs from a ring under an iron bar bolted to the wall.
  const chain = (x: number): ShapeNode =>
    g("chain", [
      circle("chain-ring", x, 856, 4, { fill: "none" }),
      ...[0, 1, 2, 3, 4, 5].map((i) =>
        ellipse("chain-link", x, 866 + i * 11, 4, 6.5, { fill: "none" }),
      ),
    ]);
  return [
    ...BRICKS.map(([x, y, w, h]) => rect("brick", x, y, w, h)),
    // The flue leaves the boiler, bends twice and ends at a flange under the floor.
    strokePath(
      "pipe",
      "M612 852 V818 Q612 808 602 808 H596 Q586 808 586 798 V771",
    ),
    rect("pipe-fitting tone-mist", 578, 765, 16, 6),
    g("valve", [
      circle("valve-wheel", 612, 834, 6, { fill: "none" }),
      strokePath("valve-wheel", "M606 834 H618 M612 828 V840"),
    ]),
    g("boiler", [
      rect("tone-rust", 598, 852, 76, 88, { rx: 10 }),
      circle("dial-light", 636, 882, 30, { paint: "dial-glow" }),
      circle("tone-brass", 636, 882, 13),
      circle("dial-face tone-candle", 636, 882, 10),
      strokePath("gauge-needle", "M636 882 L642 875"),
      rect("grate tone-pumpkin", 614, 914, 44, 10),
    ]),
    g("chain-bar", [
      rect("tone-mist", 734, 846, 54, 6, { part: "chain-bar" }),
      circle("tone-night", 739, 849, 1.5),
      circle("tone-night", 783, 849, 1.5),
    ]),
    chain(748),
    chain(774),
    stairs(),
  ];
}

/** Thickness of the floors, the cellar foundation and (at least) the outer walls. */
export const WALL = 10;

/** Ground, tower, chimney, walls, oculus, the three floors, roof, slabs and rim light. */
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
      ...["dial-glow", "fire-glow"].map((id) =>
        gradient("radialGradient", id, [
          ["stop-lamp-0", 0],
          ["stop-lamp-1", 1],
        ]),
      ),
      gradient(
        "linearGradient",
        "stair-warmth",
        [
          ["stop-warmth-0", 0],
          ["stop-warmth-1", 1],
        ],
        {
          units: "userSpaceOnUse",
          x1: 1140,
          y1: 765,
          x2: 1080,
          y2: 940,
        },
      ),
      gradient(
        "radialGradient",
        "fire-warmth",
        [
          ["stop-warmth-0", 0],
          ["stop-warmth-1", 1],
        ],
        {
          units: "userSpaceOnUse",
          cx: 1050,
          cy: 720,
          r: 300,
        },
      ),
    ]),
    rect("ground tone-abyss", 0, 760, 1600, 240, { part: "ground" }),
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
    floorGroup("attic", attic()),
    floorGroup("middle floor", middleFloor()),
    floorGroup("basement", basement()),
    path("roof tone-night", ROOF_BAND, { part: "roof" }),
    lightCones(),
    // Walls with weight: 10-unit floors and a 10-unit foundation round the cellar.
    g(
      "structure tone-night",
      [
        rect("floor-slab", left, 495, right - left, WALL),
        // The middle floor is open over the hatch.
        rect("floor-slab", left, 755, HATCH.x1 - left, WALL),
        rect("floor-slab", HATCH.x2, 755, right - HATCH.x2, WALL),
        rect("foundation", 570, 760, WALL, 190),
        rect("foundation", 1160, 760, WALL, 190),
        rect("foundation", 570, 940, 600, WALL),
      ],
      { part: "structure" },
    ),
    g("rims", [
      strokePath("rim", ROOF_RIM, { part: "roof-rim" }),
      strokePath("rim", `M${right} ${EAVE_Y} V760`),
      strokePath("rim", "M1046 222 V281 M1004 212 H1052 V222"),
    ]),
  ]);
}
