import { ROOM_BOX, roomArt } from "./art/room.js";
import { ghostArt } from "./art/ghosts.js";
import { el } from "./dom.js";
import type { Grimoire } from "./grimoire.js";
import type { GrimoireView } from "./model/grimoireView.js";
import {
  GHOST_BOX,
  type GhostType,
  type VariantNumber,
} from "./model/sceneLayout.js";
import { createSvgRoot, mountShape } from "./svg.js";

export interface GhostSceneView {
  path: string;
  closeUp: { ghostType: GhostType; variant: VariantNumber };
  grimoire: GrimoireView;
}

export interface GhostScene {
  /** `div.room`, built once; hidden outside the Ghost_Scene. */
  element: HTMLElement;
  /** A Ghost_Scene render: opens the room on entry and keeps it for the visit. */
  show(view: GhostSceneView): void;
  /** Any other Scene: fades the room out, then hides it. */
  hide(fadeMs: number): void;
  /** True while the room is open or entering. */
  readonly open: boolean;
}

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/** Room around the ghost box for its glow, as a share of the box. */
const GLOW_MARGIN = { x: 0.45, y: 0.12 };

/** The close-up ghost: positioning box > vigour > reaction > svg (design "Ghost wrapper structure"). */
function closeUpGhost(type: GhostType, variant: VariantNumber): HTMLElement {
  const box = GHOST_BOX[type];
  const mx = box.w * GLOW_MARGIN.x;
  const my = box.h * GLOW_MARGIN.y;
  const svg = createSvgRoot(
    { x: -mx, y: -my, w: box.w + 2 * mx, h: box.h + 2 * my },
    "ghost-close-art",
  );
  svg.append(mountShape(ghostArt(type, variant, "haunted"), "room-ghost-"));
  const react = el("div", { class: "ghost-react" }, [svg]);
  const vigour = el("div", { class: "ghost-vigour" }, [react]);
  const wrap = el("div", { class: "ghost-close" }, [vigour]);
  // Width over height of the drawing, so CSS can size the box from its height.
  wrap.style.setProperty(
    "--ghost-ratio",
    String(round4((box.w + 2 * mx) / (box.h + 2 * my))),
  );
  return wrap;
}

/**
 * The close-up room of the Ghost_Scene (Requirements 10.1, 10.8, 10.9, 10.13):
 * the room picture with its Question_Candles, the close-up ghost over it, and
 * the Grimoire beside it (under it below 64rem, D10). Built on entering the
 * Ghost_Scene, kept for the visit, hidden after the leave fade.
 */
export function createGhostScene(
  roomHref: string | null,
  grimoire: Grimoire,
): GhostScene {
  const artBox = el("div", { class: "room-art" });
  const element = el("div", { class: "room", hidden: "" }, [
    artBox,
    grimoire.element,
  ]);
  let visit: string | null = null;
  let candles: Element[] = [];
  let leaveTimer: number | null = null;

  const clearLeave = (): void => {
    if (leaveTimer !== null) window.clearTimeout(leaveTimer);
    leaveTimer = null;
  };

  return {
    element,
    get open(): boolean {
      return visit !== null;
    },
    show(view: GhostSceneView): void {
      clearLeave();
      if (visit !== view.path) {
        visit = view.path;
        const svg = createSvgRoot(
          { x: 0, y: 0, w: ROOM_BOX.w, h: ROOM_BOX.h },
          "room-svg",
        );
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.append(mountShape(roomArt(roomHref), "room-"));
        candles = [...svg.querySelectorAll(".qcandle")];
        artBox.replaceChildren(
          svg,
          closeUpGhost(view.closeUp.ghostType, view.closeUp.variant),
        );
        element.hidden = false;
        element.inert = false;
        // Restart the enter fade on every new visit.
        element.setAttribute("data-state", "closed");
        void element.getBoundingClientRect();
        element.setAttribute("data-state", "open");
      }
      grimoire.update(view.grimoire);
      candles.forEach((candle, i) => {
        candle.classList.toggle("is-lit", i < view.grimoire.litCandles);
      });
    },
    hide(fadeMs: number): void {
      if (visit === null) return;
      visit = null;
      element.setAttribute("data-state", "leaving");
      // Nothing in the fading room can take focus or a click.
      element.inert = true;
      clearLeave();
      const done = (): void => {
        leaveTimer = null;
        element.hidden = true;
        element.removeAttribute("data-state");
        artBox.replaceChildren();
        candles = [];
      };
      if (fadeMs <= 0) done();
      else leaveTimer = window.setTimeout(done, fadeMs);
    },
  };
}
