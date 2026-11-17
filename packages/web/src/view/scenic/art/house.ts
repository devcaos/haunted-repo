import type { Floor } from "@haunted-repo/core";
import { FLOOR_RECT } from "../model/sceneLayout.js";
import {
  circle,
  ellipse,
  g,
  path,
  poly,
  rect,
  strokePath,
  type ShapeNode,
} from "./shapes.js";

// The cutaway house in the viewBox `0 0 1600 1000` (design "House composition"
// and "World geometry"). The ridge stands at x 790, left of the body centre
// (870), and the tower leans on the right, so the house is not symmetric.

const ROOF = [545, 388, 790, 165, 1195, 388];
/** The inner edge of the roof, drawn over the attic so its top corners follow the slopes. */
const ROOF_EDGE = [
  545, 388, 790, 165, 1195, 388, 1165, 388, 790, 200, 575, 388,
];

/** One class per floor; the floor group's room back is exactly the Scene_Layout floor rectangle. */
export const FLOOR_CLASS: Readonly<Record<Floor, string>> = {
  attic: "floor-attic",
  "middle floor": "floor-middle",
  basement: "floor-basement",
};

function floorGroup(floor: Floor, contents: readonly ShapeNode[]): ShapeNode {
  const r = FLOOR_RECT[floor];
  const back = rect("room-back tone-slate", r.x, r.y, r.w, r.h, {
    part: "room-back",
  });
  return g(`floor ${FLOOR_CLASS[floor]}`, [back, ...contents], {
    part: FLOOR_CLASS[floor],
  });
}

/** The crooked tower, leaning 3 degrees clockwise about its foot (1225, 760). */
function tower(): ShapeNode {
  const shapes = [
    rect("tower-shaft tone-night", 1160, 300, 130, 460),
    poly("tower-spire tone-night", [1150, 300, 1300, 300, 1207, 125]),
    rect("tower-slit tone-slate", 1212, 380, 26, 50),
    strokePath("rim", "M1207 125 L1300 300 M1290 300 V760"),
  ];
  return g(
    "tower",
    [g("tower-lean", shapes, { transform: { translate: [-1225, -760] } })],
    { part: "tower", transform: { translate: [1225, 760], rotate: 3 } },
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
    strokePath("beams", "M620 350 H1120 M700 350 V500 M1040 350 V500", {
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

/** Middle floor: the Entrance_Hall on the left, a wall at x 760, the Parlour on the right. */
function middleFloor(): ShapeNode[] {
  const hall = g(
    "entrance-hall",
    [
      rect("door tone-rust", 575, 610, 80, 150, { part: "front-door" }),
      circle("door-knob tone-brass", 643, 690, 4),
      rect("transom tone-candle", 583, 590, 64, 14),
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
        rect("bookcase tone-night", 790, 540, 90, 160),
        path(
          "books tone-mist",
          "M796 562 h10 v38 h-10 Z M834 556 h9 v44 h-9 Z M806 656 h10 v38 h-10 Z",
        ),
        path(
          "books tone-rust",
          "M808 556 h8 v44 h-8 Z M846 560 h10 v40 h-10 Z M820 650 h9 v44 h-9 Z",
        ),
        path(
          "books tone-slate",
          "M818 564 h12 v36 h-12 Z M796 660 h8 v34 h-8 Z M840 662 h12 v32 h-12 Z",
        ),
        rect("shelf tone-slate", 790, 600, 90, 5),
      ]),
      rect("portrait-frame tone-brass", 930, 552, 60, 76),
      rect("portrait tone-slate", 936, 558, 48, 64),
      ellipse("portrait-face tone-mist", 960, 584, 12, 16),
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
  return g("house", [
    rect("ground tone-night", 0, 760, 1600, 240),
    tower(),
    rect("chimney tone-night", 640, 250, 40, 90),
    rect("chimney-cap tone-night", 634, 244, 52, 10),
    poly("roof tone-night", ROOF, { part: "roof" }),
    rect("walls tone-night", 548, 380, 644, 386),
    g("oculus", [
      circle("oculus-frame tone-mist", 790, 262, 24),
      circle("oculus-glass tone-slate", 790, 262, 19),
      strokePath("oculus-bars", "M771 262 H809 M790 243 V281"),
    ]),
    floorGroup("attic", attic()),
    floorGroup("middle floor", middleFloor()),
    floorGroup("basement", basement()),
    poly("roof-edge tone-night", ROOF_EDGE),
    rect("floor-slab tone-night", 548, 496, 644, 8),
    path("ground-cut tone-night", groundCut()),
    g("rims", [
      strokePath("rim", "M790 165 L1195 388"),
      strokePath("rim", "M1192 388 V760"),
      strokePath("rim", "M680 250 V300"),
    ]),
  ]);
}
