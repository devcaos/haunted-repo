import type { ViewModel } from "../../../logic/viewModel.js";
import { sceneLayout } from "./sceneLayout.js";

// What the Scenic_Renderer remembers between renders, as a pure function
// (Requirements 4.3, 4.4, 12.1, 12.2, 12.6, 12.7, 12.8, 13.7, 13.8).
export interface MeterView {
  line: string;
  share: number;
  haunted: number;
  total: number;
}
/** The CSS transform of the Haunt_Meter bar: share clamped to 0..1, 4 decimals. */
export function meterScale(share: number): string {
  const clamped = Number.isNaN(share) ? 0 : Math.min(1, Math.max(0, share));
  return `scaleX(${clamped.toFixed(4)})`;
}

export interface VisualMemory {
  prev: ViewModel | null;
  /** Progress of the last House_Scene or Floor_Scene render (null: none yet, or it had no progress). */
  lastListMeter: MeterView | null;
  hadListRender: boolean;
  /** Paths with an Exorcised_Moment in the open Ghost_Scene visit. */
  visitMoments: string[];
}

export interface RenderEffects {
  /** null hides the Haunt_Meter; `from !== null` animates from that share. */
  meter: { view: MeterView; from: number | null } | null;
  /** Paths whose Exorcised_Moment starts now (12.1). */
  exorcisedMoments: string[];
  /** Paths whose Exorcised slot drawing fades in now (12.6). */
  returnGlow: string[];
  finale: { shown: boolean; animate: boolean; announce: boolean };
  sceneChanged: boolean;
}

export const EMPTY_MEMORY: VisualMemory = {
  prev: null,
  lastListMeter: null,
  hadListRender: false,
  visitMoments: [],
};

function meterOf(model: ViewModel): MeterView | null {
  const progress = model.house?.progress ?? null;
  if (progress === null) return null;
  return {
    line: progress.line,
    share: progress.share,
    haunted: progress.haunted,
    total: progress.total,
  };
}

/** Paths that went from Haunted to Exorcised between two renders of the same source (12.1, 12.2). */
function momentsBetween(prev: ViewModel | null, model: ViewModel): string[] {
  if (prev === null || prev.house === null || model.house === null) return [];
  if (prev.house.source !== model.house.source) return [];
  const before = new Map<string, string>();
  for (const floor of prev.house.floors) {
    for (const card of floor.ghosts) {
      if (!before.has(card.path)) before.set(card.path, card.state);
    }
  }
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const floor of model.house.floors) {
    for (const card of floor.ghosts) {
      if (seen.has(card.path)) continue;
      seen.add(card.path);
      if (card.state === "exorcised" && before.get(card.path) === "haunted") {
        paths.push(card.path);
      }
    }
  }
  return paths;
}

/** Cards of the model that are Exorcised, by path. */
function exorcisedPaths(model: ViewModel): Set<string> {
  const paths = new Set<string>();
  for (const floor of model.house?.floors ?? []) {
    for (const card of floor.ghosts) {
      if (card.state === "exorcised") paths.add(card.path);
    }
  }
  return paths;
}

/**
 * Pure: never changes the memory it receives, returns a new one. The memory
 * of the Haunt_Meter is frozen while a Ghost_Scene is open (4.3, 4.4).
 */
export function nextMemory(
  memory: VisualMemory,
  model: ViewModel,
): { memory: VisualMemory; effects: RenderEffects } {
  const prev = memory.prev;
  const inGhost = model.scene.kind === "ghost";
  const afterGhost = prev !== null && prev.scene.kind === "ghost" && !inGhost;
  const moments = momentsBetween(prev, model);

  let meter: RenderEffects["meter"];
  let returnGlow: string[] = [];
  let lastListMeter = memory.lastListMeter;
  let hadListRender = memory.hadListRender;
  let visitMoments: string[];

  if (inGhost) {
    // The meter keeps the values of the last list render (4.3, 4.4).
    meter =
      memory.lastListMeter === null
        ? null
        : { view: memory.lastListMeter, from: null };
    const sameVisit = prev !== null && prev.scene.kind === "ghost";
    visitMoments = [...(sameVisit ? memory.visitMoments : [])];
    for (const path of moments) {
      if (!visitMoments.includes(path)) visitMoments.push(path);
    }
  } else {
    const view = meterOf(model);
    const animate =
      afterGhost &&
      memory.visitMoments.length > 0 &&
      memory.lastListMeter !== null &&
      view !== null;
    meter =
      view === null
        ? null
        : {
            view,
            from:
              animate && memory.lastListMeter !== null
                ? memory.lastListMeter.share
                : null,
          };
    if (afterGhost && memory.visitMoments.length > 0) {
      const exorcised = exorcisedPaths(model);
      returnGlow = memory.visitMoments.filter((path) => exorcised.has(path));
    }
    lastListMeter = view;
    hadListRender = true;
    visitMoments = [];
  }

  const shown = sceneLayout(model).finale;
  const wasShown = prev === null ? false : sceneLayout(prev).finale;
  const sameSource =
    prev !== null &&
    prev.house !== null &&
    model.house !== null &&
    prev.house.source === model.house.source;

  return {
    memory: { prev: model, lastListMeter, hadListRender, visitMoments },
    effects: {
      meter,
      exorcisedMoments: moments,
      returnGlow,
      finale: {
        shown,
        animate: shown && !wasShown && sameSource,
        announce: shown && !wasShown,
      },
      sceneChanged: model.transition !== null,
    },
  };
}
