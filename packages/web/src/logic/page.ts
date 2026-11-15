import {
  ALLOWED_EVENTS,
  advance as coreAdvance,
  startSession as coreStartSession,
} from "@haunted-repo/core";
import type {
  ExorcismStep,
  Floor,
  HauntedReport,
  Result,
  SessionState,
  advance,
  startSession,
} from "@haunted-repo/core";
import type { SampleData } from "../sample/sampleData.js";
import { isAvailable } from "./actions.js";
import type { AvailableAction, UserAction } from "./actions.js";
import { contentOf } from "./demoScript.js";
import type { DemoScript } from "./demoScript.js";
import { buildGhostView, eventFor, ghostActions } from "./exorcism.js";
import { buildLiveHouse, buildSampleHouse } from "./houseView.js";
import { outcomeOf } from "./outcome.js";
import { TEXTS } from "./texts.js";
import type {
  GhostView,
  HouseView,
  LicenceView,
  Renderer,
  Scene,
  StatusKind,
  ViewModel,
} from "./viewModel.js";

/** Narrow on purpose: `(url) => detectGhosts(url)` is assignable to it. */
export type DetectFn = (url: string) => Promise<Result<HauntedReport>>;

/** The two engine functions, injectable so tests can count calls. Defaults to Core's. */
export interface EngineFns {
  startSession: typeof startSession;
  advance: typeof advance;
}

export interface PageDeps {
  detect: DetectFn;
  sample: Result<SampleData, string>; // from loadSample
  script: DemoScript | null; // null when there is no valid Demo_Script
  engine?: EngineFns;
}

export interface PageController {
  start(): void; // first render; no network
  dispatch(action: UserAction): Promise<void>; // resolves after the last render of this action
  current(): ViewModel; // the last rendered model (tests and wiring)
}

interface PageState {
  scene: Scene;
  lastRenderedScene: Scene | null; // to compute the transition
  shown: "sample" | "live";
  live: HauntedReport | null;
  busy: boolean;
  status: { kind: StatusKind; text: string };
  session: SessionState | null; // the Sample_Session; null only when the sample failed to load
  revealed: boolean; // model answer shown in asking
}

const FLOORS = ["attic", "middle floor", "basement"] as const;

/** Steps in which a ghost is open (scene "ghost"). */
const GHOST_STEPS: readonly ExorcismStep[] = [
  "explaining",
  "asking",
  "simplifying",
  "model-answer",
  "self-check",
  "failed",
];

function sameScene(a: Scene, b: Scene): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createPage(deps: PageDeps, renderer: Renderer): PageController {
  const sample = deps.sample;
  const engine: EngineFns = deps.engine ?? {
    startSession: coreStartSession,
    advance: coreAdvance,
  };
  const scripted: ReadonlySet<string> = new Set(
    (deps.script?.ghosts ?? []).map((ghost) => ghost.path),
  );
  const state: PageState = {
    scene: { kind: "house" },
    lastRenderedScene: null,
    shown: "sample",
    live: null,
    busy: false,
    status: sample.ok
      ? { kind: "none", text: "" }
      : { kind: "error", text: TEXTS.sampleBroken },
    session: sample.ok ? engine.startSession(sample.value.report).state : null,
    revealed: false,
  };
  let last: ViewModel | null = null;

  function house(): HouseView | null {
    if (!sample.ok) return null;
    if (state.shown === "live" && state.live !== null) {
      return buildLiveHouse(state.live);
    }
    const session = state.session;
    return buildSampleHouse(
      sample.value.report,
      session === null
        ? null
        : {
            progress: session.progress,
            step: session.step,
            scripted,
            startAllowed: !state.busy && state.scene.kind !== "ghost",
          },
    );
  }

  function ghost(): GhostView | null {
    const session = state.session;
    if (state.scene.kind !== "ghost" || session === null || !sample.ok) {
      return null;
    }
    const content = contentOf(deps.script, state.scene.path);
    if (content === null) return null;
    const text = sample.value.texts[state.scene.path] ?? "";
    return buildGhostView(session, content, text, state.revealed);
  }

  function licence(): LicenceView | null {
    if (!sample.ok) return null;
    return {
      copyright: sample.value.copyright,
      href: "sirv-license.txt",
      linkText: "Read the MIT licence of lukeed/sirv",
    };
  }

  // Order of the design table. In the ghost scene only the ghost actions of
  // the step are available: the form is hidden, so no submit-live either.
  function available(model: HouseView | null): AvailableAction[] {
    if (!sample.ok) return [];
    if (state.scene.kind === "ghost") {
      return state.session === null
        ? []
        : ghostActions(state.session.step, state.revealed);
    }
    const list: AvailableAction[] = [];
    if (!state.busy) list.push({ type: "submit-live" });
    const focus = state.scene.kind === "floor" ? state.scene.floor : null;
    for (const floor of FLOORS) {
      if (floor !== focus) list.push({ type: "go-to-floor", floor });
    }
    if (state.scene.kind === "floor") list.push({ type: "go-to-house" });
    if (!state.busy && state.shown === "live") {
      list.push({ type: "show-sample" });
    }
    for (const floor of model?.floors ?? []) {
      for (const card of floor.ghosts) {
        if (card.canStart) list.push({ type: "start-ghost", path: card.path });
      }
    }
    return list;
  }

  function render(): void {
    const previous = state.lastRenderedScene;
    const transition =
      previous === null || sameScene(previous, state.scene)
        ? null
        : { from: previous, to: state.scene };
    const houseView = house();
    const model: ViewModel = {
      scene: state.scene,
      transition,
      house: houseView,
      ghost: ghost(),
      live: { formVisible: state.scene.kind !== "ghost", busy: state.busy },
      status: state.status,
      licence: licence(),
      available: available(houseView),
    };
    state.lastRenderedScene = state.scene;
    last = model;
    renderer.render(model); // never awaited: render returns void
  }

  function showSample(kind: StatusKind, text: string): void {
    state.shown = "sample";
    state.scene = { kind: "house" };
    state.status = { kind, text };
  }

  // Single flight: submit-live is not available while busy, so a second submit
  // is ignored by dispatch. busy is set before the first await and reset in finally.
  // It never touches the Sample_Session.
  async function submitLive(url: string): Promise<void> {
    state.busy = true;
    state.status = { kind: "busy", text: TEXTS.busy };
    render();
    try {
      const result = await deps.detect(url); // as typed: Core trims and validates
      if (result.ok) {
        const { owner, repo } = result.value.overview;
        state.live = result.value;
        state.shown = "live";
        state.scene = { kind: "house" };
        state.status = {
          kind: "done",
          text: TEXTS.liveDone(owner, repo, result.value.ghosts.length),
        };
      } else if (outcomeOf(result.error.code) === "show-message") {
        state.status = { kind: "error", text: result.error.message };
      } else {
        showSample("fallback", TEXTS.fallback);
      }
    } catch {
      showSample("fallback", TEXTS.fallback); // a throw is treated as "fallback"
    } finally {
      state.busy = false;
      render();
    }
  }

  function floorOf(path: string): Floor | null {
    if (!sample.ok) return null;
    return (
      sample.value.report.ghosts.find((g) => g.path === path)?.floor ?? null
    );
  }

  /** The path of the open ghost: from the scene, or from start-ghost. */
  function ghostPath(action: UserAction): string | null {
    if (action.type === "start-ghost") return action.path;
    return state.scene.kind === "ghost" ? state.scene.path : null;
  }

  /** Back to the floor of the ghost that was open (leave, back, self-check). */
  function leaveTo(path: string): void {
    const floor = floorOf(path);
    state.scene = floor === null ? { kind: "house" } : { kind: "floor", floor };
  }

  /** Engine error (should never happen): restart from the progress, go home. */
  function engineFailed(session: SessionState): void {
    if (sample.ok) {
      state.session = engine.startSession(sample.value.report, {
        progress: session.progress,
      }).state;
    }
    state.revealed = false;
    state.scene = { kind: "house" };
    state.status = { kind: "error", text: TEXTS.engineError };
  }

  function ghostAction(action: UserAction): void {
    const session = state.session;
    const path = ghostPath(action);
    if (session === null || path === null || !sample.ok) return;
    if (action.type === "show-model-answer") {
      state.revealed = true; // local only, no engine event
      render();
      return;
    }
    if (action.type === "back-to-list") {
      leaveTo(path); // no engine event: failed accepts pick-ghost from the list
      render();
      return;
    }
    const content = contentOf(deps.script, path);
    const text = sample.value.texts[path];
    if (content === null || text === undefined) return;
    const event = eventFor(action, session, content, text);
    if (event === null || !ALLOWED_EVENTS[session.step].includes(event.type)) {
      return; // cannot happen when the availability table is right
    }
    const result = engine.advance(session, event);
    if (!result.ok) {
      engineFailed(session);
      render();
      return;
    }
    state.session = result.state;
    state.revealed = false;
    const step = result.state.step;
    if (GHOST_STEPS.includes(step)) {
      const floor = floorOf(path);
      if (floor !== null) state.scene = { kind: "ghost", floor, path };
    } else if (step === "house-clean") {
      state.scene = { kind: "house" };
    } else {
      leaveTo(path); // choosing: after leave-ghost or a self-check answer
    }
    render();
  }

  return {
    start: render,
    current() {
      if (last === null) throw new Error("start() was not called");
      return last;
    },
    dispatch(action) {
      if (last === null || !isAvailable(last, action)) {
        return Promise.resolve();
      }
      switch (action.type) {
        case "go-to-floor":
          state.scene = { kind: "floor", floor: action.floor };
          render();
          break;
        case "go-to-house":
          state.scene = { kind: "house" };
          render();
          break;
        case "show-sample":
          showSample("none", ""); // the Sample_Session is shown with its progress
          render();
          break;
        case "submit-live":
          return submitLive(action.url);
        default:
          ghostAction(action);
          break;
      }
      return Promise.resolve();
    },
  };
}
