import type { ActionSink } from "../../logic/actions.js";
import type { Renderer, ViewModel } from "../../logic/viewModel.js";
import { el } from "./dom.js";
import { createHud } from "./hud.js";
import { createActionGuard } from "./model/actionGuard.js";
import { WIDE_QUERY, type ViewportClass } from "./model/camera.js";
import { hudView } from "./model/hudView.js";
import { sceneLayout } from "./model/sceneLayout.js";
import { scenicFocusAfterRender } from "./model/scenicFocus.js";
import { watchMedia } from "./motion.js";
import { createSceneControls } from "./sceneControls.js";
import { createStage, type StageView } from "./stage.js";

/** What the entry outside `view/scenic/` hands in. */
export interface ScenicOptions {
  /** Built URL of the scene illustration, or null to draw the token-colour fallback. */
  sceneHref: string | null;
}

/**
 * Safety net (Requirement 17.9): if this render removed or hid the element that had
 * focus, focus goes to the Scene_Heading, so it never falls back to <body>.
 * A page that never had focus keeps it where it is.
 */
function keepFocusInDocument(
  had: Element | null,
  focusHeading: () => void,
): void {
  if (had === null || had === document.body) return;
  const now = document.activeElement;
  if (
    now === null ||
    now === document.body ||
    !now.isConnected ||
    now.closest("[hidden], [inert]") !== null
  ) {
    focusHeading();
  }
}
/**
 * Builds the Scenic shell once inside `root`, in document order: header, aside,
 * announcer, `main.stage` and the footer last (the Licence_Notice link is the
 * last Tab stop). Every action goes through the guard, so only
 * Available_Actions of the newest model are dispatched (Requirements 2.7, 2.8).
 */
export function createScenicRenderer(
  root: HTMLElement,
  onAction: ActionSink,
  options: ScenicOptions = { sceneHref: null },
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
  const stage = createStage(options.sceneHref);
  const controls = createSceneControls(stage, (action) => guard.send(action));
  const shell = el("div", { class: "scenic", "data-scene": "house" }, [
    hud.header,
    hud.aside,
    hud.announcer,
    stage.element,
    hud.footer,
  ]);
  root.replaceChildren(shell);

  let lastView: StageView | null = null;
  const viewportOf = (wide: boolean): ViewportClass =>
    wide ? "wide" : "narrow";
  // A new viewport class reframes the current Scene at once, with no reload.
  let viewport = viewportOf(
    watchMedia(WIDE_QUERY, (wide) => {
      viewport = viewportOf(wide);
      if (lastView !== null) {
        lastView = { ...lastView, viewport };
        stage.update(lastView);
      }
    }),
  );

  return {
    render(model: ViewModel): void {
      // Never awaits: timers of later tasks check the newest model themselves.
      const prev = guard.current();
      // Focus is read before anything is rebuilt.
      const had = document.activeElement;
      const before = controls.focusBefore();
      guard.setModel(model);
      hud.update(hudView(model));
      const layout = sceneLayout(model);
      shell.setAttribute("data-scene", model.scene.kind);
      // No Camera transition exists yet, so the first render never animates.
      lastView = {
        layout,
        scene: model.scene,
        busy: model.live.busy,
        viewport,
      };
      stage.update(lastView);
      controls.update(layout);
      controls.focus(scenicFocusAfterRender(prev, model, before, layout));
      keepFocusInDocument(had, controls.focusHeading);
    },
  };
}
