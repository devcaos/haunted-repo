import type { Floor } from "@haunted-repo/core";
import type { GhostState } from "../../../logic/viewModel.js";

/** The three ghost kinds, one per floor. */
export type GhostType = "wisp" | "lantern-wraith" | "chained-brute";
/** Which of the five looks a Card gets: its position on the floor modulo 5. */
export type VariantNumber = 0 | 1 | 2 | 3 | 4;
/** A rectangle in viewBox units (the viewBox is `0 0 1600 1000`). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Attic holds a Wisp, middle floor a Lantern_Wraith, basement a Chained_Brute. */
export const GHOST_TYPE_OF: Readonly<Record<Floor, GhostType>> = {
  attic: "wisp",
  "middle floor": "lantern-wraith",
  basement: "chained-brute",
};

/** The floor rectangles of the house ("World geometry"). */
export const FLOOR_RECT: Readonly<Record<Floor, Rect>> = {
  attic: { x: 590, y: 330, w: 560, h: 170 },
  "middle floor": { x: 560, y: 500, w: 620, h: 260 },
  basement: { x: 580, y: 760, w: 580, h: 180 },
};

/** The band of each floor where Ghost_Slots sit; always inside its floor rectangle. */
export const SLOT_BAND: Readonly<Record<Floor, Rect>> = {
  attic: { x: 630, y: 395, w: 480, h: 97 },
  "middle floor": { x: 770, y: 545, w: 400, h: 207 },
  basement: { x: 600, y: 790, w: 540, h: 142 },
};

/** Natural size (Variant 0) of each ghost box, in viewBox units. */
export const GHOST_BOX: Readonly<Record<GhostType, { w: number; h: number }>> =
  {
    wisp: { w: 60, h: 64 },
    "lantern-wraith": { w: 72, h: 96 },
    "chained-brute": { w: 96, h: 88 },
  };

/** Space between two neighbouring slots. */
export const SLOT_GAP = 8;
/** A ghost is drawn at most this much bigger than its natural box fits. */
const GHOST_MARGIN = 1.08;

/**
 * Slots of one floor for `count` Cards: equal cells across the slot band, each
 * narrowed by the gap. Every slot lies inside the band, so inside its floor.
 */
export function slotRects(floor: Floor, count: number): Rect[] {
  if (count < 1) return [];
  const band = SLOT_BAND[floor];
  const cell = band.w / count;
  const rects: Rect[] = [];
  for (let j = 0; j < count; j += 1) {
    rects.push({
      x: band.x + j * cell + SLOT_GAP / 2,
      y: band.y,
      w: cell - SLOT_GAP,
      h: band.h,
    });
  }
  return rects;
}

/**
 * The one size factor of a floor, so Variant sizes stay comparable:
 * `min(1, (cell - gap) / (1.08 W), band height / (1.08 H))`.
 */
export function floorGhostScale(floor: Floor, count: number): number {
  if (count < 1) return 1;
  const band = SLOT_BAND[floor];
  const box = GHOST_BOX[GHOST_TYPE_OF[floor]];
  const cell = band.w / count;
  return Math.min(
    1,
    (cell - SLOT_GAP) / (GHOST_MARGIN * box.w),
    band.h / (GHOST_MARGIN * box.h),
  );
}

/** One Ghost_Slot of the stage. */
export interface SlotPlacement {
  key: string; // `${floor}#${index}`: a position, never the path
  floor: Floor;
  index: number; // 0-based position among the Cards of this floor, report order
  variant: VariantNumber; // index % 5
  ghostType: GhostType;
  path: string;
  state: GhostState;
  rect: Rect; // inside the floor rectangle
  ghostScale: number; // the same for every slot of a floor
}
