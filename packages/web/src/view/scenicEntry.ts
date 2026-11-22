import type { ActionSink } from "../logic/actions.js";
import type { Renderer } from "../logic/viewModel.js";
import type { AssetSlotId } from "./assets/manifest.js";
import { resolveSlot } from "./assets/resolve.js";
import { createRenderer as createScenicRenderer } from "./scenic/entry.js";

/** The built URL of a slot's first layer, or null when the slot falls back. */
function firstUrl(id: AssetSlotId): string | null {
  const slot = resolveSlot(id);
  return slot.kind === "layers" ? (slot.layers[0]?.url ?? null) : null;
}

/**
 * Entry of the Scenic_Renderer. It shows the scene illustration (director's
 * decision, 18 Nov) and the four Gate_Panel pictures (director's decision,
 * 19 Nov), which override the "no graphic file" part of Requirement 22.10.
 * This file sits outside `view/scenic/`, resolves the slots and hands the
 * built URLs in, so no scenic file imports `view/assets/` (Source_Scan
 * item 15).
 */
export function createRenderer(
  root: HTMLElement,
  onAction: ActionSink,
): Renderer {
  const sceneHref = firstUrl("scene.house");
  return createScenicRenderer(root, onAction, {
    sceneHref,
    roomHref: firstUrl("scene.ghost-room"),
    gate: {
      frame: firstUrl("panel.frame"),
      gargoyle: firstUrl("panel.gargoyle"),
      lantern: firstUrl("panel.lantern"),
      pumpkin: firstUrl("panel.pumpkin"),
    },
  });
}
