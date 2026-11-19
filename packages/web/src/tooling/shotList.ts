// Pure shot list for `npm run shots` (Requirements 24.4, 24.5, 24.10).
// The list grows with the stages; task 16.7 completes it (19 states in all).

export const SHOT_STATES = [
  "01-house",
  "02-floor-attic",
  "03-floor-middle",
  "04-floor-basement",
  "16-reduced-house",
  "17-reduced-floor-attic",
  "19-gallery",
] as const;

export type ShotState = (typeof SHOT_STATES)[number];

export interface ShotSize {
  width: number;
  height: number;
}

export const SHOT_SIZES: readonly ShotSize[] = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

/** `<state>-<width>x<height>.png` */
export function shotFileName(state: ShotState, size: ShotSize): string {
  return `${state}-${size.width}x${size.height}.png`;
}

export interface Shot {
  state: ShotState;
  size: ShotSize;
  fileName: string;
}

export function allShots(): Shot[] {
  return SHOT_STATES.flatMap((state) =>
    SHOT_SIZES.map((size) => ({
      state,
      size,
      fileName: shotFileName(state, size),
    })),
  );
}
