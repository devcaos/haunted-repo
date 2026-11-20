import { describe, expect, it } from "vitest";
import { riseOrigin } from "./gate.js";

describe("Gate_Panel rise", () => {
  it("turns a HUD box around the foot of the gate's middle", () => {
    // A 900 px tall screen: one gate unit is 1 px, the pivot is at (240, 900).
    const gate = { left: 0, top: 0, height: 900 };
    expect(riseOrigin(gate, { left: 72, top: 0 })).toBe("168px 900px");
    expect(riseOrigin(gate, { left: 72, top: 400 })).toBe("168px 500px");
  });

  it("scales the pivot with the screen height", () => {
    const gate = { left: 0, top: 0, height: 720 };
    expect(riseOrigin(gate, { left: 57.6, top: 0 })).toBe("134px 720px");
  });
});
