import type { ViewModel } from "../../../logic/viewModel.js";
import { focusAfterRender, type FocusBefore } from "../../shared/focus.js";
import type { SceneLayout } from "./sceneLayout.js";

/** Where the Scenic_Renderer puts keyboard focus after a render. */
export type ScenicFocusTarget =
  { kind: "keep" } | { kind: "scene-heading" } | { kind: "key"; key: string };

/**
 * Decides where focus goes after `next` is drawn (Requirements 17.7, 17.8).
 *
 * - A Scene change that leaves the Ghost_Scene: the start button of that
 *   ghost when the new Scene still offers it, else the Scene_Heading.
 * - Any other Scene change: the Scene_Heading.
 * - No Scene change: the shared rule `focusAfterRender`, with its two heading
 *   targets read as the Scene_Heading.
 */
export function scenicFocusAfterRender(
  prev: ViewModel | null,
  next: ViewModel,
  before: FocusBefore,
  layout: SceneLayout,
): ScenicFocusTarget {
  const { transition } = next;
  if (transition !== null) {
    if (transition.from.kind === "ghost") {
      return layout.startControls.includes(transition.from.path)
        ? { kind: "key", key: `start-ghost:${transition.from.path}` }
        : { kind: "scene-heading" };
    }
    return { kind: "scene-heading" };
  }
  const target = focusAfterRender(prev, next, before);
  return target.kind === "ghost-heading" || target.kind === "list-heading"
    ? { kind: "scene-heading" }
    : target;
}
