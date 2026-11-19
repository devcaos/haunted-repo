import type { StatusKind } from "../../../logic/viewModel.js";

/** What the machine needs to know about one render. */
export interface PhoneInputs {
  /** Null when `house` is null. */
  source: "sample" | "live" | null;
  /** Telephone_Target: the first startable Card, or null. */
  target: string | null;
  scene: "house" | "floor" | "ghost";
  status: StatusKind;
  /** Source plus every Card path, in order: a different key is a different report. */
  reportKey: string | null;
}

export type PhoneEvent =
  | { type: "render"; inputs: PhoneInputs }
  /** The first House_Scene is on screen (the Intro is cut, D13). */
  | { type: "intro-ended" }
  | { type: "ring-ended" }
  | { type: "wait-ended" }
  | { type: "answered" }
  /** Any `start-ghost` was dispatched, whatever control sent it (Q17). */
  | { type: "ghost-started" }
  | { type: "exorcised-moment" }
  | { type: "return-glow-ended" };

export type PhoneEffect =
  /** 2 s per Ring. */
  | { type: "ring"; rings: 1 | 3 }
  /** A Ring without a pause. */
  | { type: "live-call" }
  | { type: "stop" }
  | { type: "wait"; ms: 20_000 }
  | { type: "cancel-wait" };

export interface PhoneState {
  mode: "before-start" | "idle" | "ringing" | "live-call";
  /** A `start-ghost` was dispatched or the Answer_Button was used, at least once in this load (9.3, 9.4). */
  started: boolean;
  exorcisedSinceRing: boolean;
  last: PhoneInputs | null;
}

export const WAIT_MS = 20_000;

export const INITIAL_PHONE_STATE: PhoneState = {
  mode: "before-start",
  started: false,
  exorcisedSinceRing: false,
  last: null,
};

interface Step {
  state: PhoneState;
  effects: PhoneEffect[];
}

const WAIT: PhoneEffect = { type: "wait", ms: WAIT_MS };

/** The sample offers a Telephone_Target in a Scene where the Telephone is drawn. */
function sampleCallReady(inputs: PhoneInputs | null): boolean {
  return (
    inputs !== null &&
    inputs.source === "sample" &&
    inputs.target !== null &&
    inputs.scene !== "ghost"
  );
}

function render(state: PhoneState, inputs: PhoneInputs): Step {
  const prev = state.last;
  const next: PhoneState = { ...state, last: inputs };
  if (state.mode === "live-call") {
    const sameReport =
      inputs.source === "live" &&
      prev !== null &&
      inputs.reportKey === prev.reportKey;
    const broken = inputs.status === "error" || inputs.status === "busy";
    if (sameReport && !broken) return { state: next, effects: [] };
    return {
      state: { ...next, mode: "idle" },
      effects: state.started ? [{ type: "stop" }] : [{ type: "stop" }, WAIT],
    };
  }
  if (
    inputs.source === "live" &&
    inputs.status === "done" &&
    prev !== null &&
    prev.status === "busy"
  ) {
    return {
      state: { ...next, mode: "live-call" },
      effects: [{ type: "cancel-wait" }, { type: "live-call" }],
    };
  }
  return { state: next, effects: [] };
}

/**
 * The Telephone state machine (Requirement 9). Pure: the renderer runs the
 * effects with `window.setTimeout` and feeds the timer ends back as events.
 * A timer end that arrives in a mode that does not expect it is ignored.
 */
export function phoneStep(state: PhoneState, event: PhoneEvent): Step {
  switch (event.type) {
    case "render":
      return render(state, event.inputs);
    case "intro-ended": {
      if (state.mode !== "before-start") return { state, effects: [] };
      if (!state.started && sampleCallReady(state.last)) {
        return {
          state: { ...state, mode: "ringing", exorcisedSinceRing: false },
          effects: [{ type: "ring", rings: 3 }],
        };
      }
      return {
        state: { ...state, mode: "idle" },
        effects: state.started ? [] : [WAIT],
      };
    }
    case "ring-ended":
      if (state.mode !== "ringing") return { state, effects: [] };
      return {
        state: { ...state, mode: "idle" },
        effects: state.started ? [] : [WAIT],
      };
    case "wait-ended":
      if (state.mode !== "idle" || state.started) {
        return { state, effects: [] };
      }
      if (sampleCallReady(state.last)) {
        return {
          state: { ...state, mode: "ringing", exorcisedSinceRing: false },
          effects: [{ type: "ring", rings: 1 }],
        };
      }
      return { state, effects: [WAIT] };
    case "answered":
      return {
        state: {
          ...state,
          started: true,
          mode: state.mode === "before-start" ? state.mode : "idle",
        },
        effects: [{ type: "stop" }, { type: "cancel-wait" }],
      };
    case "ghost-started":
      return {
        state: { ...state, started: true },
        effects: [{ type: "cancel-wait" }],
      };
    case "exorcised-moment":
      return { state: { ...state, exorcisedSinceRing: true }, effects: [] };
    case "return-glow-ended":
      if (
        state.mode === "idle" &&
        state.started &&
        state.exorcisedSinceRing &&
        state.last !== null &&
        state.last.target !== null &&
        state.last.scene !== "ghost"
      ) {
        return {
          state: { ...state, mode: "ringing", exorcisedSinceRing: false },
          effects: [{ type: "ring", rings: 1 }],
        };
      }
      return { state, effects: [] };
  }
}

/** True when the Answer_Button's accessible name also says a call is waiting (9.14). */
export function callWaiting(state: PhoneState): boolean {
  return (
    state.mode === "live-call" ||
    (state.last !== null &&
      state.last.source === "sample" &&
      state.last.target !== null)
  );
}
