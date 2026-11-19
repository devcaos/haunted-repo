import type { Floor } from "@haunted-repo/core";
import type { SlotPlacement } from "../model/sceneLayout.js";
import { GHOST_REF_SCALE, GHOST_TYPES, ghostArt } from "./ghosts.js";
import {
  circle,
  defs,
  ellipse,
  g,
  gradient,
  path,
  rect,
  strokePath,
  type ShapeNode,
} from "./shapes.js";

/** A ghost floats: its box ends this many units above the slot bottom (at floor scale 1). */
const GHOST_LIFT = 10;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The ghost of a Haunted slot, of its floor's Ghost_Type and its own Variant,
 * scaled by the floor factor, centred in the slot and floating over its
 * bottom edge.
 */
function slotGhost(slot: SlotPlacement): ShapeNode {
  const k = slot.ghostScale;
  const { box } = GHOST_TYPES[slot.ghostType];
  const x = round2(slot.rect.x + (slot.rect.w - box.w * k) / 2);
  const y = round2(slot.rect.y + slot.rect.h - GHOST_LIFT * k - box.h * k);
  // The phase class starts each idle loop at another point, so neighbours never float in step.
  return g(
    `slot-ghost ghost-phase-${slot.index % 4}`,
    [ghostArt(slot.ghostType, slot.variant, "haunted")],
    {
      transform: { translate: [x, y], scale: round2(k) },
    },
  );
}

// The Cloche, the padlock and the candle are ported from a reference sheet
// drafted with Claude and declared, like `ghost-reference.svg` (director's
// decision, 19 Nov; the reference is not in the repository). Their numbers are
// in the units of the ghost reference art (`REF_*` in ghosts.ts), so one
// transform places them in a slot. Colours come only from CSS classes.

/** Round to 4 decimals: scale factors need more than `round2`. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** What the Locked drawing covers, in reference units (`cx` is the Cloche's centre line). */
export const CLOCHE_EXTENT = { x1: -96, y1: -57, x2: 112, y2: 356, cx: 8 };
/** One Cloche size on every floor, in slot units per reference unit. */
const CLOCHE_SCALE = 0.27;
/** What the Exorcised candle covers, in reference units: flame top to holder foot. */
export const CANDLE_EXTENT = { x1: -30, y1: 192, x2: 30, y2: 308 };
/** The ghost silhouette in the same units: its left edge, top and width. */
const GHOST_REF = { x: -54, y: -10, w: 124 };

/** The bell jar with its Brass base and the knob; the same for every Locked Card. */
function clocheArt(): ShapeNode {
  return g(
    "cloche",
    [
      defs([
        gradient(
          "linearGradient",
          "cloche-glass",
          [
            ["stop-glass-edge", 0],
            ["stop-glass-mid", 0.5],
            ["stop-glass-edge", 1],
          ],
          { x1: 0, y1: 0, x2: 1, y2: 0 },
        ),
        gradient(
          "linearGradient",
          "cloche-brass",
          [
            ["stop-brass-light", 0],
            ["stop-brass-dark", 1],
          ],
          { x1: 0, y1: 0, x2: 0, y2: 1 },
        ),
      ]),
      path(
        "cloche-dome",
        "M-82 278 L-82 70 C-82 -6 -44 -40 8 -40 C60 -40 98 -6 98 70 L98 278 Z",
        { paint: "cloche-glass" },
      ),
      strokePath("cloche-sheen-wide", "M-64 230 L-64 74 C-64 30 -46 4 -18 -14"),
      strokePath("cloche-sheen-thin", "M84 120 L84 210"),
      circle("cloche-knob", 8, -48, 9),
      rect("cloche-base", -96, 276, 208, 14, { rx: 4, paint: "cloche-brass" }),
      rect("cloche-base-foot", -86, 290, 188, 8, { rx: 3 }),
    ],
    { part: "cloche" },
  );
}

/** The Brass padlock on the base plate. */
function padlockArt(): ShapeNode {
  return g(
    "padlock",
    [
      strokePath(
        "padlock-shackle",
        "M-10 0 L-10 -10 C-10 -24 10 -24 10 -10 L10 0",
      ),
      rect("padlock-body", -16, -2, 32, 26, { rx: 4 }),
      circle("padlock-keyhole", 0, 8, 3.5),
      path("padlock-keyhole", "M-1.5 9 L1.5 9 L2.5 17 L-2.5 17 Z"),
    ],
    { part: "padlock", transform: { translate: [8, 283] } },
  );
}

/**
 * A Locked Card: its own ghost, still and a little dim (the `look-locked`
 * look), inside the Cloche on a wooden pedestal with a contact shadow and a
 * cold light trapped in the glass, standing on the slot bottom. One transform
 * turns reference units into slot units. The Cloche has one size on every
 * floor and is made smaller only if it would not fit the slot.
 */
function lockedArt(slot: SlotPlacement): ShapeNode {
  const [sx, sy] = GHOST_REF_SCALE[slot.ghostType];
  const { x1, y1, x2, y2, cx } = CLOCHE_EXTENT;
  const c = round4(
    Math.min(CLOCHE_SCALE, slot.rect.h / (y2 - y1), slot.rect.w / (x2 - x1)),
  );
  const ratio = sx / sy;
  return g(
    "slot-locked",
    [
      defs([
        gradient("radialGradient", "cloche-inner", [
          ["stop-inner-0", 0],
          ["stop-inner-1", 1],
        ]),
      ]),
      ellipse("cloche-contact", 8, 350, 80, 6),
      rect("cloche-pedestal", -38, 298, 92, 40, { rx: 3 }),
      rect("cloche-pedestal-foot", -58, 336, 132, 14, { rx: 3 }),
      ellipse("cloche-inner-light", 8, 140, 92, 150, { paint: "cloche-inner" }),
      // The ghost is drawn in its own units: bring it into reference units, centred in the jar.
      g("locked-ghost", [ghostArt(slot.ghostType, slot.variant, "locked")], {
        transform: {
          translate: [round2(cx - (GHOST_REF.w / 2) * ratio), GHOST_REF.y],
          scale: round4(1 / sy),
        },
      }),
      clocheArt(),
      padlockArt(),
    ],
    {
      transform: {
        translate: [
          round2(slot.rect.x + slot.rect.w / 2 - cx * c),
          round2(slot.rect.y + slot.rect.h - y2 * c),
        ],
        scale: c,
      },
    },
  );
}

/** A small lit candle on the slot bottom with a warm pool of light around it. */
function exorcisedArt(slot: SlotPlacement): ShapeNode {
  const { y1, y2 } = CANDLE_EXTENT;
  // Half the slot height, made smaller only if it would not fit the slot width.
  const s = round4(Math.min((slot.rect.h * 0.5) / (y2 - y1), slot.rect.w / 70));
  const flame = g(
    "flame",
    [
      ellipse("flame-halo", 0, 212, 18, 26, { paint: "flame-halo" }),
      path(
        "flame-outer",
        "M0 192 C6 202 9 210 8 218 C7 225 3 228 0 228 C-3 228 -7 225 -8 218 C-9 210 -5 202 0 192 Z",
        { paint: "flame-body" },
      ),
      path(
        "flame-core",
        "M0 208 C2 213 3 217 2 221 C1 224 -1 224 -2 221 C-3 217 -2 213 0 208 Z",
      ),
    ],
    { part: "flame" },
  );
  return g(
    "slot-exorcised",
    [
      defs([
        gradient("radialGradient", "candle-pool", [
          ["stop-pool-0", 0],
          ["stop-pool-1", 0.35],
          ["stop-pool-2", 1],
        ]),
        gradient(
          "linearGradient",
          "candle-wax",
          [
            ["stop-wax-shade", 0],
            ["stop-wax-light", 0.5],
            ["stop-wax-shade", 1],
          ],
          { x1: 0, y1: 0, x2: 1, y2: 0 },
        ),
        gradient("radialGradient", "flame-halo", [
          ["stop-halo-0", 0],
          ["stop-halo-1", 1],
        ]),
        gradient("radialGradient", "flame-body", [
          ["stop-flame-0", 0],
          ["stop-flame-1", 0.55],
          ["stop-flame-2", 1],
        ]),
      ]),
      ellipse("candle-light", 0, 236, 175, 84, {
        part: "candle-light",
        paint: "candle-pool",
      }),
      g(
        "candle",
        [
          ellipse("candle-holder", 0, 302, 30, 6),
          path(
            "candle-cup",
            "M-30 300 C-30 292 30 292 30 300 L24 304 L-24 304 Z",
          ),
          path(
            "candle-wax",
            "M-12 296 L-12 238 C-12 234 -6 232 0 233 C6 232 12 234 12 238 L12 296 Z",
            { paint: "candle-wax" },
          ),
          path("candle-drip", "M12 240 C15 248 14 258 12 262 Z"),
          strokePath("candle-wick", "M0 233 L0 224"),
          flame,
        ],
        { part: "candle" },
      ),
    ],
    {
      transform: {
        translate: [
          round2(slot.rect.x + slot.rect.w / 2),
          round2(slot.rect.y + slot.rect.h - y2 * s),
        ],
        scale: s,
      },
    },
  );
}

/**
 * One Ghost_Slot. A Haunted Card draws its floor's ghost at its Variant. A
 * Locked Card draws the same ghost still inside the Cloche. An Exorcised
 * Card draws no ghost (Requirement 6.7), only a small lit candle with a warm
 * pool of light (director's decision, 19 Nov). No window is drawn in any slot
 * (director's decision, 18 Nov, which supersedes Requirement 12.5).
 */
export function slotArt(slot: SlotPlacement): ShapeNode {
  const children: ShapeNode[] = [];
  if (slot.state === "haunted") {
    children.push(slotGhost(slot));
  } else if (slot.state === "locked") {
    children.push(lockedArt(slot));
  } else {
    children.push(exorcisedArt(slot));
  }
  return g(`slot slot--${slot.state}`, children);
}
/** Where a door stands on each floor of the scene illustration. */
export const FLOOR_LINE: Readonly<Record<Floor, number>> = {
  attic: 473,
  "middle floor": 696,
  // The painted cellar door ends here (its bottom edge is at y 849).
  basement: 850,
};

/** One chained door: centre, half width, top of the arch and the extra width of its dark surround. */
interface DoorSpec {
  cx: number;
  half: number;
  top: number;
  /** The surround is this much wider than the door on each side. */
  surround: number;
}

/**
 * The chained door of an empty floor. In the basement it matches the door
 * painted in the illustration exactly (x 692 to 774, arch top at y 737, foot
 * at y 850, one unit wider than the painted door on each side), so the
 * painted door does not show around it. Its dark iron surround is wide enough
 * to cover the chain ends the painted door sticks out at both sides (x 680 to
 * 787, y 755 to 838). On the other floors it is 70 wide, under the attic
 * ridge and between the parlour window and the armchair.
 */
const DOORS: Readonly<Record<Floor, DoorSpec>> = {
  attic: { cx: 755, half: 35, top: 383, surround: 6 },
  "middle floor": { cx: 740, half: 35, top: 586, surround: 6 },
  basement: { cx: 733, half: 41, top: 737, surround: 16 },
};
/** Even, so no link sits where the two chains cross: the hook hangs there, never a padlock-like knot. */
const LINKS_PER_CHAIN = 8;

/**
 * The outline of an arched door: straight sides, rounded shoulders and a flat
 * top between them, standing on `bottom`. Absolute commands only.
 */
function archedDoor(
  cx: number,
  half: number,
  top: number,
  bottom: number,
  shoulder: number,
): string {
  const [l, r] = [round2(cx - half), round2(cx + half)];
  return (
    `M${l} ${bottom} V${top + shoulder} Q${l} ${top} ${round2(l + shoulder)} ${top} ` +
    `H${round2(r - shoulder)} Q${r} ${top} ${r} ${top + shoulder} V${bottom} Z`
  );
}

/**
 * One chain of oval links from (x1, y1) to (x2, y2), each link turned along
 * the chain. Every link is dark iron; a faint glint sits inside it, and no
 * link has a light outline.
 */
function chainLinks(x1: number, y1: number, x2: number, y2: number): ShapeNode {
  const angle = round2((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
  const links: ShapeNode[] = [];
  for (let i = 0; i < LINKS_PER_CHAIN; i += 1) {
    const t = (i + 0.5) / LINKS_PER_CHAIN;
    const transform = {
      translate: [
        round2(x1 + (x2 - x1) * t),
        round2(y1 + (y2 - y1) * t),
      ] as const,
      rotate: angle,
    };
    links.push(
      ellipse("door-chain-link", 0, 0, 6, 3.5, { fill: "none", transform }),
      ellipse("door-chain-glint", 0, 0, 3.2, 1.4, { fill: "none", transform }),
    );
  }
  return g("door-chain", links);
}

/**
 * The chained door of a floor with no Card, in the style of the illustration:
 * a dark wooden arched door in a dark iron surround, two dark iron chains
 * crossing in an X and an iron hook, with no light outline. It has no
 * padlock, so it never looks like a Locked ghost (Requirement 8.6).
 */
export function chainedDoorArt(floor: Floor): ShapeNode {
  const { cx, half, top, surround } = DOORS[floor];
  const bottom = FLOOR_LINE[floor];
  const shoulder = Math.min(12, round2(half / 3));
  const outer = half + surround;
  const midY = round2((top + bottom) / 2);
  const [left, right] = [round2(cx - half + 5), round2(cx + half - 5)];
  const [chainTop, chainBottom] = [top + shoulder + 8, bottom - 14];
  return g(
    "chained-door",
    [
      path(
        "door-frame",
        archedDoor(cx, outer, top - 5, bottom, shoulder + surround),
      ),
      path("door-panel", archedDoor(cx, half, top, bottom, shoulder), {
        part: "door-panel",
      }),
      rect("door-threshold", cx - outer - 4, bottom - 4, 2 * (outer + 4), 4),
      strokePath(
        "door-planks",
        `M${cx - 12} ${top + 14} V${bottom - 6} M${cx + 12} ${top + 14} V${bottom - 6}`,
      ),
      chainLinks(left, chainTop, right, chainBottom),
      chainLinks(right, chainTop, left, chainBottom),
      strokePath(
        "door-hook",
        `M${cx} ${midY - 6} V${midY + 4} C${cx} ${midY + 10} ${cx - 8} ${midY + 10} ${cx - 8} ${midY + 4}`,
      ),
    ],
    { part: "chained-door" },
  );
}
