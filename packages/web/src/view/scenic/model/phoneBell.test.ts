import { describe, expect, it } from "vitest";
import {
  INITIAL_PHONE_STATE,
  callWaiting,
  phoneStep,
  type PhoneEffect,
  type PhoneEvent,
  type PhoneInputs,
  type PhoneState,
} from "./phoneBell.js";

const SAMPLE: PhoneInputs = {
  source: "sample",
  target: "bench/static.js",
  scene: "house",
  status: "none",
  reportKey: "sample|bench/static.js|builder.js",
};
const NO_TARGET: PhoneInputs = { ...SAMPLE, target: null };
const BUSY: PhoneInputs = { ...SAMPLE, status: "busy", target: null };
const LIVE_DONE: PhoneInputs = {
  source: "live",
  target: null,
  scene: "house",
  status: "done",
  reportKey: "live|a.ts",
};

/** Runs the events in order; returns the final state and every effect list. */
function run(
  events: PhoneEvent[],
  from: PhoneState = INITIAL_PHONE_STATE,
): { state: PhoneState; effects: PhoneEffect[][] } {
  let state = from;
  const effects: PhoneEffect[][] = [];
  for (const event of events) {
    const step = phoneStep(state, event);
    state = step.state;
    effects.push(step.effects);
  }
  return { state, effects };
}

const render = (inputs: PhoneInputs): PhoneEvent => ({
  type: "render",
  inputs,
});

describe("phoneBell", () => {
  it("plays three Rings after intro-ended with a sample target (9.2)", () => {
    const { state, effects } = run([render(SAMPLE), { type: "intro-ended" }]);
    expect(effects[1]).toEqual([{ type: "ring", rings: 3 }]);
    expect(state.mode).toBe("ringing");
  });

  it("plays no Opening_Rings when the first render has no target (9.2)", () => {
    const { state, effects } = run([
      render(NO_TARGET),
      { type: "intro-ended" },
    ]);
    expect(effects[1]).toEqual([{ type: "wait", ms: 20_000 }]);
    expect(state.mode).toBe("idle");
  });

  it("rings nothing before intro-ended", () => {
    const { effects } = run([render(SAMPLE)]);
    expect(effects[0]).toEqual([]);
  });

  it("waits 20 s after the Opening_Rings and rings once when the wait ends (9.3)", () => {
    const { state, effects } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "ring-ended" },
      { type: "wait-ended" },
    ]);
    expect(effects[2]).toEqual([{ type: "wait", ms: 20_000 }]);
    expect(effects[3]).toEqual([{ type: "ring", rings: 1 }]);
    expect(state.mode).toBe("ringing");
  });

  it("waits again when the wait ends with no target or in the Ghost_Scene", () => {
    const idle = run([render(NO_TARGET), { type: "intro-ended" }]).state;
    expect(phoneStep(idle, { type: "wait-ended" }).effects).toEqual([
      { type: "wait", ms: 20_000 },
    ]);
    const inGhost = run([render({ ...SAMPLE, scene: "ghost" })], idle).state;
    expect(phoneStep(inGhost, { type: "wait-ended" }).effects).toEqual([
      { type: "wait", ms: 20_000 },
    ]);
  });

  it("stops the 20 s Rings after a ghost-started that did not come from the Answer_Button (9.3, Q17)", () => {
    const { state, effects } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "ring-ended" },
      { type: "ghost-started" },
      { type: "wait-ended" },
    ]);
    expect(state.started).toBe(true);
    expect(effects[3]).toEqual([{ type: "cancel-wait" }]);
    expect(effects[4]).toEqual([]);
  });

  it("does not end the Opening_Rings with a wait after the first start", () => {
    const { effects } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "ghost-started" },
      { type: "ring-ended" },
    ]);
    expect(effects[3]).toEqual([]);
  });

  it("starts the Live_Call on busy then done with a live report (9.5)", () => {
    const { state, effects } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "ring-ended" },
      render(BUSY),
      render(LIVE_DONE),
    ]);
    expect(effects[3]).toEqual([]);
    expect(effects[4]).toEqual([
      { type: "cancel-wait" },
      { type: "live-call" },
    ]);
    expect(state.mode).toBe("live-call");
    expect(callWaiting(state)).toBe(true);
  });

  it("starts no Live_Call when a live report does not follow busy (9.5)", () => {
    const { state } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      render(LIVE_DONE),
    ]);
    expect(state.mode).not.toBe("live-call");
  });

  it("keeps the Live_Call over Scene changes (9.5)", () => {
    const base = run([
      render(BUSY),
      { type: "intro-ended" },
      render(LIVE_DONE),
    ]);
    expect(base.state.mode).toBe("live-call");
    const moved = run(
      [
        render({ ...LIVE_DONE, scene: "floor" }),
        render({ ...LIVE_DONE, scene: "house" }),
      ],
      base.state,
    );
    expect(moved.effects).toEqual([[], []]);
    expect(moved.state.mode).toBe("live-call");
  });

  it.each<[string, PhoneInputs]>([
    ["another report", { ...LIVE_DONE, reportKey: "live|b.ts" }],
    ["the sample", SAMPLE],
    ["an error", { ...LIVE_DONE, status: "error" }],
    ["busy", { ...LIVE_DONE, status: "busy" }],
  ])("stops the Live_Call on %s (9.5)", (_name, inputs) => {
    const live = run([
      render(BUSY),
      { type: "intro-ended" },
      render(LIVE_DONE),
    ]).state;
    const step = phoneStep(live, render(inputs));
    expect(step.effects[0]).toEqual({ type: "stop" });
    expect(step.state.mode).toBe("idle");
  });

  it("stops the Live_Call when answered, and answered always yields stop (9.12)", () => {
    const live = run([
      render(BUSY),
      { type: "intro-ended" },
      render(LIVE_DONE),
    ]).state;
    const step = phoneStep(live, { type: "answered" });
    expect(step.effects).toContainEqual({ type: "stop" });
    expect(step.state.mode).toBe("idle");
    expect(step.state.started).toBe(true);
    expect(
      phoneStep(INITIAL_PHONE_STATE, { type: "answered" }).effects,
    ).toContainEqual({ type: "stop" });
  });

  it("stops a Ring when answered and rings no more after that (9.12, 9.3)", () => {
    const { state, effects } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "answered" },
      { type: "wait-ended" },
    ]);
    expect(effects[2]).toContainEqual({ type: "stop" });
    expect(effects[3]).toEqual([]);
    expect(state.mode).toBe("idle");
  });

  it("rings once after the Return_Glow that follows an Exorcised_Moment (9.4)", () => {
    const { state, effects } = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "ghost-started" },
      { type: "ring-ended" },
      { type: "exorcised-moment" },
      { type: "return-glow-ended" },
      { type: "ring-ended" },
      { type: "return-glow-ended" },
    ]);
    expect(effects[5]).toEqual([{ type: "ring", rings: 1 }]);
    expect(effects[7]).toEqual([]);
    expect(state.mode).toBe("idle");
  });

  it("rings no Return_Glow Ring without a target or without an Exorcised_Moment (9.4)", () => {
    const started = run([
      render(SAMPLE),
      { type: "intro-ended" },
      { type: "ghost-started" },
      { type: "ring-ended" },
    ]).state;
    expect(phoneStep(started, { type: "return-glow-ended" }).effects).toEqual(
      [],
    );
    const noTarget = run(
      [render(NO_TARGET), { type: "exorcised-moment" }],
      started,
    ).state;
    expect(phoneStep(noTarget, { type: "return-glow-ended" }).effects).toEqual(
      [],
    );
  });

  it("says a call is waiting for a sample with a target only (9.14)", () => {
    expect(callWaiting(INITIAL_PHONE_STATE)).toBe(false);
    expect(callWaiting(run([render(SAMPLE)]).state)).toBe(true);
    expect(callWaiting(run([render(NO_TARGET)]).state)).toBe(false);
    expect(callWaiting(run([render(LIVE_DONE)]).state)).toBe(false);
  });
});
