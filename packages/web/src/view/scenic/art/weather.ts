import {
  defs,
  ellipse,
  g,
  gradient,
  path,
  strokePath,
  type ShapeNode,
} from "./shapes.js";
import { GROUND_Y, HOUSE_OUTLINE } from "./house.js";

// The thin weather overlay above the scene illustration, in the viewBox
// `0 0 1600 1000`. The illustration itself is a still picture, so the page
// moves only what it draws here: rain and fog, with no filter.

/**
 * Each column of streaks repeats every (-80, 200) units, the step of the
 * `rain-fall` animation (`--sc-rain-step-x`, `--sc-rain-step-y`), so one step
 * lands every streak where another was and the loop never jumps.
 */
export const RAIN_STEP = [-80, 200] as const;
/** Streaks stop a little below the ground line; the clip hides the rest. */
export const RAIN_BOTTOM = GROUND_Y + 20;
/** Columns start this far right of the scene, so the leftward drift never leaves a gap. */
const RAIN_SPAN = 1600 + 6 * -RAIN_STEP[0];
/** Columns and streak length of the far (thin, slow) and near (long, fast) rain. */
const RAIN_LAYERS = { far: [120, 9], near: [52, 36] } as const;

/** Slanted streaks along the fall direction, one path for a whole layer. */
export function rainPath(layer: keyof typeof RAIN_LAYERS): string {
  const [columns, length] = RAIN_LAYERS[layer];
  const [sx, sy] = RAIN_STEP;
  const dx = Math.round((length * sx) / sy);
  const seed = layer === "far" ? 97 : 61;
  let d = "";
  for (let i = 0; i < columns; i += 1) {
    // Evenly spread over the span, with a small jitter so they do not line up.
    let x = Math.round((i * RAIN_SPAN) / columns) + ((i * 7) % 13) + 6;
    let y = ((i * seed) % sy) - sy;
    for (; y < RAIN_BOTTOM; x += sx, y += sy) d += `M${x} ${y}l${dx} ${length}`;
  }
  return d;
}

/**
 * Sky above the ground and outside the house: the outer box clockwise, the
 * house outline counter-clockwise, so the nonzero rule cuts the house out.
 */
export function rainClipPath(): string {
  const pairs: string[] = [];
  for (let i = HOUSE_OUTLINE.length - 2; i >= 0; i -= 2) {
    pairs.push(`${HOUSE_OUTLINE[i]} ${HOUSE_OUTLINE[i + 1]}`);
  }
  return `M0 0 H1600 V${GROUND_Y} H0 Z M${pairs.join(" L")} Z`;
}

/** [x, y, width, height] of each soft fog puff: sky streaks, then ground mist beside the house. */
// prettier-ignore
const FOG = {
  back: [[300, 230, 230, 20], [960, 110, 240, 14], [1450, 360, 160, 22]],
  front: [[230, 712, 140, 18], [1420, 708, 150, 20]],
} as const;

/** Two drifting fog groups of soft gradient ellipses (no filter, decision Q5). */
function fogLayer(): ShapeNode[] {
  return (["back", "front"] as const).map((name) =>
    g(
      `fog fog-${name}`,
      FOG[name].map(([cx, cy, rx, ry]) =>
        ellipse("fog-puff", cx, cy, rx, ry, { paint: "fog-puff" }),
      ),
    ),
  );
}

/** Rain and fog: `rain-wrap` holds the clip and stays still, each `rain` layer moves. */
export function weatherLayer(): ShapeNode {
  const layer = (name: keyof typeof RAIN_LAYERS): ShapeNode =>
    g(`rain rain-${name}`, [strokePath("rain-streaks", rainPath(name))]);
  return g("weather", [
    defs([
      {
        kind: "clipPath",
        id: "rain-sky",
        children: [path("clip-shape", rainClipPath())],
      },
      gradient("radialGradient", "fog-puff", [
        ["stop-fog-0", 0],
        ["stop-fog-1", 1],
      ]),
    ]),
    g("rain-wrap", [layer("far"), layer("near")], { clip: "rain-sky" }),
    ...fogLayer(),
  ]);
}
