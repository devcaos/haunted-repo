import type { ActionSink } from "../logic/actions.js";
import type { Renderer } from "../logic/viewModel.js";
import { resolveSlot } from "./assets/resolve.js";
import { createRenderer as createScenicRenderer } from "./scenic/entry.js";

/**
 * Entry of the Scenic_Renderer. The scene illustration is the one asset it
 * shows (director's decision, 18 Nov, which overrides the "no graphic file"
 * part of Requirement 22.10). This file sits outside `view/scenic/`, resolves
 * the `scene.house` slot and hands the built URL in, so no scenic file
 * imports `view/assets/` (Source_Scan item 15).
 */
export function createRenderer(
  root: HTMLElement,
  onAction: ActionSink,
): Renderer {
  const slot = resolveSlot("scene.house");
  const sceneHref =
    slot.kind === "layers" ? (slot.layers[0]?.url ?? null) : null;
  return createScenicRenderer(root, onAction, { sceneHref });
}
