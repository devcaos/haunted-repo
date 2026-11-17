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

// Everything here is in the house viewBox `0 0 1600 1000` (design "World
// geometry"). The top band (y < 110) holds only sky and the left column
// (x < 400) only far hills, fence and gravestones, so the HUD stays readable.

const CLOUDS_LEFT = [
  "M420 160 C520 132 660 136 760 146 C840 134 900 142 940 158 C800 172 560 174 420 160 Z",
  "M520 312 C620 292 760 294 860 304 C930 296 990 302 1020 314 C880 326 660 328 520 312 Z",
];
const CLOUD_RIGHT =
  "M1030 228 C1130 202 1280 204 1380 214 C1460 204 1530 212 1570 226 C1420 242 1180 244 1030 228 Z";
const FAR_HILLS =
  "M0 690 C180 652 340 640 500 664 C680 692 840 668 1020 652 C1200 640 1400 668 1600 650 V1000 H0 Z";
const NEAR_HILLS =
  "M0 760 C260 754 520 744 780 734 C1040 724 1300 712 1600 700 V1000 H0 Z";

/** L0 to L3, back to front: sky gradient, moon and halo, clouds, far and near hills. */
export function skyLayers(): ShapeNode {
  return g("sky-layers", [
    defs([
      gradient(
        "linearGradient",
        "sky-fill",
        [
          ["stop-night", 0],
          ["stop-slate", 0.7],
        ],
        { x1: 0, y1: 0, x2: 0, y2: 1 },
      ),
      gradient("radialGradient", "moon-halo", [
        ["stop-halo-0", 0],
        ["stop-halo-1", 1],
      ]),
    ]),
    g("sky", [rect("sky-fill", 0, 0, 1600, 1000, { paint: "sky-fill" })]),
    g("moon-clouds", [
      circle("moon-halo", 1210, 175, 200, { paint: "moon-halo" }),
      circle("moon tone-bone", 1210, 175, 64, { part: "moon" }),
      ellipse("moon-shade tone-mist", 1186, 160, 14, 10),
      ellipse("moon-shade tone-mist", 1228, 198, 9, 7),
      g(
        "clouds-left",
        CLOUDS_LEFT.map((d) => path("cloud tone-mist", d)),
      ),
      g("clouds-right", [path("cloud tone-mist", CLOUD_RIGHT)]),
    ]),
    g("hills-far", [path("hill-far tone-mist", FAR_HILLS)]),
    g("hills-near", [path("hill-near tone-slate", NEAR_HILLS)]),
  ]);
}

/**
 * Each column of streaks repeats every (-40, 200) units, the step of the
 * `rain-fall` animation (`--sc-rain-step-x`, `--sc-rain-step-y`), so one step
 * lands every streak where another was and the loop never jumps.
 */
const RAIN_STEP_X = -40;
const RAIN_STEP_Y = 200;
/** Columns start this far right of the scene, so the leftward drift never leaves a gap. */
const RAIN_SPAN = 1600 + 6 * -RAIN_STEP_X;

/** Short slanted streaks spread over the scene, one path for all of them. */
export function rainPath(): string {
  let d = "";
  const columns = 56;
  for (let i = 0; i < columns; i += 1) {
    // Evenly spread over the span, with a small jitter so they do not line up.
    let x = Math.round((i * RAIN_SPAN) / columns) + ((i * 7) % 13) + 6;
    let y = ((i * 97) % RAIN_STEP_Y) - RAIN_STEP_Y;
    for (; y < 1000; x += RAIN_STEP_X, y += RAIN_STEP_Y) {
      d += `M${x} ${y}l-6 22`;
    }
  }
  return d;
}

/** Rain (`rain-wrap` > `rain`, so a wrapper can hide it while the inner group moves) and two fog bands. */
export function weatherLayer(): ShapeNode {
  return g("weather", [
    g("rain-wrap", [g("rain", [strokePath("rain-streaks", rainPath())])]),
    path(
      "fog fog-back",
      "M380 748 C560 728 800 732 1000 742 C1160 730 1300 736 1420 752 C1200 770 620 772 380 748 Z",
    ),
    path(
      "fog fog-front",
      "M0 900 C240 874 520 880 760 892 C1000 878 1300 884 1600 902 C1300 930 300 932 0 900 Z",
    ),
  ]);
}

const PICKETS = [256, 316, 376]
  .map((x) => `M${x} 1000 V720 l6 -12 l6 12 V1000 Z`)
  .join(" ");
const DEAD_TREE =
  "M1460 1000 C1470 860 1480 720 1470 600 C1440 520 1400 470 1385 420 L1395 416 C1420 470 1460 520 1478 560 C1480 470 1470 390 1450 300 L1462 300 C1490 390 1500 470 1494 560 C1520 500 1560 450 1595 420 L1600 432 C1560 470 1520 530 1500 610 C1495 740 1505 880 1520 1000 Z";

/** L5: gravestones and fence on the left, the dead tree on the right, with a faint moon rim. */
export function foregroundLayer(): ShapeNode {
  return g("foreground", [
    g("gravestones tone-night", [
      path("grave", "M30 1000 V740 C30 690 110 690 110 740 V1000 Z"),
      path(
        "grave",
        "M150 1000 V790 H124 V762 H150 V720 H178 V762 H204 V790 H178 V1000 Z",
      ),
      poly("grave", [212, 1000, 222, 770, 268, 764, 262, 1000]),
    ]),
    g("fence tone-night", [
      path("pickets", PICKETS),
      rect("rail", 250, 770, 196, 6),
      rect("rail", 250, 860, 196, 6),
      rect("post", 434, 868, 14, 132),
      rect("lantern tone-brass", 431, 846, 20, 22, { part: "lantern" }),
    ]),
    path("dead-tree tone-night", DEAD_TREE, { part: "dead-tree" }),
    g("rim-fg", [
      strokePath("rim", "M74 694 C96 698 110 716 110 740 V800"),
      strokePath("rim", "M178 720 V762 H204 V790"),
      strokePath("rim", "M222 770 L268 764 L266 840"),
      strokePath(
        "rim",
        "M1595 420 L1600 432 M1500 610 C1495 740 1505 880 1520 1000",
      ),
    ]),
  ]);
}
