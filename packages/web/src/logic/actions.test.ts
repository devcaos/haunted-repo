import { describe, expect, it } from "vitest";
import { isAvailable } from "./actions.js";
import type { AvailableAction } from "./actions.js";
import type { ViewModel } from "./viewModel.js";

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

describe("isAvailable", () => {
  it("accepts any URL for submit-live", () => {
    const model = modelWith([{ type: "submit-live" }]);
    expect(isAvailable(model, { type: "submit-live", url: "" })).toBe(true);
    expect(
      isAvailable(model, {
        type: "submit-live",
        url: "https://github.com/lukeed/sirv",
      }),
    ).toBe(true);
  });

  it("needs the same floor for go-to-floor", () => {
    const model = modelWith([{ type: "go-to-floor", floor: "attic" }]);
    expect(isAvailable(model, { type: "go-to-floor", floor: "attic" })).toBe(
      true,
    );
    expect(isAvailable(model, { type: "go-to-floor", floor: "basement" })).toBe(
      false,
    );
  });

  it("needs the same path for start-ghost", () => {
    const model = modelWith([{ type: "start-ghost", path: "src/a.ts" }]);
    expect(isAvailable(model, { type: "start-ghost", path: "src/a.ts" })).toBe(
      true,
    );
    expect(isAvailable(model, { type: "start-ghost", path: "src/b.ts" })).toBe(
      false,
    );
  });

  it("needs the same rating for rate", () => {
    const model = modelWith([{ type: "rate", rating: "right" }]);
    expect(isAvailable(model, { type: "rate", rating: "right" })).toBe(true);
    expect(isAvailable(model, { type: "rate", rating: "wrong" })).toBe(false);
  });

  it("needs the same answer for self-check", () => {
    const model = modelWith([{ type: "self-check", answer: "half" }]);
    expect(isAvailable(model, { type: "self-check", answer: "half" })).toBe(
      true,
    );
    expect(isAvailable(model, { type: "self-check", answer: "yes" })).toBe(
      false,
    );
  });

  it("needs the same type for actions without parameters", () => {
    const model = modelWith([{ type: "show-sample" }]);
    expect(isAvailable(model, { type: "show-sample" })).toBe(true);
    expect(isAvailable(model, { type: "go-to-house" })).toBe(false);
  });

  it("rejects everything when nothing is available", () => {
    const model = modelWith([]);
    expect(isAvailable(model, { type: "submit-live", url: "x" })).toBe(false);
    expect(isAvailable(model, { type: "show-sample" })).toBe(false);
    expect(isAvailable(model, { type: "go-to-floor", floor: "attic" })).toBe(
      false,
    );
    expect(isAvailable(model, { type: "start-ghost", path: "a" })).toBe(false);
    expect(isAvailable(model, { type: "leave-ghost" })).toBe(false);
  });
});
