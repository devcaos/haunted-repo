import "../styles/scenic-tokens.css";
import "../styles/base.css";
import "../styles/ghosts.css";
import "../styles/motion.css";
import "../styles/gallery.css";
import { ghostArt, GHOST_TYPES } from "../art/ghosts.js";
import { el } from "../dom.js";
import { loadScenicFonts } from "../fonts.js";
import type { GhostType } from "../model/sceneLayout.js";
import { createSvgRoot, mountShape } from "../svg.js";

// Dev-only page (design "Gallery"): it is never built, because the build input
// stays index.html. Task 9.8 fills the full grid; for now it draws the art that
// exists: the three Ghost_Types at Variant 0, Haunted.

loadScenicFonts();
document.documentElement.setAttribute("data-motion", "still");

function cell(label: string, art: SVGElement): HTMLElement {
  return el("figure", { class: "gallery-cell" }, [
    art,
    el("figcaption", {}, [label]),
  ]);
}

const NAMES: Readonly<Record<GhostType, string>> = {
  wisp: "Wisp",
  "lantern-wraith": "Lantern_Wraith",
  "chained-brute": "Chained_Brute",
};
function ghostCell(type: GhostType): HTMLElement {
  const { w, h } = GHOST_TYPES[type].box;
  // Room around the box for the glow and the shadow.
  const mx = w * 0.6;
  const my = h * 0.2;
  const svg = createSvgRoot(
    { x: -mx, y: -my, w: w + 2 * mx, h: h + 2 * my },
    "gallery-art",
  );
  svg.append(mountShape(ghostArt(type, 0, "haunted"), `gallery-${type}-`));
  return cell(`${NAMES[type]}, Variant 0, Haunted`, svg);
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
      { class: "gallery-grid" },
      (["wisp", "lantern-wraith", "chained-brute"] as const).map(ghostCell),
    ),
  ]),
);
