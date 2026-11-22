import {
  defs,
  g,
  gradient,
  path,
  poly,
  rect,
  type ShapeNode,
} from "./shapes.js";
import { GROUND_Y } from "./house.js";
import { rainClipPath } from "./weather.js";

// The effects layer above the weather, in the viewBox `0 0 1600 1000`: the
// Search_Beam of a live analysis, the Lightning and the dawn of the Finale.
// The page shows each one with a class on `.stage`; nothing here moves alone.

/** The lit centre of the porch lantern painted in `house-scene.svg`, in house units. */
export const BEAM_ORIGIN = [354, 629] as const;

/** How far the beam reaches, and its half width at the far end. */
const BEAM_LENGTH = 1000;
const BEAM_HALF = 90;

/** The top of the dawn band; it fades out before it reaches the clouds. */
export const DAWN_TOP = 0;

/** The fan of the Search_Beam, drawn from (0, 0) along +x; `beam-pivot` puts it on the lantern. */
function searchBeam(): ShapeNode {
  const [x, y] = BEAM_ORIGIN;
  return g(
    "search-beam",
    [
      g("beam-sweep", [
        poly(
          "beam-fan",
          [0, -4, BEAM_LENGTH, -BEAM_HALF, BEAM_LENGTH, BEAM_HALF, 0, 4],
          { paint: "beam-light" },
        ),
      ]),
    ],
    { transform: { translate: [x, y] }, part: "search-beam" },
  );
}

/** A forked bolt in the left sky and a full-world flash, in one group that flashes. */
function lightning(): ShapeNode {
  return g(
    "lightning",
    [
      rect("lightning-sky", 0, 0, 1600, 1000),
      path(
        "lightning-bolt",
        "M662 0 L646 70 L668 74 L630 170 L654 174 L606 288 L676 158 L652 154 L690 66 L668 62 L688 0 Z",
      ),
    ],
    { part: "lightning" },
  );
}

/** The dawn band over the horizon, clipped to the sky like the rain, so it never covers the house. */
function dawn(): ShapeNode {
  return g(
    "dawn",
    [
      rect("dawn-band", 0, DAWN_TOP, 1600, GROUND_Y - DAWN_TOP, {
        paint: "dawn-light",
      }),
    ],
    { clip: "dawn-sky", part: "dawn" },
  );
}

export function effectsLayer(): ShapeNode {
  return g("effects", [
    defs([
      {
        kind: "clipPath",
        id: "dawn-sky",
        children: [path("clip-shape", rainClipPath())],
      },
      gradient(
        "linearGradient",
        "beam-light",
        [
          ["stop-beam-0", 0],
          ["stop-beam-1", 1],
        ],
        {
          units: "userSpaceOnUse",
          x1: 0,
          y1: 0,
          x2: BEAM_LENGTH,
          y2: 0,
        },
      ),
      gradient(
        "linearGradient",
        "dawn-light",
        [
          ["stop-dawn-0", 0],
          ["stop-dawn-1", 0.55],
          ["stop-dawn-2", 1],
        ],
        {
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
        },
      ),
    ]),
    dawn(),
    searchBeam(),
    lightning(),
  ]);
}
