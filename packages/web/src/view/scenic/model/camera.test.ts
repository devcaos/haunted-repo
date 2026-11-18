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

  it("frames the House from the porch (x 280) to the tower (x 1253), for both viewport classes", () => {
    for (const viewport of VIEWPORTS) {
      const f = frameRect({ kind: "house" }, viewport);
      expect(f.x, viewport).toBeLessThanOrEqual(280);
      expect(f.x + f.w, viewport).toBeGreaterThanOrEqual(1253);
      // From the spire tip (y 56) to the cellar floor (y 913).
      expect(f.y, viewport).toBeLessThanOrEqual(56);
      expect(f.y + f.h, viewport).toBeGreaterThanOrEqual(913);
    }
  });

  it("shows the porch and the tower right of the sidebar and centres the house there (wide)", () => {
    // The sidebar covers about x 0 to 400 of the stage at 1440 x 900.
    const house: Frame = { kind: "house" };
    const t = cameraFor(house, "wide");
    const toStage = (x: number) => t.txPercent * 16 + t.scale * x;
    const [porch, tower] = [toStage(280), toStage(1253)];
    expect(porch).toBeGreaterThanOrEqual(400);
    expect(tower).toBeLessThanOrEqual(1600);
    // Equal space on both sides of the house, within 5 % of the visible width.
    expect(Math.abs(porch - 400 - (1600 - tower))).toBeLessThan(60);
    // The spire tip (1178, 56) stays below the scene heading bar (about y 60).
    const spire = t.tyPercent * 10 + t.scale * 56;
    expect(spire).toBeGreaterThan(60);
    // The world still covers the stage top, so no bare strip shows above it.
    expect(t.tyPercent * 10).toBeLessThanOrEqual(12);
  });

  it("keeps the porch and the tower inside the narrow stage", () => {
    const t = cameraFor({ kind: "house" }, "narrow");
    const toStage = (x: number) => t.txPercent * 16 + t.scale * x;
    expect(toStage(280)).toBeGreaterThanOrEqual(40); // not cut at the left edge
    expect(toStage(1253)).toBeLessThanOrEqual(1560);
  });

  it("gives the scales of the design within 0.01", () => {
    const expected: [string, ViewportClass, number][] = [
      // The frames of the scene illustration (director's decision, 18 Nov).
      ["attic", "wide", 1.77],
      ["middle floor", "wide", 1.68],
      ["basement", "wide", 1.68],
      ["house", "wide", 1.06],
      ["house", "narrow", 1.52],
      ["attic", "narrow", 2.25],
      ["middle floor", "narrow", 2.13],
      ["basement", "narrow", 2.13],
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
