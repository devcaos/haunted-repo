import type { Floor } from "@haunted-repo/core";
import { TEXTS } from "../../../logic/texts.js";
import type {
  GhostCardView,
  GhostState,
  ViewModel,
} from "../../../logic/viewModel.js";

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
// The floors of the scene illustration (asset units x 10/9). The attic
// rectangle is the box around its triangle (art/house.ts ATTIC_TRIANGLE).
export const FLOOR_RECT: Readonly<Record<Floor, Rect>> = {
  attic: { x: 437, y: 173, w: 637, h: 300 },
  "middle floor": { x: 418, y: 496, w: 675, h: 200 },
  basement: { x: 418, y: 718, w: 675, h: 195 },
};

/**
 * The band of each floor where Ghost_Slots sit; always inside its floor
 * rectangle. The attic band stays under the roof slopes, the middle-floor
 * band starts right of the telephone, the basement band lies between the
 * boiler and the stairs.
 */
export const SLOT_BAND: Readonly<Record<Floor, Rect>> = {
  attic: { x: 570, y: 370, w: 370, h: 100 },
  "middle floor": { x: 640, y: 515, w: 430, h: 170 },
  basement: { x: 555, y: 740, w: 315, h: 160 },
};

/** Natural size (Variant 0) of each ghost box, in viewBox units. */
export const GHOST_BOX: Readonly<Record<GhostType, { w: number; h: number }>> =
  {
    wisp: { w: 56, h: 88 },
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

export interface FloorButtonView {
  floor: Floor;
  label: string;
  accessibleName: string;
}

export interface NameplateView {
  index: number;
  path: string;
  reason: string;
  scoreLine: string; // TEXTS.scoreLine(score)
  stateLabel: string; // TEXTS.ghostStateLabels[state]
  state: GhostState;
  lockedLine: string | null;
  hasStart: boolean; // canStart and the first Card with this path on this floor
  accessibleName: string; // TEXTS.nameplateName(...)
}

export type Frame =
  | { kind: "house" }
  | { kind: "floor"; floor: Floor }
  | { kind: "slot"; rect: Rect }; // the Ghost_Scene: zoom into the ghost's slot

export interface SceneLayout {
  heading: string; // Scene_Heading text
  slots: SlotPlacement[]; // [] when the scene is a ghost or house is null
  emptyFloors: Floor[]; // floors drawn with a chained door
  dimmedFloors: Floor[]; // the two other floors in a Floor_Scene
  floorButtons: FloorButtonView[]; // one per go-to-floor entry, floor order
  backButton: boolean; // go-to-house is available
  nameplates: NameplateView[]; // Floor_Scene only: focused floor, report order
  emptyLine: string | null; // the focused floor's emptyLine in a Floor_Scene
  startControls: string[]; // paths with a start control (Floor_Scene only)
  telephoneTarget: string | null; // first startable Card: floor order, then report order
  finale: boolean;
  frame: Frame;
  closeUp: { ghostType: GhostType; variant: VariantNumber } | null; // Ghost_Scene only
}

const FLOOR_ORDER: readonly Floor[] = ["attic", "middle floor", "basement"];

function variantOf(index: number): VariantNumber {
  return (index % 5) as VariantNumber;
}

function hasAction(model: ViewModel, type: string): boolean {
  return model.available.some((entry) => entry.type === type);
}

function nameplatesOf(
  title: string,
  cards: readonly GhostCardView[],
): NameplateView[] {
  const seen = new Set<string>();
  return cards.map((card, index): NameplateView => {
    const first = !seen.has(card.path);
    seen.add(card.path);
    const stateLabel = TEXTS.ghostStateLabels[card.state];
    return {
      index,
      path: card.path,
      reason: card.reason,
      scoreLine: TEXTS.scoreLine(card.score),
      stateLabel,
      state: card.state,
      lockedLine: card.lockedLine,
      hasStart: card.canStart && first,
      accessibleName: TEXTS.nameplateName(
        card.path,
        title,
        card.score,
        stateLabel,
        card.lockedLine,
      ),
    };
  });
}

/** Everything the stage and the controls draw, decided from the ViewModel alone. */
export function sceneLayout(model: ViewModel): SceneLayout {
  const { scene, house } = model;
  const floors = house?.floors ?? null;
  const showSlots = floors !== null && scene.kind !== "ghost";

  const slots: SlotPlacement[] = [];
  if (floors !== null && showSlots) {
    for (const view of floors) {
      const rects = slotRects(view.floor, view.ghosts.length);
      const ghostScale = floorGhostScale(view.floor, view.ghosts.length);
      view.ghosts.forEach((card, index) => {
        const rect = rects[index];
        if (rect === undefined) return;
        slots.push({
          key: `${view.floor}#${index}`,
          floor: view.floor,
          index,
          variant: variantOf(index),
          ghostType: GHOST_TYPE_OF[view.floor],
          path: card.path,
          state: card.state,
          rect,
          ghostScale,
        });
      });
    }
  }

  const focused =
    scene.kind === "floor" && floors !== null
      ? (floors.find((view) => view.floor === scene.floor) ?? null)
      : null;
  const nameplates =
    focused === null ? [] : nameplatesOf(focused.title, focused.ghosts);

  let telephoneTarget: string | null = null;
  for (const view of floors ?? []) {
    const card = view.ghosts.find((c) => c.canStart);
    if (card !== undefined) {
      telephoneTarget = card.path;
      break;
    }
  }

  const cards = (floors ?? []).flatMap((view) => view.ghosts);
  const finale =
    house !== null &&
    house.source === "sample" &&
    cards.every((card) => card.state !== "haunted") &&
    cards.some((card) => card.state === "exorcised") &&
    scene.kind !== "ghost";

  const floorButtons: FloorButtonView[] = (floors ?? [])
    .filter((view) =>
      model.available.some(
        (entry) => entry.type === "go-to-floor" && entry.floor === view.floor,
      ),
    )
    .map((view) => ({
      floor: view.floor,
      label: view.title,
      accessibleName: TEXTS.floorButtonName(
        view.title,
        TEXTS.actionLabels["go-to-floor"],
      ),
    }));

  let heading: string = TEXTS.pageTitle;
  let frame: Frame = { kind: "house" };
  let closeUp: SceneLayout["closeUp"] = null;
  if (scene.kind === "house") {
    if (house !== null) heading = TEXTS.houseHeading(house.repoName);
  } else if (scene.kind === "floor") {
    heading = focused?.title ?? TEXTS.floorTitles[scene.floor];
    frame = { kind: "floor", floor: scene.floor };
  } else {
    const path = model.ghost?.path ?? scene.path;
    const floor = model.ghost?.floor ?? scene.floor;
    heading = TEXTS.ghostHeading(path);
    const view = floors?.find((v) => v.floor === floor);
    const index = view?.ghosts.findIndex((card) => card.path === path) ?? -1;
    const rect =
      index >= 0
        ? slotRects(floor, view?.ghosts.length ?? 0)[index]
        : undefined;
    frame =
      rect === undefined ? { kind: "floor", floor } : { kind: "slot", rect };
    closeUp = {
      ghostType: GHOST_TYPE_OF[floor],
      variant: index >= 0 ? variantOf(index) : 0,
    };
  }

  const inHouse = scene.kind !== "ghost" && floors !== null;
  return {
    heading,
    slots,
    emptyFloors: inHouse
      ? floors.filter((v) => v.emptyLine !== null).map((v) => v.floor)
      : [],
    dimmedFloors:
      scene.kind === "floor"
        ? FLOOR_ORDER.filter((floor) => floor !== scene.floor)
        : [],
    floorButtons,
    backButton: hasAction(model, "go-to-house"),
    nameplates,
    emptyLine: focused?.emptyLine ?? null,
    startControls: nameplates.filter((n) => n.hasStart).map((n) => n.path),
    telephoneTarget,
    finale,
    frame,
    closeUp,
  };
}
