import { TEXTS } from "../../logic/texts.js";
import { el } from "./dom.js";

/**
 * The Motion button (director's decision, 19 Nov): it stops and starts every
 * animation of the Scenic view by setting `data-motion="off"` on the shell.
 * It saves nothing, so a reload starts with motion on again. Under
 * Reduced_Motion the CSS hides it, because nothing moves then.
 */
export function createMotionToggle(shell: HTMLElement): HTMLButtonElement {
  const button = el("button", { type: "button", class: "motion-toggle" }, [
    TEXTS.motion.on,
  ]);
  button.addEventListener("click", () => {
    const off = shell.dataset["motion"] !== "off";
    if (off) shell.dataset["motion"] = "off";
    else delete shell.dataset["motion"];
    // A gate stopped in the middle of its rise stays up when motion comes back.
    if (off && shell.dataset["gate"] === "rising") shell.dataset["gate"] = "up";
    button.textContent = off ? TEXTS.motion.off : TEXTS.motion.on;
  });
  return button;
}
