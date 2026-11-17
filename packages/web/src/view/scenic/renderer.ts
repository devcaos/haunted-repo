import type { ActionSink } from "../../logic/actions.js";
import type { Renderer, ViewModel } from "../../logic/viewModel.js";
import { el } from "./dom.js";
import { createHud } from "./hud.js";
import { createActionGuard } from "./model/actionGuard.js";
import { hudView } from "./model/hudView.js";

/**
 * Builds the Scenic shell once inside `root`, in document order: header, aside,
 * announcer, an empty `main.stage` and the footer last (the Licence_Notice link
 * is the last Tab stop). Every action goes through the guard, so only
 * Available_Actions of the newest model are dispatched (Requirements 2.7, 2.8).
 */
export function createScenicRenderer(
  root: HTMLElement,
  onAction: ActionSink,
): Renderer {
  const guard = createActionGuard(onAction);
  const hud = createHud({
    onSubmit: (url) => {
      guard.send({ type: "submit-live", url });
    },
    onShowSample: () => {
      guard.send({ type: "show-sample" });
    },
  });
  const stage = el("main", { class: "stage" });
  root.replaceChildren(
    el("div", { class: "scenic", "data-scene": "house" }, [
      hud.header,
      hud.aside,
      hud.announcer,
      stage,
      hud.footer,
    ]),
  );
  return {
    render(model: ViewModel): void {
      // Never awaits: timers of later tasks check the newest model themselves.
      guard.setModel(model);
      hud.update(hudView(model));
    },
  };
}
