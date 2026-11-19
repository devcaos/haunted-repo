import {
  GHOST_BOX,
  type GhostType,
  type VariantNumber,
} from "../model/sceneLayout.js";
import {
  circle,
  defs,
  ellipse,
  g,
  gradient,
  path,
  strokePath,
  type ShapeNode,
} from "./shapes.js";

// The three Ghost_Types after `ghost-reference.svg` (drafted with Claude and
// declared, director's decision of 18 Nov): one tall hooded wraith with a
// pointed hood, a dark oval face with two small pale eyes, no mouth, one long
// reaching arm and a robe that ends in long asymmetric points. The path data
// is ported from that file; colours come only from scenic tokens (CSS
// classes), and the glow is a radial-gradient ellipse, never a filter.

/** What every drawing of one Ghost_Type shares. */
export interface GhostTypeSpec {
  /** Natural size at Variant 0, in viewBox units (the Scene_Layout box). */
  box: { w: number; h: number };
  /** Height of one eye, for the eye share (small eyes, Requirement 5.1). */
  eyeHeight: number;
  /** Name of the idle `@keyframes` in motion.css. */
  idle: string;
}

/**
 * The reference silhouette, in the units of `ghost-reference.svg`: x -54 to
 * 70, y -10 to 262. Every command is absolute and every number pair is x, y.
 */
const REF_ORIGIN = [54, 10] as const;
const REF_BODY =
  "M5 -10 C-2 2 -19 14 -22 38 C-24 55 -30 66 -34 80 C-41 104 -39 134 -31 160 " +
  "C-25 182 -36 204 -54 226 C-30 214 -21 202 -14 190 C-12 210 -8 232 -4 262 " +
  "C2 236 6 210 10 192 C15 202 20 210 24 220 C24 196 22 176 26 156 " +
  "C32 130 34 104 30 80 C26 64 22 54 20 40 C18 18 12 0 5 -10 Z";
/** The long reaching arm (right) and the short one (left), with clawed tips. */
const REF_ARMS =
  "M28 78 C40 88 52 100 60 116 L70 124 L61 122 L66 132 L58 125 L57 135 L52 122 " +
  "C46 110 36 100 24 94 Z M-31 82 C-38 100 -42 124 -44 146 L-48 158 L-43 153 " +
  "L-43 164 L-39 153 L-35 160 L-37 146 C-34 124 -30 104 -25 90 Z";
const REF_FOLDS =
  "M-14 70 C-18 110 -16 150 -12 186 M8 66 C10 110 8 150 10 190 M-2 60 C-4 120 -2 170 1 230";
const REF_FACE =
  "M-13 32 C-12 18 -4 12 1 12 C8 13 13 22 12 34 C11 47 6 54 0 54 C-7 54 -14 45 -13 32 Z";
/** One eye in reference units: centre, tilt in degrees and radii. */
interface EyeSpec {
  x: number;
  y: number;
  tilt: number;
  rx: number;
  ry: number;
}
/**
 * The five eye styles shared by the three types (design "Variants"). Each is
 * built from the Variant 0 shapes (an oval with a soft glow circle) and
 * changes only their size, tilt or spacing. Style 0 is the pair of the
 * reference.
 */
const EYE_STYLES: Readonly<Record<VariantNumber, readonly EyeSpec[]>> = {
  0: [
    { x: -5, y: 33, tilt: 16, rx: 1.9, ry: 1 },
    { x: 5, y: 32, tilt: -12, rx: 1.9, ry: 1 },
  ],
  1: [
    { x: -5, y: 33, tilt: 0, rx: 1.8, ry: 1.8 },
    { x: 5, y: 33, tilt: 0, rx: 1.8, ry: 1.8 },
  ],
  2: [
    { x: -5, y: 33, tilt: 38, rx: 2.4, ry: 0.6 },
    { x: 5, y: 33, tilt: -38, rx: 2.4, ry: 0.6 },
  ],
  3: [
    { x: -5, y: 33, tilt: 16, rx: 2.4, ry: 1.3 },
    { x: 5, y: 32, tilt: -12, rx: 1.4, ry: 0.7 },
  ],
  4: [
    { x: -7, y: 33, tilt: 16, rx: 1.9, ry: 1 },
    { x: 7, y: 32, tilt: -12, rx: 1.9, ry: 1 },
  ],
};

/** Scale, tilt and eye style of one Variant (design "Variants"). */
export interface Variant {
  scale: number;
  /** Degrees, clockwise, about the centre of the ghost box. */
  tilt: number;
  /** Key of `EYE_STYLES`. */
  eyes: VariantNumber;
}
/** The same five Variants for all three types, so the size order of 5.6 holds at each. */
export const VARIANTS: Readonly<Record<VariantNumber, Variant>> = {
  0: { scale: 1, tilt: 0, eyes: 0 },
  1: { scale: 0.82, tilt: -12, eyes: 1 },
  2: { scale: 1.12, tilt: 7, eyes: 2 },
  3: { scale: 0.92, tilt: 14, eyes: 3 },
  4: { scale: 1.05, tilt: -7, eyes: 4 },
};
/**
 * The eyes are drawn twice the reference size: the ghosts are about a quarter
 * of the reference size on the stage, and the eyes must still read.
 */
const EYE_BOOST = 2;
/** Radius of the soft glow circle behind each eye. */
const REF_EYE_GLOW = 2.8;
/** The cold lantern of the Lantern_Wraith, hanging from the reaching claw. */
const REF_LANTERN_HANGER = "M64 128 L64 144";
const REF_LANTERN =
  "M57 144 L71 144 L69 148 L69 164 L72 167 L56 167 L59 164 L59 148 Z";
/** The dark iron shackles of the Chained_Brute, on both wrists. */
const REF_SHACKLES =
  "M58 124 L72 124 L72 130 L58 130 Z M-50 152 L-38 152 L-38 158 L-50 158 Z";
/** [cx, cy, rx] of each chain link; every link is 3.6 tall. */
// prettier-ignore
const REF_CHAIN_LINKS = [
  [65, 134, 1.4], [65.8, 140, 2.4], [66.4, 146, 1.4], [66.5, 152, 2.4],
  [66, 158, 1.4], [65.2, 164, 2.4], [64.3, 170, 1.4], [63.7, 176, 2.4],
  [63.5, 182, 1.4], [63.8, 188, 2.4], [64.6, 194, 1.4], [65.5, 200, 2.4],
  [-44, 162, 1.4], [-43.2, 168, 2.4], [-42.6, 174, 1.4], [-42.5, 180, 2.4],
  [-43, 186, 1.4], [-43.8, 192, 2.4], [-44.7, 198, 1.4], [-45.3, 204, 2.4],
  [-45.5, 210, 1.4],
] as const;
/** The glow behind the body, from the reference: centre and radii. */
const REF_GLOW = { cx: 0, cy: 80, rx: 90, ry: 130 } as const;

/**
 * Scale of each type from reference units to local units. The Wisp is the
 * plain shape and the smallest; the Chained_Brute is stretched wider, as in
 * the reference (1.8 : 1.4).
 */
export const GHOST_REF_SCALE: Readonly<
  Record<GhostType, readonly [number, number]>
> = {
  wisp: [0.3125, 0.3125],
  "lantern-wraith": [0.5, 0.5],
  "chained-brute": [0.625, 0.5],
};

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Reference point to local point: shifted so the silhouette starts at 0, 0. */
function at(type: GhostType, x: number, y: number): [number, number] {
  const [sx, sy] = GHOST_REF_SCALE[type];
  return [round2((x + REF_ORIGIN[0]) * sx), round2((y + REF_ORIGIN[1]) * sy)];
}

/** Absolute reference path data (only x, y pairs) in local units. */
function fit(type: GhostType, d: string): string {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? "";
    if (/^[A-Za-z]$/.test(token)) {
      out.push(token);
      continue;
    }
    const [x, y] = at(type, Number(token), Number(tokens[i + 1] ?? 0));
    out.push(`${x} ${y}`);
    i += 1;
  }
  return out.join(" ").replace(/([A-Za-z]) /g, "$1");
}

export const GHOST_TYPES: Readonly<Record<GhostType, GhostTypeSpec>> = {
  wisp: spec("wisp", "wisp-float"),
  "lantern-wraith": spec("lantern-wraith", "wraith-sway"),
  "chained-brute": spec("chained-brute", "brute-heave"),
};

function spec(type: GhostType, idle: string): GhostTypeSpec {
  const box = GHOST_BOX[type];
  return {
    box,
    eyeHeight:
      2 *
      round2(
        (EYE_STYLES[0][0]?.ry ?? 1) * EYE_BOOST * GHOST_REF_SCALE[type][1],
      ),
    idle,
  };
}

/** The cold lantern: hanger, pale light, dark frame and a cold flame. */
function lantern(id: (name: string) => string): ShapeNode {
  const t: GhostType = "lantern-wraith";
  const [cx, cy] = at(t, 64, 158);
  const [fx, fy] = at(t, 64, 157);
  const [sx, sy] = GHOST_REF_SCALE[t];
  return g(
    "ghost-lantern",
    [
      strokePath("lantern-hanger", fit(t, REF_LANTERN_HANGER)),
      circle("lantern-light", cx, cy, round2(26 * sx), {
        paint: id("lantern"),
      }),
      path("lantern-frame", fit(t, REF_LANTERN), { part: "lantern-frame" }),
      ellipse("lantern-halo", cx, cy, round2(7 * sx), round2(10 * sy), {
        paint: id("lantern"),
      }),
      ellipse("lantern-flame", fx, fy, round2(3.5 * sx), round2(6 * sy)),
    ],
    { part: "lantern" },
  );
}

/** Dark iron shackles on both wrists and two hanging chains. */
function shackles(): ShapeNode[] {
  const t: GhostType = "chained-brute";
  const [sx, sy] = GHOST_REF_SCALE[t];
  return [
    path("ghost-shackle", fit(t, REF_SHACKLES), { part: "shackles" }),
    g(
      "ghost-chain",
      REF_CHAIN_LINKS.map(([x, y, rx]) => {
        const [cx, cy] = at(t, x, y);
        return ellipse(
          "chain-link",
          cx,
          cy,
          round2(rx * sx),
          round2(3.6 * sy),
          {
            fill: "none",
          },
        );
      }),
      { part: "chain" },
    ),
  ];
}

/**
 * The Variant's scale and tilt as one transform that keeps the centre of the
 * ghost box where it is (translate, then rotate, then scale), or `undefined`
 * for the identity.
 */
function variantTransform(
  type: GhostType,
  variant: VariantNumber,
): NonNullable<ShapeNode["transform"]> | undefined {
  const { scale, tilt } = VARIANTS[variant];
  if (scale === 1 && tilt === 0) return undefined;
  const { w, h } = GHOST_BOX[type];
  const [px, py] = [w / 2, h / 2];
  const angle = (tilt * Math.PI) / 180;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  return {
    translate: [
      round2(px - scale * (cos * px - sin * py)),
      round2(py - scale * (sin * px + cos * py)),
    ],
    rotate: tilt,
    scale,
  };
}

/**
 * The drawing of one ghost at one of the five Variants. The `locked` look
 * keeps the glow like the haunted one, so the ghost reads inside its Cloche
 * (director's decision, 19 Nov, which overrides design "Ghost states").
 *
 * Structure (design "Art System"): `g.ghost` > the static glow, then
 * `g.ghost-idle`, the only part the idle animation moves. A ghost floats, so
 * it casts no shadow (director's decision, 18 Nov).
 */
export function ghostArt(
  type: GhostType,
  variant: VariantNumber,
  look: "haunted" | "locked",
): ShapeNode {
  const id = (name: string): string => `${type}-${variant}-${name}`;
  const [sx, sy] = GHOST_REF_SCALE[type];

  const [gx, gy] = at(type, REF_GLOW.cx, REF_GLOW.cy);
  const eyes = EYE_STYLES[VARIANTS[variant].eyes].flatMap((eye) => {
    const [cx, cy] = at(type, eye.x, eye.y);
    return [
      circle("ghost-eye-glow", cx, cy, round2(REF_EYE_GLOW * EYE_BOOST * sx), {
        paint: id("eye"),
      }),
      ellipse(
        "ghost-eye",
        0,
        0,
        round2(eye.rx * EYE_BOOST * sx),
        round2(eye.ry * EYE_BOOST * sy),
        { part: "eye", transform: { translate: [cx, cy], rotate: eye.tilt } },
      ),
    ];
  });
  const transform = variantTransform(type, variant);
  const extra =
    type === "lantern-wraith"
      ? [lantern(id)]
      : type === "chained-brute"
        ? shackles()
        : [];
  const lanternGlow =
    type === "lantern-wraith"
      ? [
          gradient("radialGradient", id("lantern"), [
            ["stop-lantern-0", 0],
            ["stop-lantern-1", 1],
          ]),
        ]
      : [];
  // The Locked look keeps the glow: the trapped ghost must read inside the jar.
  const glow = [
    g(
      "ghost-glow",
      [
        ellipse(
          "glow",
          gx,
          gy,
          round2(REF_GLOW.rx * sx),
          round2(REF_GLOW.ry * sy),
          { paint: id("glow") },
        ),
      ],
      { part: "glow" },
    ),
  ];
  const tree = g(`ghost ghost--${type} look-${look}`, [
    defs([
      gradient("radialGradient", id("glow"), [
        ["stop-cold-0", 0],
        ["stop-cold-1", 1],
      ]),
      gradient("radialGradient", id("eye"), [
        ["stop-eye-0", 0],
        ["stop-eye-1", 1],
      ]),
      // Pale blue-white at the hood, fading to nothing at the robe points.
      gradient(
        "linearGradient",
        id("body"),
        [
          ["stop-spectre-0", 0],
          ["stop-spectre-1", 0.3],
          ["stop-spectre-2", 0.75],
          ["stop-spectre-3", 1],
        ],
        { x1: 0, y1: 0, x2: 0, y2: 1 },
      ),
      ...lanternGlow,
    ]),
    ...glow,
    g("ghost-idle", [
      g(
        "ghost-outline",
        [
          path("ghost-body", fit(type, REF_BODY), {
            part: "hooded-robe",
            paint: id("body"),
          }),
          path("ghost-arm", fit(type, REF_ARMS), {
            part: "arm",
            paint: id("body"),
          }),
        ],
        { part: "outline" },
      ),
      strokePath("ghost-fold", fit(type, REF_FOLDS)),
      path("ghost-face", fit(type, REF_FACE), { part: "face" }),
      ...eyes,
      ...extra,
    ]),
  ]);
  return transform === undefined ? tree : { ...tree, transform };
}
