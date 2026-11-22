/** Shortest time between two Lightning flashes (15.1). */
export const FLASH_MIN_MS = 10_000;
/** Longest time between two Lightning flashes (15.1). */
export const FLASH_MAX_MS = 15_000;

/**
 * The time to the next flash, from the number the caller draws (the renderer
 * passes `Math.random()`). `random` is in [0, 1); the result is an integer
 * from 10,000 to 15,000 inclusive. Pure: it draws no number itself.
 */
export function nextFlashDelay(random: number): number {
  return FLASH_MIN_MS + Math.floor(random * (FLASH_MAX_MS - FLASH_MIN_MS + 1));
}

/** What decides whether a due flash is shown. */
export interface FlashInput {
  toggleOn: boolean;
  reducedMotion: boolean;
  scene: "house" | "floor" | "ghost";
  /** The Finale is shown (D8, Q20). */
  finale: boolean;
  ringPlaying: boolean;
  exorcisedMomentPlaying: boolean;
}

/**
 * True when a due flash may be shown. When it is false the flash is skipped
 * and the interval keeps counting (15.2, D7, D8, Q7).
 */
export function flashAllowed(input: FlashInput): boolean {
  return (
    input.toggleOn &&
    !input.reducedMotion &&
    input.scene !== "ghost" &&
    !input.finale &&
    !input.ringPlaying &&
    !input.exorcisedMomentPlaying
  );
}
