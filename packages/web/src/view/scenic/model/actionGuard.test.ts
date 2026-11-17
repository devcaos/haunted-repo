import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  isAvailable,
  type AvailableAction,
  type UserAction,
} from "../../../logic/actions.js";
import type { ViewModel } from "../../../logic/viewModel.js";
import { createActionGuard } from "./actionGuard.js";
import {
  actionArb,
  fromAvailable,
  viewModelArb,
} from "./viewModelArb.testutil.js";

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

type Step =
  | { kind: "set"; model: ViewModel }
  | { kind: "send"; action: UserAction }
  | { kind: "send-listed"; pick: number };

// "send-listed" picks an entry of the newest model, so available actions are
// hit often and not only by luck.
const stepArb: fc.Arbitrary<Step> = fc.oneof(
  viewModelArb.map((model): Step => ({ kind: "set", model })),
  actionArb.map((action): Step => ({ kind: "send", action })),
  fc.nat().map((pick): Step => ({ kind: "send-listed", pick })),
);

describe("createActionGuard properties", () => {
  // Feature: scenic-web, Property 13: The renderer sends only available actions
  // **Validates: Requirements 2.7, 2.8, 11.1**
  it("Property 13: the renderer sends only available actions", () => {
    fc.assert(
      fc.property(fc.array(stepArb, { maxLength: 20 }), (steps) => {
        const { sent, guard } = guardWithSink();
        let last: ViewModel | null = null;
        let expectedCount = 0;
        for (const step of steps) {
          if (step.kind === "set") {
            last = step.model;
            guard.setModel(step.model);
            continue;
          }
          const action =
            step.kind === "send"
              ? step.action
              : last !== null && last.available.length > 0
                ? fromAvailable(
                    last.available[step.pick % last.available.length]!,
                  )
                : null;
          if (action === null) continue;
          const expected = last !== null && isAvailable(last, action);
          const before = sent.length;
          expect(guard.send(action)).toBe(expected);
          if (expected) expectedCount += 1;
          expect(sent.length - before).toBe(expected ? 1 : 0);
          if (last === null) expect(sent).toHaveLength(0);
        }
        expect(sent).toHaveLength(expectedCount);
      }),
      { numRuns: 100 },
    );
  });
});
