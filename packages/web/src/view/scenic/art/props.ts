import type { Floor } from "@haunted-repo/core";
import type { SlotPlacement } from "../model/sceneLayout.js";
import { GHOST_TYPES, ghostArt } from "./ghosts.js";
import {
  ellipse,
  g,
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
