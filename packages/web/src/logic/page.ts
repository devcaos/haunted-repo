import type {
  HauntedReport,
  Result,
  advance,
  startSession,
} from "@haunted-repo/core";
import type { SampleData } from "../sample/sampleData.js";
import { isAvailable } from "./actions.js";
import type { AvailableAction, UserAction } from "./actions.js";
import { buildLiveHouse, buildSampleHouse } from "./houseView.js";
import { outcomeOf } from "./outcome.js";
import { TEXTS } from "./texts.js";
import type {
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
  engine?: EngineFns; // used by the ghost actions in PR 2
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
}

const FLOORS = ["attic", "middle floor", "basement"] as const;

function sameScene(a: Scene, b: Scene): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createPage(deps: PageDeps, renderer: Renderer): PageController {
  const sample = deps.sample;
  const state: PageState = {
    scene: { kind: "house" },
    lastRenderedScene: null,
    shown: "sample",
    live: null,
    busy: false,
    status: sample.ok
      ? { kind: "none", text: "" }
      : { kind: "error", text: TEXTS.sampleBroken },
  };
  let last: ViewModel | null = null;

  function house(): HouseView | null {
    if (!sample.ok) return null;
    if (state.shown === "live" && state.live !== null) {
      return buildLiveHouse(state.live);
    }
    return buildSampleHouse(sample.value.report, null);
  }

  function licence(): LicenceView | null {
    if (!sample.ok) return null;
    return {
      copyright: sample.value.copyright,
      href: "sirv-license.txt",
      linkText: "Read the MIT licence of lukeed/sirv",
    };
  }

  // Order of the design table. Ghost actions arrive in PR 2.
  function available(): AvailableAction[] {
    if (!sample.ok) return [];
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
    return list;
  }

  function render(): void {
    const previous = state.lastRenderedScene;
    const transition =
      previous === null || sameScene(previous, state.scene)
        ? null
        : { from: previous, to: state.scene };
    const model: ViewModel = {
      scene: state.scene,
      transition,
      house: house(),
      ghost: null,
      live: { formVisible: state.scene.kind !== "ghost", busy: state.busy },
      status: state.status,
      licence: licence(),
      available: available(),
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
          showSample("none", "");
          render();
          break;
        case "submit-live":
          return submitLive(action.url);
        default:
          // Ghost actions arrive in PR 2; they are never available in PR 1.
          break;
      }
      return Promise.resolve();
    },
  };
}
