/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cameraFor,
  cssTransform,
  frameRect,
  sceneArea,
  type ViewportClass,
} from "./camera.js";
import { FLOOR_RECT, slotRects, type Frame } from "./sceneLayout.js";

const FRAMES: { name: string; frame: Frame }[] = [
  { name: "house", frame: { kind: "house" } },
  { name: "attic", frame: { kind: "floor", floor: "attic" } },
  { name: "middle floor", frame: { kind: "floor", floor: "middle floor" } },
  { name: "basement", frame: { kind: "floor", floor: "basement" } },
  {
    name: "slot",
    frame: { kind: "slot", rect: slotRects("middle floor", 3)[1]! },
  },
];
const VIEWPORTS: ViewportClass[] = ["wide", "narrow"];

/** Where the camera puts a world rectangle, in stage units. */
function mapped(
  frame: Frame,
  viewport: ViewportClass,
  rect: { x: number; y: number; w: number; h: number },
) {
  const t = cameraFor(frame, viewport);
  const tx = t.txPercent * 16;
  const ty = t.tyPercent * 10;
  return {
    x: tx + t.scale * rect.x,
    y: ty + t.scale * rect.y,
    w: t.scale * rect.w,
    h: t.scale * rect.h,
  };
}

describe("cameraFor", () => {
  const TOLERANCE = 0.5; // stage units; the transform is rounded to 4 decimals

  it("maps every frame inside its scene area, for both viewport classes", () => {
    for (const { name, frame } of FRAMES) {
      for (const viewport of VIEWPORTS) {
        const box = mapped(frame, viewport, frameRect(frame, viewport));
        const area = sceneArea(frame, viewport);
        const label = `${name} ${viewport}`;
        expect(box.x, label).toBeGreaterThanOrEqual(area.x - TOLERANCE);
        expect(box.y, label).toBeGreaterThanOrEqual(area.y - TOLERANCE);
        expect(box.x + box.w, label).toBeLessThanOrEqual(
          area.x + area.w + TOLERANCE,
        );
        expect(box.y + box.h, label).toBeLessThanOrEqual(
          area.y + area.h + TOLERANCE,
        );
      }
    }
  });

  it("maps each floor rectangle inside the scene area when that floor is framed", () => {
    for (const floor of ["attic", "middle floor", "basement"] as const) {
      for (const viewport of VIEWPORTS) {
        const frame: Frame = { kind: "floor", floor };
        const box = mapped(frame, viewport, FLOOR_RECT[floor]);
        const area = sceneArea(frame, viewport);
        expect(box.x).toBeGreaterThanOrEqual(area.x - TOLERANCE);
        expect(box.x + box.w).toBeLessThanOrEqual(area.x + area.w + TOLERANCE);
        expect(box.y).toBeGreaterThanOrEqual(area.y - TOLERANCE);
        expect(box.y + box.h).toBeLessThanOrEqual(area.y + area.h + TOLERANCE);
      }
    }
  });

  it("makes the wide house frame the identity", () => {
    const t = cameraFor({ kind: "house" }, "wide");
    expect(t).toEqual({
      scale: 1,
      txPercent: 0,
      tyPercent: 0,
      counterScale: 1,
    });
    expect(cssTransform(t)).toBe("translate(0%, 0%) scale(1)");
  });

  it("gives the scales of the design within 0.01", () => {
    const expected: [string, ViewportClass, number][] = [
      ["attic", "wide", 1.94],
      ["middle floor", "wide", 1.76],
      ["basement", "wide", 1.88],
      ["house", "narrow", 1.7],
      ["attic", "narrow", 2.45],
      ["middle floor", "narrow", 2.24],
      ["basement", "narrow", 2.38],
    ];
    for (const [name, viewport, scale] of expected) {
      const frame = FRAMES.find((f) => f.name === name)!.frame;
      expect(Math.abs(cameraFor(frame, viewport).scale - scale)).toBeLessThan(
        0.01,
      );
    }
  });

  it("keeps counterScale as 1 / scale and writes the CSS transform", () => {
    const t = cameraFor({ kind: "floor", floor: "attic" }, "wide");
    expect(Math.abs(t.counterScale * t.scale - 1)).toBeLessThan(0.001);
    expect(cssTransform(t)).toBe(
      `translate(${t.txPercent}%, ${t.tyPercent}%) scale(${t.scale})`,
    );
  });

  it("uses the 700 ms camera duration token", () => {
    const css = readFileSync(
      new URL("../styles/scenic-tokens.css", import.meta.url),
      "utf8",
    );
    expect(css).toMatch(/--sc-dur-camera:\s*700ms\s*;/);
  });
});
