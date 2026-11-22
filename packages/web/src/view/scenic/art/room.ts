import {
  arch,
  defs,
  ellipse,
  g,
  gradient,
  image,
  path,
  poly,
  rect,
  strokePath,
  type ShapeNode,
} from "./shapes.js";

// The close-up exorcism room, in the viewBox `0 0 600 800`. The room itself
// is a declared illustration drafted with Claude, `room-scene.svg`, by the
// director's decision of 22 Nov; the page draws only what changes over it:
// the rain in the window, the cold and warm light, the three Question_Candles,
// the sparks and the smoke "?". No filter anywhere (decision Q5).

/** The room picture's box. */
export const ROOM_BOX = { w: 600, h: 800 } as const;

/** The glass of the window in the illustration: the rain is clipped to it. */
export const ROOM_GLASS = { cx: 250, foot: 444, half: 76, h: 338 } as const;

/** Top of the shelf board and the centres of the three Question_Candles. */
export const SHELF_TOP = 628;
export const CANDLE_X = [385, 430, 475] as const;

/** Where the close-up ghost floats (room units): centre x and the band it fills. */
export const CLOSE_UP = { cx: 250, top: 236, bottom: 660 } as const;

const RAIN_STEP = [-80, 200] as const;

/** Slanted streaks behind the glass; one step of `room-rain` lands each streak on another. */
export function roomRainPath(): string {
  const [sx, sy] = RAIN_STEP;
  const length = 22;
  const dx = Math.round((length * sx) / sy);
  let d = "";
  for (let i = 0; i < 16; i += 1) {
    let x = 168 + i * 17 + ((i * 7) % 11);
    let y = ((i * 61) % sy) - sy;
    for (; y < ROOM_GLASS.foot; x += sx, y += sy) {
      d += `M${x} ${y}l${dx} ${length}`;
    }
  }
  return d;
}

/** One Question_Candle: holder, wax, wick, the still smoke line when unlit and the flame when lit. */
function questionCandle(x: number, index: number): ShapeNode {
  const top = SHELF_TOP - 78;
  return g(
    "qcandle",
    [
      ellipse("qcandle-holder", 0, SHELF_TOP - 3, 20, 4),
      path(
        "qcandle-cup",
        `M-20 ${SHELF_TOP - 4} C-20 ${SHELF_TOP - 12} 20 ${SHELF_TOP - 12} 20 ${SHELF_TOP - 4} L15 ${SHELF_TOP} L-15 ${SHELF_TOP} Z`,
      ),
      path(
        "qcandle-wax",
        `M-9 ${SHELF_TOP - 10} L-9 ${top + 4} C-9 ${top} -4 ${top - 2} 0 ${top - 1} C4 ${top - 2} 9 ${top} 9 ${top + 4} L9 ${SHELF_TOP - 10} Z`,
        { paint: "qcandle-wax" },
      ),
      path(
        "qcandle-drip",
        `M9 ${top + 6} C12 ${top + 14} 11 ${top + 24} 9 ${top + 28} Z`,
      ),
      strokePath("qcandle-wick", `M0 ${top - 1} L0 ${top - 9}`),
      strokePath(
        "qcandle-smoke",
        `M0 ${top - 10} C-6 ${top - 24} 6 ${top - 34} 0 ${top - 48} C-5 ${top - 58} 3 ${top - 66} 0 ${top - 74}`,
      ),
      g(
        "flame-wrap",
        [
          ellipse("qcandle-glow", 0, top - 18, 30, 30, {
            paint: "qcandle-glow",
          }),
          g("flame", [
            path(
              "flame-outer",
              `M0 ${top - 36} C7 ${top - 25} 10 ${top - 16} 8 ${top - 9} C7 ${top - 3} 3 ${top} 0 ${top} C-3 ${top} -7 ${top - 3} -8 ${top - 9} C-10 ${top - 16} -7 ${top - 25} 0 ${top - 36} Z`,
              { paint: "qcandle-flame" },
            ),
            path(
              "flame-core",
              `M0 ${top - 18} C2 ${top - 13} 3 ${top - 8} 2 ${top - 5} C1 ${top - 2} -1 ${top - 2} -2 ${top - 5} C-3 ${top - 8} -2 ${top - 13} 0 ${top - 18} Z`,
            ),
          ]),
        ],
        { part: "flame" },
      ),
    ],
    { part: `qcandle-${index}`, transform: { translate: [x, 0] } },
  );
}

/** Twelve small diamonds around the close-up ghost, hidden until the Exorcised_Moment. */
function sparks(): ShapeNode {
  const cy = (CLOSE_UP.top + CLOSE_UP.bottom) / 2;
  return g(
    "sparks",
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const x = Math.round(CLOSE_UP.cx + Math.cos(a) * 120);
      const y = Math.round(cy + Math.sin(a) * 150);
      return poly("spark", [x, y - 9, x + 5, y, x, y + 9, x - 5, y]);
    }),
  );
}

/**
 * The close-up room: the illustration (or a plain backdrop when the asset
 * falls back), the window rain, the cold and warm light, the Question_Candles,
 * the sparks and the smoke "?". The close-up ghost is HTML over this SVG.
 */
export function roomArt(href: string | null): ShapeNode {
  const { cx, foot, half, h } = ROOM_GLASS;
  return g("room-art", [
    defs([
      {
        kind: "clipPath",
        id: "room-glass",
        children: [path("clip-shape", arch(cx, foot, half, h))],
      },
      gradient(
        "radialGradient",
        "room-cold",
        [
          ["stop-room-cold-0", 0],
          ["stop-room-cold-1", 1],
        ],
        { units: "userSpaceOnUse", cx: 250, cy: 300, r: 420 },
      ),
      gradient(
        "radialGradient",
        "room-warm",
        [
          ["stop-room-warm-0", 0],
          ["stop-room-warm-1", 1],
        ],
        { units: "userSpaceOnUse", cx: 430, cy: 560, r: 400 },
      ),
      gradient(
        "linearGradient",
        "qcandle-wax",
        [
          ["stop-wax-shade", 0],
          ["stop-wax-light", 0.5],
          ["stop-wax-shade", 1],
        ],
        { x1: 0, y1: 0, x2: 1, y2: 0 },
      ),
      gradient("radialGradient", "qcandle-glow", [
        ["stop-halo-0", 0],
        ["stop-halo-1", 1],
      ]),
      gradient("radialGradient", "qcandle-flame", [
        ["stop-flame-0", 0],
        ["stop-flame-1", 0.55],
        ["stop-flame-2", 1],
      ]),
    ]),
    href === null
      ? rect("room-fallback", 0, 0, ROOM_BOX.w, ROOM_BOX.h)
      : image("room-scene", href, 0, 0, ROOM_BOX.w, ROOM_BOX.h),
    g(
      "room-rain-wrap",
      [g("room-rain", [strokePath("rain-streaks", roomRainPath())])],
      { clip: "room-glass" },
    ),
    rect("room-light-cold", 0, 0, ROOM_BOX.w, ROOM_BOX.h, {
      paint: "room-cold",
    }),
    rect("room-light-warm", 0, 0, ROOM_BOX.w, ROOM_BOX.h, {
      paint: "room-warm",
    }),
    g(
      "qcandles",
      CANDLE_X.map((x, i) => questionCandle(x, i)),
      { part: "question-candles" },
    ),
    sparks(),
    g("smoke-q", [
      strokePath(
        "smoke-q-line",
        "M191 174 C191 150 239 150 239 174 C239 192 215 196 215 216 L215 226",
      ),
      ellipse("smoke-q-dot", 215, 246, 5, 5),
    ]),
  ]);
}
