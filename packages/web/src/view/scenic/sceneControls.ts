import type { UserAction } from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import type { FocusBefore } from "../shared/focus.js";
import { el } from "./dom.js";
import type { NameplateView, SceneLayout } from "./model/sceneLayout.js";
import type { ScenicFocusTarget } from "./model/scenicFocus.js";

/** The three containers `stage.ts` builds once; this module fills them. */
export interface SceneControlParts {
  sceneBar: HTMLElement;
  floorStair: HTMLElement;
  nameplates: HTMLElement;
}

export interface SceneControls {
  /** Rebuilds the Scene_Heading, the buttons and the Nameplates from the layout. */
  update(layout: SceneLayout): void;
  /** Where keyboard focus is now, seen from the controls this module rebuilds. */
  focusBefore(): FocusBefore;
  /** Moves focus to the target; a key that is not on screen falls back to the Scene_Heading. */
  focus(target: ScenicFocusTarget): void;
  /** Puts focus on the Scene_Heading (the safety net of the renderer). */
  focusHeading(): void;
}

/** One Nameplate: a labelled article. Only a startable Card gets a focusable control. */
function nameplate(
  view: NameplateView,
  send: (action: UserAction) => boolean,
): HTMLElement {
  const pathId = `nameplate-path-${view.index}`;
  const parts: HTMLElement[] = [
    el("p", { class: "nameplate-path path", id: pathId }, [view.path]),
    el("p", { class: "nameplate-reason" }, [view.reason]),
    el("p", { class: "nameplate-score" }, [view.scoreLine]),
    el("p", { class: "nameplate-state" }, [view.stateLabel]),
  ];
  // The locked line is always visible text, never only a tooltip.
  if (view.lockedLine !== null) {
    parts.push(el("p", { class: "nameplate-locked" }, [view.lockedLine]));
  }
  if (view.hasStart) {
    const start = el(
      "button",
      {
        type: "button",
        class: "nameplate-start",
        "data-focus-key": `start-ghost:${view.path}`,
        "aria-describedby": pathId,
      },
      [TEXTS.actionLabels["start-ghost"]],
    );
    start.addEventListener("click", () => {
      send({ type: "start-ghost", path: view.path });
    });
    parts.push(start);
  }
  return el(
    "article",
    {
      class: "nameplate",
      "aria-label": view.accessibleName,
      "data-ghost-state": view.state,
    },
    parts,
  );
}

/**
 * The HTML controls of a Scene, rebuilt on every render from the Scene_Layout
 * (Requirements 3.6, 3.7, 6.4 to 6.10, 8.3 to 8.7). Every control sends through
 * the guard's `send`, so a stale control never dispatches an action that the
 * newest model does not offer.
 */
export function createSceneControls(
  parts: SceneControlParts,
  send: (action: UserAction) => boolean,
): SceneControls {
  const layers = [parts.sceneBar, parts.floorStair, parts.nameplates];
  let heading: HTMLElement | null = null;
  /** The element of the controls with this focus key, compared as plain text (no selector escaping). */
  const byFocusKey = (key: string): HTMLElement | null => {
    for (const layer of layers) {
      for (const node of layer.querySelectorAll<HTMLElement>(
        "[data-focus-key]",
      )) {
        if (node.dataset.focusKey === key) return node;
      }
    }
    return null;
  };
  return {
    focusBefore(): FocusBefore {
      const active = document.activeElement;
      if (
        !(active instanceof HTMLElement) ||
        !layers.some((layer) => layer.contains(active))
      ) {
        return { where: "outside" };
      }
      return { where: "main", key: active.dataset.focusKey ?? null };
    },
    focus(target: ScenicFocusTarget): void {
      if (target.kind === "keep") return;
      const node = target.kind === "key" ? byFocusKey(target.key) : heading;
      (node ?? heading)?.focus();
    },
    focusHeading(): void {
      heading?.focus();
    },
    update(layout: SceneLayout): void {
      // The Scene_Heading is a focus target, never a Tab stop.
      heading = el("h2", { class: "scene-heading", tabindex: "-1" }, [
        layout.heading,
      ]);
      const bar: HTMLElement[] = [heading];
      if (layout.backButton) {
        const back = el(
          "button",
          {
            type: "button",
            class: "secondary",
            "data-focus-key": "go-to-house",
          },
          [TEXTS.actionLabels["go-to-house"]],
        );
        back.addEventListener("click", () => {
          send({ type: "go-to-house" });
        });
        bar.push(back);
      }
      parts.sceneBar.replaceChildren(...bar);

      const buttons = layout.floorButtons.map((view) => {
        const button = el(
          "button",
          {
            type: "button",
            class: "secondary floor-button",
            "data-focus-key": `go-to-floor:${view.floor}`,
            "aria-label": view.accessibleName,
          },
          [view.label],
        );
        button.addEventListener("click", () => {
          send({ type: "go-to-floor", floor: view.floor });
        });
        return button;
      });
      parts.floorStair.replaceChildren(...buttons);
      parts.floorStair.hidden = buttons.length === 0;

      const items = layout.nameplates.map((view) =>
        el("li", {}, [nameplate(view, send)]),
      );
      if (layout.emptyLine !== null) {
        items.push(
          el("li", { class: "nameplates-empty" }, [
            el("p", {}, [layout.emptyLine]),
          ]),
        );
      }
      parts.nameplates.replaceChildren(...items);
      parts.nameplates.hidden = items.length === 0;
    },
  };
}
