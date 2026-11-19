import type { UserAction } from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import { ICON_BOX, phoneIconArt } from "./art/icons.js";
import { el, setText } from "./dom.js";
import { createSvgRoot, mountShape } from "./svg.js";

/** Where the widget sits: over the painted telephone, or in the scene dock. */
export type PhonePlace = "pinned" | "docked";

/** What the widget needs from the newest model. */
export interface PhoneView {
  source: "sample" | "live" | null;
  /** Telephone_Target: the first startable Card, or null. */
  target: string | null;
  /** `house.powerLine`: set only for a live report. */
  powerLine: string | null;
}

export interface PhoneUpdate {
  place: PhonePlace;
  /** False in the Ghost_Scene: the widget is hidden and out of the tab order (9.7). */
  visible: boolean;
  /** True in the render where the Scene changed: the Phone_Bubble goes away. */
  sceneChanged: boolean;
  phone: PhoneView;
  /** `callWaiting(state)`: the accessible name also says a call is waiting (9.14). */
  callWaiting: boolean;
}

export interface PhoneWidget {
  /** `div.phone-widget`: one element that moves between the two parents. */
  element: HTMLElement;
  update(update: PhoneUpdate): void;
}

/** The two places the widget can live; `stage.ts` builds both. */
export interface PhoneParents {
  overlay: HTMLElement;
  dock: HTMLElement;
}

/**
 * `div.phone-widget`: the Answer_Button, the "RING!" bubble (decoration, hidden
 * from screen readers) and the Phone_Bubble. It is built once and moves between
 * `.world-overlay` (pinned under the painted telephone) and `.scene-dock`.
 * Activation sends through the guard's `send`; the Phone_Bubble text is also
 * given to the Scenic_Announcer and stays until the next Scene change or
 * activation (Requirements 9.7 to 9.11).
 */
export function createPhoneWidget(
  parents: PhoneParents,
  send: (action: UserAction) => boolean,
  announce: (text: string) => void,
  onAnswered: () => void,
): PhoneWidget {
  const icon = createSvgRoot(
    { x: 0, y: 0, w: ICON_BOX, h: ICON_BOX },
    "answer-icon",
  );
  icon.append(mountShape(phoneIconArt(), "answer-"));
  const button = el(
    "button",
    {
      type: "button",
      class: "answer-button",
      "aria-label": TEXTS.phone.answer,
    },
    [icon, TEXTS.phone.answer],
  );
  const ring = el("span", { class: "ring-bubble", "aria-hidden": "true" }, [
    TEXTS.phone.ring,
  ]);
  const bubble = el("div", { class: "phone-bubble", hidden: "" });
  const element = el("div", { class: "phone-widget" }, [
    el("div", { class: "answer-slot" }, [button]),
    ring,
    bubble,
  ]);
  let phone: PhoneView = { source: null, target: null, powerLine: null };

  const showBubble = (text: string | null): void => {
    bubble.hidden = text === null;
    setText(bubble, text ?? "");
    if (text !== null) announce(text);
  };

  button.addEventListener("click", () => {
    // Answering stops any Ring or Live_Call first (9.12).
    onAnswered();
    if (phone.source === "live") {
      showBubble(phone.powerLine ?? TEXTS.phone.quiet);
      return;
    }
    if (
      phone.source === "sample" &&
      phone.target !== null &&
      send({ type: "start-ghost", path: phone.target })
    ) {
      showBubble(null);
      return;
    }
    showBubble(TEXTS.phone.quiet);
  });

  return {
    element,
    update(update: PhoneUpdate): void {
      phone = update.phone;
      button.setAttribute(
        "aria-label",
        update.callWaiting ? TEXTS.phone.answerWaiting : TEXTS.phone.answer,
      );
      const parent = update.place === "pinned" ? parents.overlay : parents.dock;
      if (element.parentElement !== parent) {
        const hadFocus = element.contains(document.activeElement);
        parent.append(element);
        if (hadFocus) button.focus();
      }
      element.classList.toggle("is-pinned", update.place === "pinned");
      element.classList.toggle("is-docked", update.place === "docked");
      element.hidden = !update.visible;
      parents.dock.hidden = update.place !== "docked" || !update.visible;
      if (update.sceneChanged) showBubble(null);
    },
  };
}
