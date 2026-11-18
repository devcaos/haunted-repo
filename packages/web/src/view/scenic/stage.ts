import type { Floor } from "@haunted-repo/core";
import type { Scene } from "../../logic/viewModel.js";
import {
  ATTIC_BACK,
  ATTIC_CLIP,
  atticClip,
  sceneBackdrop,
} from "./art/house.js";
import { chainedDoorArt, slotArt } from "./art/props.js";
import { defs, g, rect } from "./art/shapes.js";
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
  /** `div.scene-bar`: the renderer puts the Scene_Heading here. */
  sceneBar: HTMLElement;
  update(view: StageView): void;
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
 * Builds the stage once: `main.stage` > `div.scene-bar` and `div.world` (the
 * Camera) > one `svg.house` with its layers back to front (the illustration,
 * slots, dims, telephone, weather, effects) and `div.world-overlay`. Each
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
    // Filled by the Telephone in task 11.1 and the effects in task 15.4.
    mountShape(g("telephone", []), "house-"),
    mountShape(weatherLayer(), "house-"),
    mountShape(g("effects", []), "house-"),
  );

  const overlay = el("div", { class: "world-overlay" });
  const world = el("div", { class: "world" }, [svg, overlay]);
  const sceneBar = el("div", { class: "scene-bar" });
  const element = el("main", { class: "stage", "data-scene": "house" }, [
    sceneBar,
    world,
  ]);

  let signature: string | null = null;

  return {
    element,
    sceneBar,
    update(view: StageView): void {
      const { layout, scene } = view;
      element.setAttribute("data-scene", scene.kind);
      if (scene.kind === "floor")
        element.setAttribute("data-floor", scene.floor);
      else element.removeAttribute("data-floor");
      element.setAttribute("data-finale", String(layout.finale));
      element.setAttribute("data-busy", String(view.busy));

      // The house stays as it was behind the close-up room of the Ghost_Scene.
      const next = slotSignature(layout);
      if (scene.kind !== "ghost" && next !== signature) {
        signature = next;
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

      const camera = cameraFor(layout.frame, view.viewport);
      world.style.transform = cssTransform(camera);
      world.style.setProperty("--cam-counter", String(camera.counterScale));
    },
  };
}
