import type { Floor } from "@haunted-repo/core";
import {
  GHOST_BOX,
  SLOT_BAND,
  type SlotPlacement,
} from "../model/sceneLayout.js";
import { ghostArt } from "./ghosts.js";
import {
  circle,
  defs,
  ellipse,
  g,
  gradient,
  rect,
  strokePath,
  type ShapeNode,
} from "./shapes.js";

/** Size of the back-wall window ("pane") of a slot on each floor ("Slot layout rule"). */
const PANE_SIZE: Readonly<Record<Floor, { w: number; h: number }>> = {
  attic: { w: 30, h: 40 },
  "middle floor": { w: 34, h: 48 },
  basement: { w: 32, h: 36 },
};
/** Gap between the slot top and the pane top. */
const PANE_TOP = 4;
/** Width of the pane frame around the glass. */
const PANE_FRAME = 3;
/** Local y of the Wisp's floor shadow, which sits this far above the slot bottom. */
const SHADOW_Y = 72;
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
  const glass = rect(
    "pane-glass",
    x + PANE_FRAME,
    y + PANE_FRAME,
    w - 2 * PANE_FRAME,
    h - 2 * PANE_FRAME,
  );
  const midX = round2(x + w / 2);
  const midY = round2(y + h / 2);
  const bars = strokePath(
    "pane-bars",
    `M${midX} ${y + PANE_FRAME} V${y + h - PANE_FRAME} M${x + PANE_FRAME} ${midY} H${round2(x + w - PANE_FRAME)}`,
  );
  const frame = rect("pane-frame", x, y, w, h);
  if (!lit) return g("pane pane-unlit", [frame, glass, bars]);
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
      frame,
      glass,
      bars,
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
  const y = round2(slot.rect.y + slot.rect.h - SHADOW_LIFT - SHADOW_Y * k);
  return g("slot-ghost", [ghostArt("wisp", 0, "haunted")], {
    transform: { translate: [x, y], scale: round2(k) },
  });
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
 * The chained door of a floor with no Card, centred in its slot band: 70 wide,
 * the band height minus 10. A Rust door, two Mist chains crossing in an X and
 * an iron hook. It has no padlock, so it never looks like a Locked ghost
 * (Requirement 8.6).
 */
export function chainedDoorArt(floor: Floor): ShapeNode {
  const band = SLOT_BAND[floor];
  const x = round2(band.x + (band.w - DOOR_WIDTH) / 2);
  const y = band.y + 5;
  const h = band.h - 10;
  const right = x + DOOR_WIDTH;
  const midX = round2(x + DOOR_WIDTH / 2);
  const midY = round2(y + h / 2);
  return g(
    "chained-door",
    [
      rect("door-panel", x, y, DOOR_WIDTH, h, { rx: 4 }),
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
