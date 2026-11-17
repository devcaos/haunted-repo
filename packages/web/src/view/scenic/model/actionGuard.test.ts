import { describe, expect, it } from "vitest";
import type { AvailableAction, UserAction } from "../../../logic/actions.js";
import type { ViewModel } from "../../../logic/viewModel.js";
import { createActionGuard } from "./actionGuard.js";

function modelWith(available: AvailableAction[]): ViewModel {
  return {
    scene: { kind: "house" },
    transition: null,
    house: null,
    ghost: null,
    live: { formVisible: true, busy: false },
    status: { kind: "none", text: "" },
    licence: null,
    available,
  };
}

function guardWithSink(): {
  sent: UserAction[];
  guard: ReturnType<typeof createActionGuard>;
} {
  const sent: UserAction[] = [];
  return { sent, guard: createActionGuard((action) => sent.push(action)) };
}

describe("createActionGuard", () => {
  it("sends nothing before the first model", () => {
    const { sent, guard } = guardWithSink();
    expect(guard.current()).toBeNull();
    expect(guard.send({ type: "show-sample" })).toBe(false);
    expect(sent).toEqual([]);
  });

  it("sends an available action once", () => {
    const { sent, guard } = guardWithSink();
    guard.setModel(modelWith([{ type: "show-sample" }]));
    expect(guard.send({ type: "show-sample" })).toBe(true);
    expect(sent).toEqual([{ type: "show-sample" }]);
  });

  it("drops an action that is not available", () => {
    const { sent, guard } = guardWithSink();
    guard.setModel(modelWith([{ type: "show-sample" }]));
    expect(guard.send({ type: "go-to-house" })).toBe(false);
    expect(guard.send({ type: "go-to-floor", floor: "attic" })).toBe(false);
    expect(sent).toEqual([]);
  });

  it("matches submit-live with any URL", () => {
    const { sent, guard } = guardWithSink();
    guard.setModel(modelWith([{ type: "submit-live" }]));
    expect(guard.send({ type: "submit-live", url: "" })).toBe(true);
    expect(guard.send({ type: "submit-live", url: " a/b " })).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it("uses the newest model after a second setModel", () => {
    const { sent, guard } = guardWithSink();
    const first = modelWith([{ type: "show-sample" }]);
    const second = modelWith([{ type: "go-to-house" }]);
    guard.setModel(first);
    guard.setModel(second);
    expect(guard.current()).toBe(second);
    expect(guard.send({ type: "show-sample" })).toBe(false);
    expect(guard.send({ type: "go-to-house" })).toBe(true);
    expect(sent).toEqual([{ type: "go-to-house" }]);
  });
});
