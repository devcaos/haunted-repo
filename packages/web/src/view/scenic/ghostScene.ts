import { ROOM_BOX, roomArt } from "./art/room.js";
import { ghostArt } from "./art/ghosts.js";
import { el } from "./dom.js";
import type { Grimoire } from "./grimoire.js";
import type { GrimoireView } from "./model/grimoireView.js";
import type { ReactionKind } from "./model/reactions.js";
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
  /** Plays one Reaction on the close-up ghost; a playing one jumps to its end first (11.11). */
  react(kind: ReactionKind): void;
  /** The ghost's size and opacity after the latest action (11.2 to 11.7). */
  setVigour(style: { scale: number; opacity: number }): void;
  /** The Exorcised_Moment (12.3, 12.4, D6); after `endMs` only its end state is left. */
  exorcise(endMs: number): void;
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
  let vigour = { scale: 1, opacity: 1 };
  let exorciseTimer: number | null = null;
  const reactClasses = ["recoil", "shudder", "laugh", "puzzle"].map(
    (k) => `is-${k}`,
  );
  const applyVigour = (): void => {
    const node = artBox.querySelector<HTMLElement>(".ghost-vigour");
    node?.style.setProperty("--vigour-scale", String(vigour.scale));
    node?.style.setProperty("--vigour-opacity", String(vigour.opacity));
  };
  const clearExorcise = (): void => {
    if (exorciseTimer !== null) window.clearTimeout(exorciseTimer);
    exorciseTimer = null;
  };
  /** End state of the Exorcised_Moment: no ghost, warm light. */
  const exorciseEnd = (): void => {
    clearExorcise();
    element.classList.remove("is-exorcising");
    element.classList.add("is-exorcised");
  };
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
        clearExorcise();
        element.classList.remove("is-exorcising", "is-exorcised");
        applyVigour();
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
      // A Scene change jumps the Exorcised_Moment to its end (12.9).
      if (exorciseTimer !== null) exorciseEnd();
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
        element.classList.remove("is-exorcising", "is-exorcised");
      };
      if (fadeMs <= 0) done();
      else leaveTimer = window.setTimeout(done, fadeMs);
    },
    react(kind: ReactionKind): void {
      const node = artBox.querySelector(".ghost-react");
      const smoke = artBox.querySelector(".smoke-q");
      if (node === null) return;
      node.classList.remove(...reactClasses);
      smoke?.classList.remove("is-rising");
      // Read the layout once, so the same class starts again from its first frame.
      void node.getBoundingClientRect();
      node.classList.add(`is-${kind}`);
      if (kind === "puzzle") smoke?.classList.add("is-rising");
    },
    setVigour(style: { scale: number; opacity: number }): void {
      vigour = style;
      applyVigour();
    },
    exorcise(endMs: number): void {
      if (visit === null) return;
      clearExorcise();
      element.classList.remove("is-exorcised");
      element.classList.add("is-exorcising");
      if (endMs <= 0) exorciseEnd();
      else exorciseTimer = window.setTimeout(exorciseEnd, endMs);
    },
  };
}
