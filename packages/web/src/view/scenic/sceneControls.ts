import type { UserAction } from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import { el } from "./dom.js";
import type { NameplateView, SceneLayout } from "./model/sceneLayout.js";

/** The three containers `stage.ts` builds once; this module fills them. */
export interface SceneControlParts {
  sceneBar: HTMLElement;
  floorStair: HTMLElement;
  nameplates: HTMLElement;
}

export interface SceneControls {
  /** Rebuilds the Scene_Heading, the buttons and the Nameplates from the layout. */
  update(layout: SceneLayout): void;
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
  return {
    update(layout: SceneLayout): void {
      // The Scene_Heading is a focus target, never a Tab stop.
      const bar: HTMLElement[] = [
        el("h2", { class: "scene-heading", tabindex: "-1" }, [layout.heading]),
      ];
      if (layout.backButton) {
        const back = el("button", { type: "button", class: "secondary" }, [
          TEXTS.actionLabels["go-to-house"],
        ]);
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
