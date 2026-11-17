import type { Floor } from "@haunted-repo/core";
import { FLOOR_RECT } from "../model/sceneLayout.js";
import {
  circle,
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

function floorGroup(
  floor: Floor,
  contents: readonly ShapeNode[] = [],
): ShapeNode {
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
    floorGroup("attic"),
    floorGroup("middle floor"),
    floorGroup("basement"),
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
