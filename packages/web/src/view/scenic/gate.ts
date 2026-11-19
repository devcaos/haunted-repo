import {
  GARGOYLE_BOX,
  GATE_BOX,
  PUMPKIN_BOX,
  gargoyleArt,
  gateArt,
  type GateHrefs,
} from "./art/gate.js";
import { image } from "./art/shapes.js";
import { createSvgRoot, mountShape } from "./svg.js";

export interface Gate {
  /** Wide screens: the whole stone gate behind the HUD (first child of the shell). */
  wide: SVGSVGElement;
  /** Narrow screens: the gargoyle over the logo (first child of the header). */
  crown: SVGSVGElement | null;
  /** Narrow screens: the pumpkin at the foot of the tombstone (last child of the footer). */
  base: SVGSVGElement | null;
}

/**
 * The Gate_Panel pictures (director's decision, 19 Nov). Decoration only:
 * every root is aria-hidden and never focusable, and CSS shows the wide
 * drawing or the narrow pieces, never both.
 */
export function createGate(hrefs: GateHrefs): Gate {
  const wide = createSvgRoot(GATE_BOX, "gate-wide");
  wide.append(mountShape(gateArt(hrefs), "gate-"));

  let crown: SVGSVGElement | null = null;
  if (hrefs.gargoyle !== null) {
    crown = createSvgRoot(GARGOYLE_BOX, "gate-crown-narrow");
    crown.append(mountShape(gargoyleArt(hrefs.gargoyle), "crown-"));
  }

  let base: SVGSVGElement | null = null;
  if (hrefs.pumpkin !== null) {
    base = createSvgRoot(PUMPKIN_BOX, "gate-base-narrow");
    base.append(
      mountShape(
        image(
          "gate-pumpkin",
          hrefs.pumpkin,
          0,
          0,
          PUMPKIN_BOX.w,
          PUMPKIN_BOX.h,
        ),
        "base-",
      ),
    );
  }

  return { wide, crown, base };
}
