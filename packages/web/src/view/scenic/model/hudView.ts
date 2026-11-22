import { TEXTS } from "../../../logic/texts.js";
import type { LicenceView, ViewModel } from "../../../logic/viewModel.js";
import { meterScale, type RenderEffects } from "./renderMemory.js";

export interface HudView {
  logo: string;
  tagline: string;
  meter: { line: string; scale: string; from: string | null } | null; // 4.3, 4.17
  icons: ("haunted" | "exorcised")[]; // 4.4: exorcised first
  plaque: { visible: boolean; submitEnabled: boolean }; // 4.5, 4.6, 4.8
  statusText: string; // 4.10
  warnings: {
    lines: string[];
    skippedTitle: string | null;
    skipped: { path: string; reason: string }[];
  } | null; // 4.13
  powerLine: string | null; // 4.14
  showSample: boolean; // 4.15, 4.16
  licence: LicenceView | null; // 4.11
}

function has(model: ViewModel, type: string): boolean {
  return model.available.some((entry) => entry.type === type);
}

/**
 * Pure mapping from the ViewModel to the HUD. The Haunt_Meter and the
 * Ghost_Icons come from the render memory: frozen in the Ghost_Scene, and
 * moving `from` the old share after a Return_Glow (4.3, 4.4, 12.6).
 */
export function hudView(model: ViewModel, effects: RenderEffects): HudView {
  const house = model.house;
  const progress = effects.meter?.view ?? null;
  const from = effects.meter?.from ?? null;
  const icons: HudView["icons"] = [];
  if (progress !== null) {
    const exorcised = Math.max(0, progress.total - progress.haunted);
    for (let i = 0; i < exorcised; i += 1) icons.push("exorcised");
    for (let i = 0; i < progress.haunted; i += 1) icons.push("haunted");
  }
  const warnings = house?.warnings ?? null;
  const showWarnings =
    warnings !== null &&
    (warnings.lines.length > 0 || warnings.skippedTitle !== null);
  return {
    logo: TEXTS.pageTitle,
    tagline: TEXTS.tagline,
    meter:
      progress === null
        ? null
        : {
            line: progress.line,
            scale: meterScale(progress.share),
            from: from === null ? null : meterScale(from),
          },
    icons,
    plaque: {
      visible: model.live.formVisible,
      submitEnabled: has(model, "submit-live"),
    },
    statusText: model.status.kind === "none" ? "" : model.status.text,
    warnings: showWarnings ? warnings : null,
    powerLine: house?.powerLine ?? null,
    showSample: has(model, "show-sample"),
    licence: model.licence,
  };
}
