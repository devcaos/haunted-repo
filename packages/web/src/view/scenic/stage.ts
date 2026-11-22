import type { Floor } from "@haunted-repo/core";
import type { Scene } from "../../logic/viewModel.js";
import {
  ATTIC_BACK,
  ATTIC_CLIP,
  atticClip,
  sceneBackdrop,
} from "./art/house.js";
import { chainedDoorArt, ringEffectsArt, slotArt } from "./art/props.js";
import { defs, g, rect } from "./art/shapes.js";
import { effectsLayer } from "./art/effects.js";
import { weatherLayer } from "./art/weather.js";
import { el } from "./dom.js";
import { cameraFor, cssTransform, type ViewportClass } from "./model/camera.js";
import { FLOOR_RECT, type SceneLayout } from "./model/sceneLayout.js";
import { createSvgRoot, mountShape } from "./svg.js";

/** What one render tells the stage. */
export interface StageView {
  layout: SceneLayout;
  scene: Scene;
  busy: boolean;
  viewport: ViewportClass;
}

export interface Stage {
  /** `main.stage`, built once. */
  element: HTMLElement;
  /** `div.scene-bar`, `nav.floor-stair` and `ul.nameplates`: `sceneControls.ts` fills them. */
  sceneBar: HTMLElement;
  floorStair: HTMLElement;
  nameplates: HTMLElement;
  /** `div.world-overlay` (HTML pinned to the art) and `div.scene-dock` (the docked phone widget). */
  overlay: HTMLElement;
  dock: HTMLElement;
  update(view: StageView): void;
  /** Return_Glow (12.6): the Exorcised drawing of these Cards fades in for `ms`. */
  glow(paths: readonly string[], ms: number): void;
}

const FLOORS: readonly Floor[] = ["attic", "middle floor", "basement"];
const DIM_CLASS: Readonly<Record<Floor, string>> = {
  attic: "dim dim-attic",
  "middle floor": "dim dim-middle",
  basement: "dim dim-basement",
};

/** Changes only when a Card's floor, position, Variant or state changes, or a floor gets or loses its Cards. */
function slotSignature(layout: SceneLayout): string {
  const slots = layout.slots.map(
    (s) => `${s.key}:${s.variant}:${s.state}:${s.rect.x}:${s.rect.w}`,
  );
  return `${slots.join(",")}|${layout.emptyFloors.join(",")}`;
}

/**
 * Builds the stage once: `main.stage` > `div.stage-view` (the clipped box) >
 * `div.scene-bar` and `div.world` (the Camera) > one `svg.house` with its
 * layers back to front (the illustration, slots, dims, telephone, weather,
 * effects) and `div.world-overlay`; then `div.scene-dock`, `nav.floor-stair`
 * and `ul.nameplates`, outside the clipped box. Each
 * render changes only attributes, classes and the Camera transform; the slot
 * layer is rebuilt only when the slot signature changes, so idle animations
 * do not restart.
 */
export function createStage(sceneHref: string | null): Stage {
  const svg = createSvgRoot({ x: 0, y: 0, w: 1600, h: 1000 }, "house");
  const slots = mountShape(g("slots", []), "house-");
  // One Night overlay per floor rectangle, shown on the dimmed floors.
  const dimRects = FLOORS.map((floor) => {
    // The attic dim covers the whole attic up to the ridge and follows the slopes.
    const r = floor === "attic" ? ATTIC_BACK : FLOOR_RECT[floor];
    const clip = floor === "attic" ? { clip: ATTIC_CLIP } : {};
    const node = mountShape(
      rect(DIM_CLASS[floor], r.x, r.y, r.w, r.h, clip),
      "house-",
    );
    return { floor, node };
  });
  const dims = mountShape(g("dims", [defs([atticClip()])]), "house-");
  dims.append(...dimRects.map((d) => d.node));
  svg.append(
    mountShape(sceneBackdrop(sceneHref), "house-"),
    slots,
    dims,
    // The Ring effects; the renderer adds `is-ringing` to this layer (task 11.7).
    mountShape(g("telephone", [ringEffectsArt()]), "house-"),
    mountShape(weatherLayer(), "house-"),
    mountShape(effectsLayer(), "house-"),
  );

  const overlay = el("div", { class: "world-overlay" });
  const world = el("div", { class: "world" }, [svg, overlay]);
  const sceneBar = el("div", { class: "scene-bar" });
  const dock = el("div", { class: "scene-dock", hidden: "" });
  const floorStair = el("nav", { class: "floor-stair", hidden: "" });
  const nameplates = el("ul", { class: "nameplates", hidden: "" });
  const stageView = el("div", { class: "stage-view" }, [sceneBar, world]);
  const element = el("main", { class: "stage", "data-scene": "house" }, [
    stageView,
    dock,
    floorStair,
    nameplates,
  ]);

  let signature: string | null = null;
  let lastTransform: string | null = null;
  let slotPaths: string[] = [];
  let glowTimer: number | null = null;

  return {
    element,
    sceneBar,
    floorStair,
    nameplates,
    overlay,
    dock,
    update(view: StageView): void {
      const { layout, scene } = view;
      element.setAttribute("data-scene", scene.kind);
      if (scene.kind === "floor")
        element.setAttribute("data-floor", scene.floor);
      else element.removeAttribute("data-floor");
      element.setAttribute("data-finale", String(layout.finale));
      element.setAttribute("data-busy", String(view.busy));

      // The close-up room covers the stage in the Ghost_Scene, so the house
      // behind it stays exactly as it was: no slot, dim or Camera change, which
      // would repaint the whole illustration for nothing (director, 22 Nov).
      if (scene.kind === "ghost") return;
      const next = slotSignature(layout);
      if (next !== signature) {
        signature = next;
        slotPaths = layout.slots.map((slot) => slot.path);
        slots.replaceChildren(
          ...layout.slots.map((slot, i) =>
            mountShape(slotArt(slot), `house-s${i}-`),
          ),
          ...layout.emptyFloors.map((floor) =>
            mountShape(chainedDoorArt(floor), "house-"),
          ),
        );
      }

      for (const { floor, node } of dimRects) {
        node.classList.toggle("is-dimmed", layout.dimmedFloors.includes(floor));
      }

      // Set only when the frame or the viewport changed, so a render that keeps
      // the framing never touches a Camera move that is still running.
      const camera = cameraFor(layout.frame, view.viewport);
      const transform = cssTransform(camera);
      if (transform !== lastTransform) {
        lastTransform = transform;
        world.style.transform = transform;
        world.style.setProperty("--cam-counter", String(camera.counterScale));
      }
    },
    glow(paths: readonly string[], ms: number): void {
      if (glowTimer !== null) window.clearTimeout(glowTimer);
      glowTimer = null;
      const nodes = [...slots.children];
      for (const node of nodes) node.classList.remove("is-returning");
      if (ms <= 0) return;
      nodes.forEach((node, i) => {
        if (paths.includes(slotPaths[i] ?? ""))
          node.classList.add("is-returning");
      });
      glowTimer = window.setTimeout(() => {
        glowTimer = null;
        for (const node of nodes) node.classList.remove("is-returning");
      }, ms);
    },
  };
}
