import type { Floor } from "@haunted-repo/core";
import { GHOST_BOX, type SlotPlacement } from "../model/sceneLayout.js";
import { WISP_SHADOW_Y, ghostArt } from "./ghosts.js";
import {
  arch,
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

/** Size of the back-wall window ("pane") of a slot on each floor: gothic, about 1:2. */
const PANE_SIZE: Readonly<Record<Floor, { w: number; h: number }>> = {
  attic: { w: 24, h: 48 },
  "middle floor": { w: 28, h: 56 },
  basement: { w: 22, h: 44 },
};
/** The sill sticks out this far on each side of the pane. */
const SILL_OVERHANG = 4;
/** Gap between the slot top and the pane top. */
const PANE_TOP = 4;
/** Width of the pane frame around the glass. */
const PANE_FRAME = 3;
/** The Wisp's floor shadow sits this far above the slot bottom. */
const SHADOW_LIFT = 4;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The window in the back wall of a slot, centred on it. It is lit (Candle
 * glass and a warm-orange halo) only for an Exorcised Card, and unlit (Slate
 * glass, Mist frame) otherwise (Requirement 12.5). Named "pane" so the art has
 * no DOM name in it.
 */
function pane(slot: SlotPlacement): ShapeNode {
  const { w, h } = PANE_SIZE[slot.floor];
  const x = round2(slot.rect.x + (slot.rect.w - w) / 2);
  const y = slot.rect.y + PANE_TOP;
  const lit = slot.state === "exorcised";
  const midX = round2(x + w / 2);
  const midY = round2(y + h * 0.55);
  const foot = y + h;
  // A pointed arch: frame, glass inside it, a cross of bars, a faint diagonal glint, a wide sill.
  const frame = path("pane-frame", arch(midX, foot, w / 2, h));
  const glass = path(
    "pane-glass",
    arch(midX, foot - PANE_FRAME, w / 2 - PANE_FRAME, h - 2 * PANE_FRAME),
  );
  const inner = round2(x + w - PANE_FRAME);
  const bars = strokePath(
    "pane-bars",
    `M${midX} ${y + PANE_FRAME + 4} V${foot - PANE_FRAME} M${x + PANE_FRAME} ${midY} H${inner}`,
  );
  const glint = strokePath(
    "pane-glint",
    `M${x + PANE_FRAME + 2} ${round2(y + h * 0.8)} L${round2(inner - 2)} ${round2(y + h * 0.45)}`,
  );
  const sill = rect(
    "pane-sill",
    round2(x - SILL_OVERHANG),
    foot,
    w + 2 * SILL_OVERHANG,
    4,
  );
  const parts = [frame, glass, glint, bars, sill];
  if (!lit) return g("pane pane-unlit", parts);
  return g(
    "pane pane-lit",
    [
      defs([
        gradient("radialGradient", "pane-halo", [
          ["stop-warm-0", 0],
          ["stop-warm-1", 1],
        ]),
      ]),
      circle("pane-halo", midX, midY, h, { paint: "pane-halo" }),
      ...parts,
    ],
    { part: "pane-lit" },
  );
}

/**
 * The Wisp of a Haunted attic slot, scaled by the floor factor, centred in the
 * slot and standing on its bottom edge. Until task 9.2 every attic Card uses
 * Variant 0 (decision Q15).
 */
function slotGhost(slot: SlotPlacement): ShapeNode {
  const k = slot.ghostScale;
  const box = GHOST_BOX.wisp;
  const x = round2(slot.rect.x + (slot.rect.w - box.w * k) / 2);
  const y = round2(slot.rect.y + slot.rect.h - SHADOW_LIFT - WISP_SHADOW_Y * k);
  // The phase class starts each idle loop at another point, so neighbours never float in step.
  return g(
    `slot-ghost ghost-phase-${slot.index % 4}`,
    [ghostArt("wisp", 0, "haunted")],
    {
      transform: { translate: [x, y], scale: round2(k) },
    },
  );
}

/**
 * One Ghost_Slot: its back-wall pane and, for a Haunted attic Card, the Wisp.
 * Until task 9.3 middle-floor and basement slots draw only their pane, and
 * Locked or Exorcised attic Cards draw no ghost yet (decision Q15).
 */
export function slotArt(slot: SlotPlacement): ShapeNode {
  const children = [pane(slot)];
  if (slot.floor === "attic" && slot.state === "haunted") {
    children.push(slotGhost(slot));
  }
  return g(`slot slot--${slot.state}`, children);
}

const DOOR_WIDTH = 70;
/** Where a door stands on each floor of the scene illustration. */
export const FLOOR_LINE: Readonly<Record<Floor, number>> = {
  attic: 473,
  "middle floor": 696,
  // The cellar door of the illustration stands on this line, in front of the room's back.
  basement: 852,
};
/**
 * Centre and height of the chained door of an empty floor: under the attic
 * ridge, between the parlour window and the armchair, and in the basement
 * exactly over the painted cellar door (whose padlock it covers, Requirement 8.6).
 */
const DOOR_AT: Readonly<Record<Floor, { cx: number; h: number }>> = {
  attic: { cx: 755, h: 90 },
  "middle floor": { cx: 740, h: 110 },
  basement: { cx: 733, h: 112 },
};
const LINKS_PER_CHAIN = 7;

/** One chain of oval links from (x1, y1) to (x2, y2), each link turned along the chain. */
function chainLinks(x1: number, y1: number, x2: number, y2: number): ShapeNode {
  const angle = round2((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
  const links: ShapeNode[] = [];
  for (let i = 0; i < LINKS_PER_CHAIN; i += 1) {
    const t = (i + 0.5) / LINKS_PER_CHAIN;
    links.push(
      ellipse("door-chain-link", 0, 0, 6, 3.5, {
        fill: "none",
        transform: {
          translate: [round2(x1 + (x2 - x1) * t), round2(y1 + (y2 - y1) * t)],
          rotate: angle,
        },
      }),
    );
  }
  return g("door-chain", links);
}

/**
 * The chained door of a floor with no Card, 70 wide, inside its slot band,
 * in the style of the illustration: a dark wooden door, two dark iron chains
 * crossing in an X and an iron hook, with no light outline. It has no
 * padlock, so it never looks like a Locked ghost (Requirement 8.6).
 */
export function chainedDoorArt(floor: Floor): ShapeNode {
  const { cx, h } = DOOR_AT[floor];
  const x = round2(cx - DOOR_WIDTH / 2);
  // The door stands on its floor, inside a frame, over a stone threshold.
  const y = FLOOR_LINE[floor] - h;
  const right = x + DOOR_WIDTH;
  const midX = round2(x + DOOR_WIDTH / 2);
  const midY = round2(y + h / 2);
  return g(
    "chained-door",
    [
      rect("door-frame", x - 6, y - 6, DOOR_WIDTH + 12, h + 6),
      rect("door-panel", x, y, DOOR_WIDTH, h, { rx: 4 }),
      rect("door-threshold", x - 10, FLOOR_LINE[floor] - 4, DOOR_WIDTH + 20, 4),
      strokePath(
        "door-planks",
        `M${x + 23} ${y + 6} V${y + h - 6} M${x + 47} ${y + 6} V${y + h - 6}`,
      ),
      chainLinks(x + 4, y + 8, right - 4, y + h - 8),
      chainLinks(right - 4, y + 8, x + 4, y + h - 8),
      strokePath(
        "door-hook",
        `M${midX} ${midY - 6} V${midY + 4} C${midX} ${midY + 10} ${midX - 8} ${midY + 10} ${midX - 8} ${midY + 4}`,
      ),
    ],
    { part: "chained-door" },
  );
}
