import type { Floor } from "@haunted-repo/core";
import type { Frame, Rect } from "./sceneLayout.js";

/** Which layout is in use: wide when `matchMedia(WIDE_QUERY)` matches. */
export type ViewportClass = "wide" | "narrow";

/** The one wide-layout breakpoint. The CSS uses the same query text. */
export const WIDE_QUERY = "(min-width: 64rem)";

/** The world is the viewBox `0 0 1600 1000`. */
const WORLD_W = 1600;
const WORLD_H = 1000;
/** Margin around a slot in the Ghost_Scene frame. */
const SLOT_MARGIN = 20;

export interface CameraTransform {
  scale: number;
  txPercent: number; // of the world box width (1600 units)
  tyPercent: number; // of the world box height (1000 units)
  counterScale: number; // 1 / scale, for HTML pinned inside the world
}

const FLOOR_FRAME: Readonly<Record<Floor, Rect>> = {
  attic: { x: 560, y: 300, w: 620, h: 230 },
  "middle floor": { x: 530, y: 470, w: 680, h: 320 },
  basement: { x: 550, y: 730, w: 640, h: 240 },
};

/** The frame rectangle with its margin, in world units ("Camera frames"). */
export function frameRect(frame: Frame, viewport: ViewportClass): Rect {
  switch (frame.kind) {
    case "house":
      return viewport === "wide"
        ? { x: 0, y: 0, w: WORLD_W, h: WORLD_H }
        : { x: 510, y: 95, w: 850, h: 895 };
    case "floor":
      return FLOOR_FRAME[frame.floor];
    case "slot":
      return {
        x: frame.rect.x - SLOT_MARGIN,
        y: frame.rect.y - SLOT_MARGIN,
        w: frame.rect.w + 2 * SLOT_MARGIN,
        h: frame.rect.h + 2 * SLOT_MARGIN,
      };
  }
}

/** Where the frame must fit, in stage units (the wide stage is 1600 x 1000, the narrow one 1600 x 1600). */
export function sceneArea(frame: Frame, viewport: ViewportClass): Rect {
  if (viewport === "narrow") return { x: 40, y: 40, w: 1520, h: 1520 };
  return frame.kind === "house"
    ? { x: 0, y: 0, w: WORLD_W, h: WORLD_H }
    : { x: 400, y: 110, w: 1200, h: 610 };
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000 + 0; // + 0 turns -0 into 0
}

/** The transform that centres the frame in the scene area at the biggest scale that fits. */
export function cameraFor(
  frame: Frame,
  viewport: ViewportClass,
): CameraTransform {
  const f = frameRect(frame, viewport);
  const a = sceneArea(frame, viewport);
  const scale = Math.min(a.w / f.w, a.h / f.h);
  const tx = a.x + a.w / 2 - scale * (f.x + f.w / 2);
  const ty = a.y + a.h / 2 - scale * (f.y + f.h / 2);
  return {
    scale: round4(scale),
    txPercent: round4((tx / WORLD_W) * 100),
    tyPercent: round4((ty / WORLD_H) * 100),
    counterScale: round4(1 / scale),
  };
}

/** `translate(x%, y%) scale(s)`, for a `.world` with `transform-origin: 0 0`. */
export function cssTransform(t: CameraTransform): string {
  return `translate(${t.txPercent}%, ${t.tyPercent}%) scale(${t.scale})`;
}
