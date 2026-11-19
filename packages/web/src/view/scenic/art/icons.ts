import type { GhostType } from "../model/sceneLayout.js";
import { ghostArt } from "./ghosts.js";
import { circle, g, path, poly, type ShapeNode } from "./shapes.js";

/** The viewBox side of a Ghost_Icon; colours come from `hud.css`. */
export const ICON_BOX = 20;

/** The Bestiary picture of a Ghost_Type: Variant 0 in the Haunted look. It never moves. */
export function bestiaryArt(type: GhostType): ShapeNode {
  return ghostArt(type, 0, "haunted");
}

/**
 * One tiny Ghost_Icon (design "Props and panels"): a Candle flame for an
 * exorcised ghost, a Spectral Wisp head for a haunted one.
 */
export function ghostIconArt(state: "haunted" | "exorcised"): ShapeNode {
  if (state === "exorcised") {
    return g(
      "icon-flame",
      [
        path(
          "icon-flame-outer",
          "M10 1 C13 6 15 10 14 14 C13 18 11 19 10 19 C9 19 7 18 6 14 C5 10 7 6 10 1 Z",
        ),
        path(
          "icon-flame-core",
          "M10 9 C11.5 12 12 14 11 16 C10.5 17 9.5 17 9 16 C8 14 8.5 12 10 9 Z",
        ),
      ],
      { part: "icon-flame" },
    );
  }
  return g(
    "icon-wisp",
    [
      path(
        "icon-wisp-hood",
        "M10 1 C6 5 4 8 4 12 C4 16 7 19 10 19 C13 19 16 16 16 12 C16 8 14 5 10 1 Z",
      ),
      path(
        "icon-wisp-face",
        "M10 8 C12.5 8 13.5 10 13.5 12.5 C13.5 15 12 16.5 10 16.5 C8 16.5 6.5 15 6.5 12.5 C6.5 10 7.5 8 10 8 Z",
      ),
      circle("icon-wisp-eye", 8.4, 12, 1),
      circle("icon-wisp-eye", 11.6, 12, 1),
    ],
    { part: "icon-wisp" },
  );
}
/**
 * The icon of the Answer_Button: an old rotary telephone with a curved
 * handset on top, a trapezoid base and a dial. Colours come from `stage.css`.
 */
export function phoneIconArt(): ShapeNode {
  return g(
    "icon-phone",
    [
      path(
        "icon-phone-handset",
        "M2.5 8 C2.5 4 5.5 3 10 3 C14.5 3 17.5 4 17.5 8 L15.5 8 C15.5 6 13.5 5.2 10 5.2 C6.5 5.2 4.5 6 4.5 8 Z",
      ),
      poly("icon-phone-base", [6, 9, 14, 9, 18, 17, 2, 17]),
      circle("icon-phone-dial", 10, 13, 2.6),
    ],
    { part: "icon-phone" },
  );
}
