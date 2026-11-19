import type { Floor } from "@haunted-repo/core";
import { TEXTS } from "../../logic/texts.js";
import { bestiaryArt } from "./art/icons.js";
import { el } from "./dom.js";
import { GHOST_BOX, GHOST_TYPE_OF } from "./model/sceneLayout.js";
import { createSvgRoot, mountShape } from "./svg.js";

export interface Bestiary {
  element: HTMLElement;
}

/** The Bestiary lists the three types in floor order, easy to hard. */
const FLOORS: readonly Floor[] = ["attic", "middle floor", "basement"];
/** Room around the ghost box for its glow, in viewBox units. */
const MARGIN = { x: 12, y: 8 };
const LIST_ID = "bestiary-list";

/**
 * The Bestiary (Requirements 7.1 to 7.6, D2, Q31): one entry per Ghost_Type
 * with its Variant 0 picture (decoration, still) and its texts as HTML. At
 * 64rem and above the list is always open and the button is hidden by CSS;
 * below that the button folds the list, closed at load.
 */
export function createBestiary(): Bestiary {
  const items = FLOORS.map((floor) => {
    const type = GHOST_TYPE_OF[floor];
    const box = GHOST_BOX[type];
    const svg = createSvgRoot(
      {
        x: -MARGIN.x,
        y: -MARGIN.y,
        w: box.w + 2 * MARGIN.x,
        h: box.h + 2 * MARGIN.y,
      },
      "bestiary-art",
    );
    svg.append(mountShape(bestiaryArt(type), `bestiary-${type}-`));
    return el("li", { class: "bestiary-entry" }, [
      svg,
      el("div", { class: "bestiary-text" }, [
        el("strong", {}, [TEXTS.bestiary.names[floor]]),
        el("span", {}, [TEXTS.floorTitles[floor]]),
        el("span", {}, [
          TEXTS.bestiary.rangeLine(TEXTS.bestiary.ranges[floor]),
        ]),
      ]),
    ]);
  });
  const list = el("ul", { class: "bestiary-list", id: LIST_ID }, items);
  const toggle = el(
    "button",
    {
      type: "button",
      class: "bestiary-toggle",
      "aria-expanded": "false",
      "aria-controls": LIST_ID,
    },
    [TEXTS.bestiary.title],
  );
  const element = el("section", { class: "bestiary", "data-open": "false" }, [
    el("h2", {}, [TEXTS.bestiary.title]),
    toggle,
    list,
  ]);
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    element.setAttribute("data-open", String(open));
  });
  return { element };
}
