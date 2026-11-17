/// <reference types="node" />
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLiveHouse } from "../../../logic/houseView.js";
import { createPage } from "../../../logic/page.js";
import { createRecordingRenderer } from "../../../logic/recordingRenderer.testutil.js";
import { TEXTS } from "../../../logic/texts.js";
import type { ViewModel } from "../../../logic/viewModel.js";
import { loadSample } from "../../../sample/sampleData.js";
import { hudView } from "./hudView.js";
import { meterScale } from "./renderMemory.js";
import { viewModelArb } from "./viewModelArb.testutil.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const sample = loadSample(
  readCommitted("../../../sample/report.json"),
  readCommitted("../../../sample/files.json"),
);

/** The first model of the real page on the committed sample. */
function sampleModel(): ViewModel {
  const renderer = createRecordingRenderer();
  const page = createPage(
    {
      detect: () => Promise.reject(new Error("no network in tests")),
      sample,
      script: null,
    },
    renderer,
  );
  page.start();
  return renderer.last();
}

beforeEach(() => {
  // A controller must never reach the network in a unit test.
  vi.stubGlobal("fetch", () => {
    throw new Error("fetch is not allowed in unit tests");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hudView", () => {
  it("shows the logo and the tagline (4.2)", () => {
    const hud = hudView(sampleModel());
    expect(hud.logo).toBe(TEXTS.pageTitle);
    expect(hud.tagline).toBe("Your repo is haunted. Let's fix that.");
  });

  it("passes the licence through (4.11)", () => {
    const model = sampleModel();
    expect(model.licence).not.toBeNull();
    expect(hudView(model).licence).toEqual(model.licence);
    expect(hudView({ ...model, licence: null }).licence).toBeNull();
  });

  it("shows the meter line and a scale within 0.01 of the share (4.3)", () => {
    const model = sampleModel();
    const progress = model.house?.progress;
    expect(progress).toBeTruthy();
    const meter = hudView(model).meter;
    expect(meter?.line).toBe(progress?.line);
    expect(meter?.from).toBeNull();
    const scale = Number(/scaleX\(([\d.]+)\)/.exec(meter?.scale ?? "")?.[1]);
    expect(Math.abs(scale - (progress?.share ?? NaN))).toBeLessThan(0.01);
  });

  it("formats and clamps the meter scale", () => {
    expect(meterScale(0.6)).toBe("scaleX(0.6000)");
    expect(meterScale(-1)).toBe("scaleX(0.0000)");
    expect(meterScale(2)).toBe("scaleX(1.0000)");
    expect(meterScale(1 / 3)).toBe("scaleX(0.3333)");
  });

  it("shows no meter and no icons without a house or without progress (4.17)", () => {
    const model = sampleModel();
    const noHouse = hudView({ ...model, house: null });
    expect(noHouse.meter).toBeNull();
    expect(noHouse.icons).toEqual([]);
    if (!sample.ok) throw new Error("the committed sample must load");
    const live = hudView({
      ...model,
      house: buildLiveHouse(sample.value.report),
    });
    expect(live.meter).toBeNull();
    expect(live.icons).toEqual([]);
  });

  it("shows total icons with the exorcised ones first (4.4)", () => {
    const model = sampleModel();
    const house = model.house;
    expect(house?.progress).toBeTruthy();
    if (house === null || house.progress === null) return;
    const withProgress = (haunted: number, total: number): ViewModel => ({
      ...model,
      house: {
        ...house,
        progress: { ...house.progress!, haunted, total },
      },
    });
    expect(hudView(withProgress(2, 5)).icons).toEqual([
      "exorcised",
      "exorcised",
      "exorcised",
      "haunted",
      "haunted",
    ]);
    expect(hudView(withProgress(5, 5)).icons).toEqual(Array(5).fill("haunted"));
    expect(hudView(withProgress(0, 5)).icons).toEqual(
      Array(5).fill("exorcised"),
    );
  });

  it("shows the plaque exactly when the form is visible (4.5, 4.6)", () => {
    const model = sampleModel();
    const shown = hudView({
      ...model,
      live: { formVisible: true, busy: false },
    });
    expect(shown.plaque.visible).toBe(true);
    const hidden = hudView({
      ...model,
      live: { formVisible: false, busy: false },
    });
    expect(hidden.plaque.visible).toBe(false);
  });
});

describe("hudView properties", () => {
  // Feature: scenic-web, Property 9: The HUD view follows the ViewModel
  // **Validates: Requirements 4.8, 4.10, 4.13, 4.14, 4.15, 4.16, 14.4**
  it("Property 9: the HUD view follows the ViewModel", () => {
    fc.assert(
      fc.property(viewModelArb, (model) => {
        const hud = hudView(model);
        const listed = (type: string): boolean =>
          model.available.some((entry) => entry.type === type);
        expect(hud.statusText).toBe(
          model.status.kind === "none" ? "" : model.status.text,
        );
        expect(hud.plaque.visible).toBe(model.live.formVisible);
        expect(hud.plaque.submitEnabled).toBe(listed("submit-live"));
        expect(hud.showSample).toBe(listed("show-sample"));
        expect(hud.powerLine).toBe(model.house?.powerLine ?? null);
        const warnings = model.house?.warnings ?? null;
        if (
          warnings === null ||
          (warnings.lines.length === 0 && warnings.skippedTitle === null)
        ) {
          expect(hud.warnings).toBeNull();
        } else {
          expect(hud.warnings?.lines).toEqual(warnings.lines);
          expect(hud.warnings?.skippedTitle).toBe(warnings.skippedTitle);
          expect(hud.warnings?.skipped).toEqual(
            warnings.skipped.map(({ path, reason }) => ({ path, reason })),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
