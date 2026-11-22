import { TEXTS } from "../../logic/texts.js";
import { el } from "./dom.js";
import { lightningToggleView } from "./model/hudView.js";

export interface LightningToggle {
  /** The Motion and Lightning buttons with the reason under them; the renderer adds the Motion button. */
  element: HTMLElement;
  isOn(): boolean;
}

/**
 * The Lightning_Toggle (15.5 to 15.9): a real button that flips on and off in
 * the same frame, keeps focus and sends no UserAction. Its state lives only in
 * memory: on at load, unless Reduced_Motion is on.
 */
export function createLightningToggle(
  reduced: MediaQueryList,
  onChange: (on: boolean) => void,
): LightningToggle {
  let on = !reduced.matches;
  const button = el("button", { type: "button", class: "lightning-toggle" });
  const reason = el(
    "p",
    { class: "lightning-reason", id: "lightning-reason", hidden: "" },
    [TEXTS.lightning.reducedReason],
  );
  const element = el("div", { class: "motion-controls" }, [button, reason]);

  const paint = (): void => {
    const view = lightningToggleView(on, reduced.matches);
    button.textContent = view.text;
    button.setAttribute("aria-pressed", String(view.pressed));
    button.disabled = view.disabled;
    reason.hidden = view.reason === null;
    if (view.reason === null) button.removeAttribute("aria-describedby");
    else button.setAttribute("aria-describedby", reason.id);
  };

  button.addEventListener("click", () => {
    if (reduced.matches) return;
    on = !on;
    paint();
    onChange(on);
  });

  // Reduced_Motion on: off and disabled. Off again: enabled, and it stays off.
  reduced.addEventListener("change", () => {
    on = false;
    paint();
    onChange(on);
  });

  paint();
  return { element, isOn: () => on };
}
