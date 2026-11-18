import type { Floor } from "@haunted-repo/core";
import type { SlotPlacement } from "../model/sceneLayout.js";
import { GHOST_TYPES, ghostArt } from "./ghosts.js";
import { ellipse, g, rect, strokePath, type ShapeNode } from "./shapes.js";

/** A ghost floats: its box ends this many units above the slot bottom (at floor scale 1). */
const GHOST_LIFT = 10;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The ghost of a Haunted slot, of its floor's Ghost_Type, scaled by the floor
 * factor, centred in the slot and floating over its bottom edge. Until task
 * 9.2 every Card uses Variant 0 (decision Q15).
 */
function slotGhost(slot: SlotPlacement): ShapeNode {
  const k = slot.ghostScale;
  const { box } = GHOST_TYPES[slot.ghostType];
  const x = round2(slot.rect.x + (slot.rect.w - box.w * k) / 2);
  const y = round2(slot.rect.y + slot.rect.h - GHOST_LIFT * k - box.h * k);
  // The phase class starts each idle loop at another point, so neighbours never float in step.
  return g(
    `slot-ghost ghost-phase-${slot.index % 4}`,
    [ghostArt(slot.ghostType, 0, "haunted")],
    {
      transform: { translate: [x, y], scale: round2(k) },
    },
  );
}

/**
 * One Ghost_Slot: for a Haunted Card, its floor's ghost. There is no window
 * in the slot any more (director's decision, 18 Nov, which supersedes
 * Requirement 12.5): the Exorcised state will be shown by the ghost's own
 * exorcised look (task 9.3), so until then Locked and Exorcised Cards draw
 * nothing (decision Q15).
 */
export function slotArt(slot: SlotPlacement): ShapeNode {
  const children: ShapeNode[] = [];
  if (slot.state === "haunted") {
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
