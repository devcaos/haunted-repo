import type { ActionSink, UserAction } from "../../logic/actions.js";
import type { Renderer, ViewModel } from "../../logic/viewModel.js";
import { el } from "./dom.js";
import { createHud } from "./hud.js";
import { createActionGuard } from "./model/actionGuard.js";
import { WIDE_QUERY, type ViewportClass } from "./model/camera.js";
import { hudView } from "./model/hudView.js";
import {
  INITIAL_PHONE_STATE,
  callWaiting,
  phoneStep,
  type PhoneEvent,
  type PhoneInputs,
} from "./model/phoneBell.js";
import { sceneLayout, type Frame } from "./model/sceneLayout.js";
import { scenicFocusAfterRender } from "./model/scenicFocus.js";
import { watchMedia } from "./motion.js";
import {
  createPhoneWidget,
  type PhonePlace,
  type PhoneView,
} from "./phoneWidget.js";
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
 * The widget sits under the painted telephone on wide screens in the House and
 * middle-floor frames, and in the scene dock everywhere else (narrow screens
 * always dock it, so it never covers the house).
 */
function phonePlace(frame: Frame, viewport: ViewportClass): PhonePlace {
  const hall =
    frame.kind === "house" ||
    (frame.kind === "floor" && frame.floor === "middle floor");
  return viewport === "wide" && hall ? "pinned" : "docked";
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
  let phoneState = INITIAL_PHONE_STATE;
  let ringTimer: number | null = null;
  let waitTimer: number | null = null;
  let announceTimer: number | null = null;
  let introSent = false;
  let lastView: StageView | null = null;
  let phoneView: PhoneView = { source: null, target: null, powerLine: null };
  const telephoneLayer = stage.element.querySelector("g.telephone");
  /** Every `start-ghost` of the page goes through here, so the bell hears of it (Q17). */
  const send = (action: UserAction): boolean => {
    const sent = guard.send(action);
    if (sent && action.type === "start-ghost") {
      dispatchPhone({ type: "ghost-started" });
    }
    return sent;
  };
  const controls = createSceneControls(stage, send);
  const phone = createPhoneWidget(
    stage,
    send,
    // Empty first, then fill after 50 ms, so a repeated sentence is announced again.
    (text) => {
      if (announceTimer !== null) window.clearTimeout(announceTimer);
      hud.announcer.textContent = "";
      announceTimer = window.setTimeout(() => {
        announceTimer = null;
        hud.announcer.textContent = text;
      }, 50);
    },
    () => {
      dispatchPhone({ type: "answered" });
    },
  );
  const shell = el("div", { class: "scenic", "data-scene": "house" }, [
    hud.header,
    hud.aside,
    hud.announcer,
    stage.element,
    hud.footer,
  ]);
  root.replaceChildren(shell);

  /** Puts the widget in its place for the last Stage view; false keeps the Phone_Bubble. */
  const placePhone = (sceneChanged: boolean): void => {
    if (lastView === null) return;
    phone.update({
      place: phonePlace(lastView.layout.frame, lastView.viewport),
      visible: lastView.scene.kind !== "ghost",
      sceneChanged,
      phone: phoneView,
      callWaiting: callWaiting(phoneState),
    });
  };
  const clearRing = (): void => {
    if (ringTimer !== null) window.clearTimeout(ringTimer);
    ringTimer = null;
  };
  const clearWait = (): void => {
    if (waitTimer !== null) window.clearTimeout(waitTimer);
    waitTimer = null;
  };
  /** `is-ringing` on the widget and the telephone layer: Ringing or Live_Call, never in the Ghost_Scene. */
  const showRinging = (): void => {
    const mode = phoneState.mode;
    const scene = guard.current()?.scene.kind;
    const on =
      (mode === "ringing" || mode === "live-call") && scene !== "ghost";
    phone.element.classList.toggle("is-ringing", on);
    telephoneLayer?.classList.toggle("is-ringing", on);
  };
  /** Feeds the bell and runs its effects. Timers read the newest model when they fire. */
  function dispatchPhone(event: PhoneEvent, refresh = true): void {
    const step = phoneStep(phoneState, event);
    phoneState = step.state;
    for (const effect of step.effects) {
      switch (effect.type) {
        case "ring":
          clearRing();
          ringTimer = window.setTimeout(() => {
            ringTimer = null;
            dispatchPhone({ type: "ring-ended" });
          }, effect.rings * 2000);
          break;
        case "live-call":
        case "stop":
          clearRing();
          break;
        case "wait":
          clearWait();
          waitTimer = window.setTimeout(() => {
            waitTimer = null;
            dispatchPhone({ type: "wait-ended" });
          }, effect.ms);
          break;
        case "cancel-wait":
          clearWait();
          break;
      }
    }
    showRinging();
    if (refresh) placePhone(false);
  }
  const viewportOf = (wide: boolean): ViewportClass =>
    wide ? "wide" : "narrow";
  // A new viewport class reframes the current Scene at once, with no reload.
  let viewport = viewportOf(
    watchMedia(WIDE_QUERY, (wide) => {
      viewport = viewportOf(wide);
      if (lastView !== null) {
        lastView = { ...lastView, viewport };
        stage.update(lastView);
        placePhone(false);
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
      phoneView = {
        source: model.house?.source ?? null,
        target: layout.telephoneTarget,
        powerLine: model.house?.powerLine ?? null,
      };
      const inputs: PhoneInputs = {
        source: phoneView.source,
        target: phoneView.target,
        scene: model.scene.kind,
        status: model.status.kind,
        reportKey:
          model.house === null
            ? null
            : [
                model.house.source,
                ...model.house.floors.flatMap((f) =>
                  f.ghosts.map((g) => g.path),
                ),
              ].join("|"),
      };
      dispatchPhone({ type: "render", inputs }, false);
      // The Intro is cut: the Opening_Rings start at the first House_Scene.
      if (!introSent && model.scene.kind === "house") {
        introSent = true;
        dispatchPhone({ type: "intro-ended" }, false);
      }
      placePhone(model.transition !== null);
      controls.update(layout);
      controls.focus(scenicFocusAfterRender(prev, model, before, layout));
      keepFocusInDocument(had, controls.focusHeading);
    },
  };
}
