import {
  flashAllowed,
  nextFlashDelay,
  type FlashInput,
} from "./model/lightningClock.js";

/** How long one flash shows `--sc-dur-lightning`). */
const FLASH_MS = 600;

export interface Lightning {
  /** Starts counting again from now: on load and when the toggle turns on (15.3). */
  restart(): void;
  /** Ends a showing flash at once and starts no new one (15.7). */
  stop(): void;
}

/**
 * The Lightning clock (D7): each flash is due 10 to 15 s after the previous
 * one was due, never counted from a render. A due flash that is not allowed
 * is skipped and the counting goes on (15.2).
 */
export function createLightning(
  stage: HTMLElement,
  input: () => FlashInput,
): Lightning {
  let dueTimer: number | null = null;
  let flashTimer: number | null = null;
  let due = 0;

  const endFlash = (): void => {
    if (flashTimer !== null) window.clearTimeout(flashTimer);
    flashTimer = null;
    stage.classList.remove("is-flashing");
  };

  const schedule = (): void => {
    due += nextFlashDelay(Math.random());
    dueTimer = window.setTimeout(fire, Math.max(0, due - performance.now()));
  };

  const fire = (): void => {
    dueTimer = null;
    if (flashAllowed(input())) {
      endFlash();
      stage.classList.add("is-flashing");
      flashTimer = window.setTimeout(endFlash, FLASH_MS);
    }
    schedule();
  };

  const stop = (): void => {
    if (dueTimer !== null) window.clearTimeout(dueTimer);
    dueTimer = null;
    endFlash();
  };

  return {
    restart(): void {
      stop();
      due = performance.now();
      schedule();
    },
    stop,
  };
}
