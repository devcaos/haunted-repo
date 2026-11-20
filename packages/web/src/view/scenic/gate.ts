import {
  GARGOYLE_BOX,
  GATE_BOX,
  GROUND_BOX,
  PUMPKIN_BOX,
  gargoyleArt,
  gateArt,
  groundArt,
  lightsArt,
  type GateHrefs,
} from "./art/gate.js";
import { image } from "./art/shapes.js";
import { createSvgRoot, mountShape } from "./svg.js";

/** Longest wait for the house picture, then for the gate pictures (ms). */
export const GATE_LOAD_WAIT = 2500;

/** From the start of the rise to the end of the last light (ms): delay 0.5 s, rise 4.4 s, lamp 0.9 s. */
export const GATE_RISE_TOTAL = 5800;

/** Where the gate is in its rise; CSS reads it from `data-gate` on the shell. */
export type GateState = "waiting" | "rising" | "up";

export interface Gate {
  /** Wide screens: the gate that rises behind the HUD (first child of the shell). */
  wide: SVGSVGElement;
  /** Wide screens: the lantern and the eyes, over the gate; they rise with it. */
  lights: SVGSVGElement;
  /** Wide screens: the earth it breaks and the pumpkin, in front of the HUD. */
  ground: SVGSVGElement;
  /** Narrow screens: the gargoyle over the logo (first child of the header). */
  crown: SVGSVGElement | null;
  /** Narrow screens: the pumpkin at the foot of the tombstone (last child of the footer). */
  base: SVGSVGElement | null;
  /**
   * Adds the pictures after the house picture has loaded, then lets the gate
   * rise (director's decision, 19 Nov). `parts` are the HUD boxes that rise
   * with it; `house` is the house picture, or null when there is none.
   */
  raise(shell: HTMLElement, parts: HTMLElement[], house: Element | null): void;
}

/**
 * Where a HUD box turns while it rises: the foot of the gate's middle (gate
 * point 240, 900), measured from the box's own top-left corner, in px.
 */
export function riseOrigin(
  gateBox: { left: number; top: number; height: number },
  partBox: { left: number; top: number },
): string {
  const unit = gateBox.height / GATE_BOX.h;
  const x = gateBox.left + 240 * unit - partBox.left;
  const y = gateBox.top + 900 * unit - partBox.top;
  return `${Math.round(x)}px ${Math.round(y)}px`;
}

/** Resolves when every element has fired `load` or `error`, or after `ms`. */
function loaded(elements: Element[], ms: number): Promise<void> {
  const each = elements.map(
    (element) =>
      new Promise<void>((resolve) => {
        element.addEventListener("load", () => resolve(), { once: true });
        element.addEventListener("error", () => resolve(), { once: true });
      }),
  );
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
  return Promise.race([Promise.all(each).then(() => undefined), timeout]);
}

/**
 * The Gate_Panel pictures (director's decision, 19 Nov). Decoration only:
 * every root is aria-hidden and never focusable, and CSS shows the wide
 * drawing or the narrow pieces, never both. The roots start empty: `raise`
 * adds the pictures after the house picture.
 */
export function createGate(hrefs: GateHrefs): Gate {
  const wide = createSvgRoot(GATE_BOX, "gate-wide");
  const lights = createSvgRoot(GATE_BOX, "gate-lights-wide");
  const ground = createSvgRoot(GROUND_BOX, "gate-ground-wide");
  const crown =
    hrefs.gargoyle === null
      ? null
      : createSvgRoot(GARGOYLE_BOX, "gate-crown-narrow");
  const base =
    hrefs.pumpkin === null
      ? null
      : createSvgRoot(PUMPKIN_BOX, "gate-base-narrow");

  const mount = (): void => {
    wide.append(mountShape(gateArt(hrefs), "gate-"));
    lights.append(mountShape(lightsArt(hrefs), "lights-"));
    ground.append(mountShape(groundArt(hrefs.pumpkin), "ground-"));
    if (crown !== null && hrefs.gargoyle !== null) {
      crown.append(mountShape(gargoyleArt(hrefs.gargoyle), "crown-"));
    }
    if (base !== null && hrefs.pumpkin !== null) {
      const { w, h } = PUMPKIN_BOX;
      base.append(
        mountShape(image("gate-pumpkin", hrefs.pumpkin, 0, 0, w, h), "base-"),
      );
    }
  };

  const raise = (
    shell: HTMLElement,
    parts: HTMLElement[],
    house: Element | null,
  ): void => {
    const set = (state: GateState): void => {
      shell.dataset["gate"] = state;
    };
    if (hrefs.frame === null) {
      mount();
      set("up");
      return;
    }
    set("waiting");
    const houseReady =
      house === null ? Promise.resolve() : loaded([house], GATE_LOAD_WAIT);
    void houseReady
      .then(() => {
        mount();
        const pictures = [...wide.querySelectorAll("image")];
        return loaded(pictures, GATE_LOAD_WAIT);
      })
      .then(() => {
        const box = wide.getBoundingClientRect();
        for (const part of parts) {
          const origin = riseOrigin(box, part.getBoundingClientRect());
          part.style.setProperty("--gate-origin", origin);
        }
        // With motion off the gate is simply there; it never rises later.
        if (shell.dataset["motion"] === "off") {
          set("up");
          return;
        }
        set("rising");
        window.setTimeout(() => {
          set("up");
        }, GATE_RISE_TOTAL);
      });
  };

  return { wide, lights, ground, crown, base, raise };
}
