import "../styles/scenic-tokens.css";
import "../styles/base.css";
import "../styles/ghosts.css";
import "../styles/motion.css";
import "../styles/gallery.css";
import { ghostArt, GHOST_TYPES } from "../art/ghosts.js";
import { el } from "../dom.js";
import { loadScenicFonts } from "../fonts.js";
import { createSvgRoot, mountShape } from "../svg.js";

// Dev-only page (design "Gallery"): it is never built, because the build input
// stays index.html. Task 9.8 fills the full grid; for now it draws the art that
// exists, the Wisp at Variant 0, Haunted.

loadScenicFonts();
document.documentElement.setAttribute("data-motion", "still");

function cell(label: string, art: SVGElement): HTMLElement {
  return el("figure", { class: "gallery-cell" }, [
    art,
    el("figcaption", {}, [label]),
  ]);
}

function wispCell(): HTMLElement {
  const { w, h } = GHOST_TYPES.wisp.box;
  // Room around the box for the glow and the shadow.
  const svg = createSvgRoot(
    { x: -24, y: -18, w: w + 48, h: h + 40 },
    "gallery-art",
  );
  svg.append(mountShape(ghostArt("wisp", 0, "haunted"), "gallery-wisp-"));
  return cell("Wisp, Variant 0, Haunted", svg);
}

const root = document.getElementById("gallery");
if (root === null) {
  throw new Error("Gallery page is missing #gallery");
}
root.append(
  el("main", { class: "gallery" }, [
    el("h1", {}, ["Ghost gallery"]),
    el("div", { class: "gallery-grid" }, [wispCell()]),
  ]),
);
