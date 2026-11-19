import "../styles/scenic-tokens.css";
import "../styles/base.css";
import "../styles/ghosts.css";
import "../styles/motion.css";
import "../styles/gallery.css";
import { slotArt } from "../art/props.js";
import { el } from "../dom.js";
import { loadScenicFonts } from "../fonts.js";
import {
  GHOST_TYPE_OF,
  SLOT_BAND,
  floorGhostScale,
  slotRects,
  type GhostType,
  type SlotPlacement,
  type VariantNumber,
} from "../model/sceneLayout.js";
import { createSvgRoot, mountShape } from "../svg.js";
import type { GhostState } from "../../../logic/viewModel.js";
import type { Floor } from "@haunted-repo/core";

// Dev-only page (design "Gallery"): it is never built, because the build input
// stays index.html. It draws 3 Ghost_Types x 5 Variants x 3 states with the
// same slot drawings the house uses, at the size of a slot with 3 Cards.

loadScenicFonts();
document.documentElement.setAttribute("data-motion", "still");

const NAMES: Readonly<Record<GhostType, string>> = {
  wisp: "Wisp",
  "lantern-wraith": "Lantern_Wraith",
  "chained-brute": "Chained_Brute",
};
const FLOOR_OF: Readonly<Record<GhostType, Floor>> = {
  wisp: "attic",
  "lantern-wraith": "middle floor",
  "chained-brute": "basement",
};
const STATES: readonly { state: GhostState; label: string }[] = [
  { state: "haunted", label: "Haunted" },
  { state: "locked", label: "Locked" },
  { state: "exorcised", label: "Exorcised" },
];
const VARIANTS_SHOWN: readonly VariantNumber[] = [0, 1, 2, 3, 4];
/** Room around a slot for the glow and the light of the candle. */
const MARGIN = { x: 12, top: 12, bottom: 36 };

function cell(
  type: GhostType,
  variant: VariantNumber,
  { state, label }: (typeof STATES)[number],
): HTMLElement {
  const floor = FLOOR_OF[type];
  const first = slotRects(floor, 3)[0];
  const w = first?.w ?? 100;
  const h = SLOT_BAND[floor].h;
  const slot: SlotPlacement = {
    key: `${floor}#${variant}`,
    floor,
    index: variant,
    variant,
    ghostType: GHOST_TYPE_OF[floor],
    path: "gallery",
    state,
    rect: { x: 0, y: 0, w, h },
    ghostScale: floorGhostScale(floor, 3),
  };
  const svg = createSvgRoot(
    {
      x: -MARGIN.x,
      y: -MARGIN.top,
      w: w + 2 * MARGIN.x,
      h: h + MARGIN.top + MARGIN.bottom,
    },
    "gallery-art",
  );
  svg.append(mountShape(slotArt(slot), `gallery-${type}-${variant}-${state}-`));
  return el("figure", { class: "gallery-cell" }, [
    svg,
    el("figcaption", {}, [`V${variant} ${label}`]),
  ]);
}

function section(type: GhostType): HTMLElement {
  // Each column is one Variant; its three cells are the three states.
  const cells = VARIANTS_SHOWN.flatMap((variant) =>
    STATES.map((state) => cell(type, variant, state)),
  );
  return el("section", { class: "gallery-type" }, [
    el("h2", {}, [NAMES[type]]),
    el("div", { class: "gallery-grid" }, cells),
  ]);
}

const root = document.getElementById("gallery");
if (root === null) {
  throw new Error("Gallery page is missing #gallery");
}
root.append(
  el("main", { class: "gallery" }, [
    el("h1", {}, ["Ghost gallery"]),
    el(
      "div",
      { class: "gallery-types" },
      (["wisp", "lantern-wraith", "chained-brute"] as const).map(section),
    ),
  ]),
);
