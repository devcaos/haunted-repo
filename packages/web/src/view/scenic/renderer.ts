import type { ActionSink, UserAction } from "../../logic/actions.js";
import type { Renderer, ViewModel } from "../../logic/viewModel.js";
import type { GateHrefs } from "./art/gate.js";
import { el } from "./dom.js";
import { createGate } from "./gate.js";
import { createGhostScene } from "./ghostScene.js";
import { createGrimoire } from "./grimoire.js";
import { grimoireView } from "./model/grimoireView.js";
import { EMPTY_MEMORY, nextMemory } from "./model/renderMemory.js";
import {
  reactionFor,
  VIGOUR_START,
  vigourAfterAction,
  vigourAfterRender,
  vigourStyle,
} from "./model/reactions.js";
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
import { createMotionToggle } from "./motionToggle.js";
import { createLightningToggle } from "./lightningToggle.js";
import { createLightning } from "./effects.js";
import { POWER_TEXTS } from "../../logic/powerTexts.js";
import { TEXTS } from "../../logic/texts.js";
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
  /** Built URLs of the Gate_Panel pictures; a missing one is not drawn. */
  gate: GateHrefs;
  /** Built URL of the room illustration of the Ghost_Scene, or null for the plain backdrop. */
  roomHref?: string | null;
}

const NO_GATE: GateHrefs = {
  frame: null,
  gargoyle: null,
  lantern: null,
  pumpkin: null,
};

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
  options: ScenicOptions = { sceneHref: null, gate: NO_GATE },
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
  let memory = EMPTY_MEMORY;
  let vigour = VIGOUR_START;
  /** The action being dispatched now: its render applies it to the vigour first. */
  let sending: UserAction | null = null;
  /** Every `start-ghost` of the page goes through here, so the bell hears of it (Q17). */
  const send = (action: UserAction): boolean => {
    const inRoom = guard.current()?.scene.kind === "ghost";
    sending = action;
    const sent = guard.send(action);
    sending = null;
    if (sent && action.type === "start-ghost") {
      dispatchPhone({ type: "ghost-started" });
    }
    if (!sent) return sent;
    // Reactions are visual state only: they never change the model or focus (11.9).
    const kind = reactionFor(action);
    if (inRoom && kind !== null && guard.current()?.scene.kind === "ghost") {
      room.react(kind);
    }
    return sent;
  };
  const controls = createSceneControls(stage, send);
  const grimoire = createGrimoire(send);
  const room = createGhostScene(options.roomHref ?? null, grimoire);
  stage.element.append(room.element);
  /** The parts of the stage behind the room: never reachable while the room is shown (10.13, 17.14). */
  const behindRoom = [
    stage.element.querySelector(".world"),
    stage.dock,
    stage.floorStair,
    stage.nameplates,
    stage.sceneBar,
  ].filter((n): n is HTMLElement => n instanceof HTMLElement);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionOff = (): boolean => shell.getAttribute("data-motion") === "off";
  /** Exorcised_Moment length (D6): 1400 ms, 200 ms reduced, none with Motion off. */
  const momentMs = (): number =>
    motionOff() ? 0 : reduced.matches ? 200 : 1400;
  /** Return_Glow length: 800 ms, 200 ms reduced, none with Motion off. */
  const glowMs = (): number => (motionOff() ? 0 : reduced.matches ? 200 : 800);
  let glowEndTimer: number | null = null;
  /** How long the room takes to fade out: none with Motion off, 150 ms reduced, else 300 ms. */
  const leaveMs = (): number =>
    shell.getAttribute("data-motion") === "off"
      ? 0
      : reduced.matches
        ? 150
        : 300;
  // Empty first, then fill after 50 ms, so a repeated sentence is announced again.
  const announce = (text: string): void => {
    if (announceTimer !== null) window.clearTimeout(announceTimer);
    hud.announcer.textContent = "";
    announceTimer = window.setTimeout(() => {
      announceTimer = null;
      hud.announcer.textContent = text;
    }, 50);
  };
  const phone = createPhoneWidget(stage, send, announce, () => {
    dispatchPhone({ type: "answered" });
  });
  // The Gate_Panel is decoration around the HUD: the wide drawing comes
  // first and is skipped by screen readers; the narrow pieces sit inside the
  // header and the footer, so the Tab order does not change.
  const gate = createGate(options.gate);
  if (gate.crown !== null) hud.header.prepend(gate.crown);
  if (gate.base !== null) hud.footer.append(gate.base);
  const shell = el("div", { class: "scenic", "data-scene": "house" }, [
    gate.wide,
    gate.lights,
    hud.header,
    hud.aside,
    hud.announcer,
    stage.element,
    hud.footer,
    gate.ground,
  ]);
  let finaleShown = false;
  let momentEnds = 0;
  const lightning = createLightning(stage.element, () => {
    const model = guard.current();
    return {
      toggleOn: toggle.isOn(),
      reducedMotion: reduced.matches,
      scene: model?.scene.kind ?? "house",
      finale: finaleShown,
      ringPlaying: phoneState.mode === "ringing",
      exorcisedMomentPlaying: performance.now() < momentEnds,
    };
  });
  const toggle = createLightningToggle(reduced, (on) => {
    if (on) lightning.restart();
    else lightning.stop();
  });
  // Last in the HUD aside, so both buttons come before the Answer_Button in
  // the Tab order (17.4); on wide screens the CSS draws them on the plinth.
  toggle.element.prepend(createMotionToggle(shell));
  hud.aside.append(toggle.element);
  if (toggle.isOn()) lightning.restart();
  /** The Finale banner: HTML in the stage, above the house (13.4, 13.5). */
  const banner = el("div", { class: "finale-banner", hidden: "" });
  stage.element.prepend(banner);
  root.replaceChildren(shell);
  gate.raise(shell, stage.element.querySelector("image.scene-art"));

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
      const before = grimoire.focusBefore() ?? controls.focusBefore();
      guard.setModel(model);
      const step = nextMemory(memory, model);
      memory = step.memory;
      const effects = step.effects;
      hud.update(hudView(model, effects));
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
      const inRoom = model.scene.kind === "ghost";
      for (const part of behindRoom) part.inert = inRoom;
      const book = grimoireView(model);
      const entering = inRoom && !room.open;
      if (inRoom && book !== null && layout.closeUp !== null) {
        room.show({
          path: model.scene.kind === "ghost" ? model.scene.path : "",
          closeUp: layout.closeUp,
          grimoire: book,
        });
        if (sending !== null) vigour = vigourAfterAction(vigour, sending);
        vigour = vigourAfterRender(vigour, prev, model);
        room.setVigour(vigourStyle(vigour));
        // Only inside the room: a moment in a list render (design Q18, not
        // reachable today) shows only the Return_Glow, never the spiral.
        if (effects.exorcisedMoments.length > 0) {
          room.exorcise(momentMs());
          momentEnds = performance.now() + momentMs();
          dispatchPhone({ type: "exorcised-moment" }, false);
        }
      } else {
        room.hide(leaveMs());
      }
      if (!inRoom && effects.returnGlow.length > 0) {
        const ms = glowMs();
        stage.glow(effects.returnGlow, ms);
        if (glowEndTimer !== null) window.clearTimeout(glowEndTimer);
        glowEndTimer = window.setTimeout(() => {
          glowEndTimer = null;
          dispatchPhone({ type: "return-glow-ended" });
        }, ms);
      }
      finaleShown = effects.finale.shown;
      stage.element.classList.toggle(
        "is-finale-in",
        effects.finale.shown &&
          (effects.finale.animate ||
            stage.element.classList.contains("is-finale-in")),
      );
      banner.hidden = !effects.finale.shown;
      if (effects.finale.shown) {
        const clean = model.house?.houseClean ?? null;
        const lines =
          clean === null
            ? [TEXTS.finaleDone, POWER_TEXTS.finaleOtherGhosts]
            : [clean];
        if (banner.dataset["text"] !== lines.join(" ")) {
          banner.dataset["text"] = lines.join(" ");
          banner.replaceChildren(
            ...lines.map((line, i) =>
              el("p", { class: `line-${i + 1}` }, [line]),
            ),
          );
        }
      }
      if (effects.finale.announce) announce(banner.dataset["text"] ?? "");
      // Below 64rem the room is in the page flow: entering it shows its top, with the ghost.
      if (entering && viewport === "narrow") {
        const top = room.element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: "instant" });
      }
      const target = scenicFocusAfterRender(prev, model, before, layout);
      if (inRoom) {
        grimoire.focus(target);
        keepFocusInDocument(had, grimoire.focusHeading);
        // Below 64rem a new Grimoire screen above the window scrolls back to its heading.
        if (
          !entering &&
          viewport === "narrow" &&
          target.kind === "scene-heading"
        ) {
          const top = grimoire.element.getBoundingClientRect().top;
          if (top < 0) {
            window.scrollTo({ top: top + window.scrollY, behavior: "instant" });
          }
        }
      } else {
        controls.focus(target);
        keepFocusInDocument(had, controls.focusHeading);
      }
    },
  };
}
