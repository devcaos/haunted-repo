import type { Floor } from "@haunted-repo/core";
import type { ActionSink } from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import type {
  FloorView,
  GhostCardView,
  HouseView,
  ViewModel,
  WarningsView,
} from "../../logic/viewModel.js";
import type { AssetSlotId } from "../assets/manifest.js";
import { resolveSlot } from "../assets/resolve.js";
import { el } from "./dom.js";

const SCENE_SLOT: Record<Floor, AssetSlotId> = {
  attic: "scene.attic",
  "middle floor": "scene.middle-floor",
  basement: "scene.basement",
};

/** Images of a slot when it has layers; nothing when it falls back. */
function slotImages(id: AssetSlotId): HTMLImageElement[] {
  const slot = resolveSlot(id);
  if (slot.kind === "fallback") return [];
  return slot.layers.map((layer) =>
    el("img", { src: layer.url, alt: layer.alt }),
  );
}

/** The ghost picture, or its state as a text label (the fallback of every ghost slot). */
function ghostStateNodes(card: GhostCardView): HTMLElement[] {
  const slot = resolveSlot(`ghost.${card.state}`);
  if (slot.kind === "layers") {
    return slot.layers.map((layer) =>
      el("img", { src: layer.url, alt: layer.alt }),
    );
  }
  if (slot.fallback === "text-label") {
    return [el("p", { class: "state" }, [TEXTS.ghostStateLabels[card.state]])];
  }
  return [];
}

function renderCard(card: GhostCardView): HTMLElement {
  const children: HTMLElement[] = [
    el("p", {}, [el("code", { class: "path" }, [card.path])]),
    el("p", { class: "score" }, [TEXTS.scoreLine(card.score)]),
    el("p", { class: "reason" }, [card.reason]),
    ...ghostStateNodes(card),
  ];
  if (card.lockedLine !== null) {
    children.push(el("p", { class: "locked-line" }, [card.lockedLine]));
  }
  return el(
    "li",
    { class: "ghost-card", "data-ghost-state": card.state },
    children,
  );
}

function renderFloor(floor: FloorView): HTMLElement {
  const children: HTMLElement[] = [
    ...slotImages(SCENE_SLOT[floor.floor]),
    el("h3", {}, [floor.title]),
  ];
  if (floor.emptyLine !== null) {
    children.push(el("p", { class: "empty" }, [floor.emptyLine]));
  }
  if (floor.ghosts.length > 0) {
    children.push(el("ul", {}, floor.ghosts.map(renderCard)));
  }
  return el("section", { class: "floor", "data-floor": floor.floor }, children);
}

function renderWarnings(warnings: WarningsView): HTMLElement | null {
  if (warnings.lines.length === 0 && warnings.skippedTitle === null) {
    return null;
  }
  const children: HTMLElement[] = warnings.lines.map((line) =>
    el("p", {}, [line]),
  );
  if (warnings.skippedTitle !== null) {
    children.push(el("p", {}, [warnings.skippedTitle]));
    children.push(
      el(
        "ul",
        {},
        warnings.skipped.map((file) =>
          el("li", {}, [el("code", {}, [file.path]), ` (${file.reason})`]),
        ),
      ),
    );
  }
  return el("div", { class: "report-warnings" }, children);
}

/** The Ghost_List: a heading, the report warnings, the live-report line and the three floors. */
export function renderHouse(
  model: ViewModel,
  onAction: ActionSink,
): HTMLElement {
  void onAction; // PR 2 adds the start button of each card
  const house: HouseView | null = model.house;
  if (house === null) return el("div", { class: "ghost-list" });
  const children: HTMLElement[] = [
    ...slotImages("scene.house"),
    el("h2", {}, [TEXTS.houseHeading(house.repoName)]),
  ];
  const warnings = renderWarnings(house.warnings);
  if (warnings !== null) children.push(warnings);
  if (house.powerLine !== null) {
    children.push(el("p", { class: "power-line" }, [house.powerLine]));
  }
  children.push(...house.floors.map(renderFloor));
  return el("div", { class: "ghost-list" }, children);
}
