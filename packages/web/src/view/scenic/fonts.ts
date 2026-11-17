import creepsterUrl from "@fontsource/creepster/files/creepster-latin-400-normal.woff2?url";
import imFellEnglishUrl from "@fontsource/im-fell-english/files/im-fell-english-latin-400-normal.woff2?url";

const DISPLAY_FONTS: { family: string; url: string }[] = [
  { family: "Creepster", url: creepsterUrl },
  { family: "IM Fell English", url: imFellEnglishUrl },
];

/**
 * Adds the two display fonts (Latin subset, weight 400) to the page. They come
 * from the site itself. `display: "swap"` shows the fallback stack until a font
 * arrives, and a font that fails to load changes nothing (Requirement 21.7).
 */
export function loadScenicFonts(): void {
  if (typeof FontFace === "undefined" || !("fonts" in document)) return;
  for (const { family, url } of DISPLAY_FONTS) {
    const face = new FontFace(family, `url("${url}") format("woff2")`, {
      weight: "400",
      style: "normal",
      display: "swap",
    });
    document.fonts.add(face);
    face.load().catch(() => {
      // The text stays in the fallback font.
    });
  }
}
