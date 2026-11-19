import { describe, expect, it } from "vitest";
import {
  GATE_PLACES,
  gargoyleArt,
  gargoyleEyes,
  gateArt,
  type GateHrefs,
} from "./gate.js";
import type { ShapeNode } from "./shapes.js";

function all(node: ShapeNode): ShapeNode[] {
  return [node, ...(node.children ?? []).flatMap(all)];
}

const HREFS: GateHrefs = {
  frame: "/haunted-repo/assets/panel-frame-a1.svg",
  gargoyle: "/haunted-repo/assets/panel-gargoyle-b2.svg",
  lantern: "/haunted-repo/assets/panel-lantern-c3.svg",
  pumpkin: "/haunted-repo/assets/panel-pumpkin-d4.svg",
};

const NONE: GateHrefs = {
  frame: null,
  gargoyle: null,
  lantern: null,
  pumpkin: null,
};

describe("Gate_Panel art (director's decision, 19 Nov)", () => {
  it("places the four pictures, each once, with its own href", () => {
    const images = all(gateArt(HREFS)).filter((n) => n.kind === "image");
    expect(images.map((n) => n.href).sort()).toEqual(
      Object.values(HREFS).sort(),
    );
  });

  it("draws no picture, no eyes and no lamp light when every file is missing", () => {
    const nodes = all(gateArt(NONE));
    expect(nodes.filter((n) => n.kind === "image")).toEqual([]);
    expect(nodes.some((n) => n.cls === "gate-eyes")).toBe(false);
    expect(nodes.some((n) => n.cls === "gate-lamp-halo")).toBe(false);
  });

  it("draws the eyes only over the gargoyle picture", () => {
    expect(all(gargoyleArt(null))).toHaveLength(1);
    const nodes = all(gargoyleArt(HREFS.gargoyle));
    expect(nodes.filter((n) => n.cls === "gate-eyes")).toHaveLength(1);
  });

  it("gives the gargoyle two sockets and two slits", () => {
    const nodes = all(gargoyleEyes());
    expect(nodes.filter((n) => n.cls === "gate-eye-socket")).toHaveLength(2);
    expect(nodes.filter((n) => n.cls === "gate-eye-slit")).toHaveLength(2);
  });

  it("keeps the frame at the full 480 x 900 gate height", () => {
    expect(GATE_PLACES.frame).toEqual({ x: 0, y: 0, w: 480, h: 900 });
  });
});
