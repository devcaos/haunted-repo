/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Reads styles/scenic-tokens.css and checks the palette, the contrast pairs of
// the design ("Contrast pairs"), the font stacks and the durations.
const TOKENS_URL = new URL("../styles/scenic-tokens.css", import.meta.url);
const css = readFileSync(fileURLToPath(TOKENS_URL), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

const tokens = new Map<string, string>();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  tokens.set(m[1] ?? "", (m[2] ?? "").replace(/\s+/g, " ").trim());
}

function hexOf(name: string): string {
  const value = tokens.get(name);
  if (value === undefined || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`${name} is not a six digit hex colour: ${value}`);
  }
  return value;
}

function channel(hex: string, start: number): number {
  const c = parseInt(hex.slice(start, start + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * channel(hex, 1) +
    0.7152 * channel(hex, 3) +
    0.0722 * channel(hex, 5)
  );
}

/** WCAG 2.1 contrast ratio between two hex colours. */
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

function millis(name: string): number {
  const value = tokens.get(name) ?? "";
  const m = /^([\d.]+)(ms|s)$/.exec(value);
  if (!m) throw new Error(`${name} is not a duration: ${value}`);
  return Number(m[1]) * (m[2] === "s" ? 1000 : 1);
}

const PALETTE: Record<string, string> = {
  "--sc-night": "#0B111B",
  "--sc-slate": "#202D3B",
  "--sc-mist": "#6F7F92",
  "--sc-bone": "#D5D0C5",
  "--sc-spectral": "#B9CCE6",
  "--sc-candle": "#E6A25C",
  "--sc-pumpkin": "#FF7A1A",
  "--sc-brass": "#C47B3D",
  "--sc-rust": "#6E2A1E",
};

// [foreground, backing, ratio shown in the design]
const TEXT_PAIRS: [string, string, number][] = [
  ["--sc-bone", "--sc-night", 12.3],
  ["--sc-bone", "--sc-slate", 9.11],
  ["--sc-candle", "--sc-night", 8.73],
  ["--sc-candle", "--sc-slate", 6.46],
  ["--sc-spectral", "--sc-night", 11.57],
  ["--sc-spectral", "--sc-slate", 8.56],
  ["--sc-pumpkin", "--sc-night", 7.25],
  ["--sc-pumpkin", "--sc-slate", 5.37],
  ["--sc-night", "--sc-pumpkin", 7.25],
  ["--sc-night", "--sc-bone", 12.3],
  ["--sc-brass", "--sc-night", 5.63],
  ["--sc-mist", "--sc-night", 4.62],
  // Links and the licence line: stone grey, well above the old Mist (4.62).
  ["--sc-stone", "--sc-night", 8.36],
];

const UI_PAIRS: [string, string, number][] = [
  ["--sc-brass", "--sc-slate", 4.17],
  ["--sc-brass", "--sc-night", 5.63],
  ["--sc-pumpkin", "--sc-night", 7.25],
  ["--sc-cold-blue", "--sc-night", 6.61],
  ["--sc-candle", "--sc-night", 8.73],
  ["--sc-spectral", "--sc-night", 11.57],
];

describe("Scenic_Tokens palette", () => {
  it("holds the nine palette colours with exact values", () => {
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(hexOf(name).toLowerCase()).toBe(hex.toLowerCase());
    }
  });

  it("holds the named cold blue, warm orange and dawn", () => {
    expect(hexOf("--sc-cold-blue").toLowerCase()).toBe("#6e9bd8");
    expect(hexOf("--sc-warm-orange").toLowerCase()).toBe("#f59a45");
    expect(hexOf("--sc-dawn").toLowerCase()).toBe("#e9894a");
  });

  it("holds every role token as a var() of the palette", () => {
    for (const name of [
      "--sc-text",
      "--sc-text-heading",
      "--sc-text-muted",
      "--sc-text-link",
      "--sc-text-link-hover",
      "--sc-text-licence",
      "--sc-backing",
      "--sc-backing-raised",
      "--sc-border",
      "--sc-accent",
      "--sc-focus-ring",
      "--sc-focus-halo",
      "--sc-rim",
      "--sc-rim-ghost",
    ]) {
      expect(tokens.get(name), name).toMatch(/^var\(--sc-[a-z-]+\)$/);
    }
  });

  it("holds the opacity, size and focus tokens", () => {
    expect(tokens.get("--sc-locked")).toBe("0.8");
    expect(tokens.get("--sc-dim")).toBe("0.65");
    expect(tokens.get("--sc-touch")).toBe("2.75rem");
    expect(tokens.get("--sc-focus-width")).toBe("2px");
    expect(tokens.get("--sc-focus-offset")).toBe("2px");
    expect(tokens.get("--sc-focus-halo-width")).toBe("6px");
  });
});

describe("contrast (WCAG 2.1)", () => {
  it("every text pair of the design is at least 4.5:1", () => {
    for (const [fg, bg, shown] of TEXT_PAIRS) {
      const r = ratio(hexOf(fg), hexOf(bg));
      expect(r, `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(r, `${fg} on ${bg}`).toBeCloseTo(shown, 1);
    }
  });

  it("every UI pair of the design is at least 3:1", () => {
    for (const [fg, bg, shown] of UI_PAIRS) {
      const r = ratio(hexOf(fg), hexOf(bg));
      expect(r, `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
      expect(r, `${fg} on ${bg}`).toBeCloseTo(shown, 1);
    }
  });

  it("self-check: Mist on Slate fails the text rule", () => {
    expect(ratio(hexOf("--sc-mist"), hexOf("--sc-slate"))).toBeLessThan(4.5);
  });
});

describe("link colours (art review 3, item 13)", () => {
  const styles = (name: string): string =>
    readFileSync(
      fileURLToPath(new URL(`../styles/${name}`, import.meta.url)),
      "utf8",
    ).replace(/\s+/g, " ");

  it("links use stone grey, visited links too, and turn Pumpkin on hover", () => {
    expect(tokens.get("--sc-text-link")).toBe("var(--sc-stone)");
    expect(tokens.get("--sc-text-link-hover")).toBe("var(--sc-pumpkin)");
    const base = styles("base.css");
    expect(base).toContain(
      ".scenic a, .scenic a:visited { color: var(--sc-text-link); }",
    );
    expect(base).toContain(
      ".scenic a:hover { color: var(--sc-text-link-hover); }",
    );
    const hud = styles("hud.css");
    expect(hud).toContain(
      ".scenic .hud-foot .licence a, .scenic .hud-foot .licence a:visited { color: var(--sc-text-link); }",
    );
    expect(hud).toContain(".scenic .view-link { color: var(--sc-text-link); }");
  });

  it("no scenic link rule falls back to a blue token", () => {
    for (const name of ["base.css", "hud.css"]) {
      for (const m of styles(name).matchAll(
        /([^{}]*\ba\b[^{}]*)\{([^}]*)\}/g,
      )) {
        expect(m[2], `${name}: ${m[1]}`).not.toMatch(/spectral|cold-blue/);
      }
    }
  });
});

describe("font tokens", () => {
  it("every font token ends with a generic family", () => {
    const fonts = [...tokens].filter(([name]) => name.startsWith("--font-"));
    expect(fonts.map(([name]) => name).sort()).toEqual([
      "--font-body",
      "--font-code",
      "--font-logo",
      "--font-title",
    ]);
    for (const [name, value] of fonts) {
      const last = value.split(",").at(-1)?.trim();
      expect(["serif", "sans-serif", "monospace"], name).toContain(last);
    }
  });

  it("names the display fonts first", () => {
    expect(tokens.get("--font-logo")).toMatch(/^"Creepster",/);
    expect(tokens.get("--font-title")).toMatch(/^"IM Fell English",/);
  });
});

describe("durations of the Animation Catalogue", () => {
  it("matches the catalogue for the long moments", () => {
    expect(millis("--sc-dur-room-warm")).toBe(1200);
    expect(millis("--sc-dur-intro")).toBe(1500);
    expect(millis("--sc-dur-camera")).toBe(700);
    expect(millis("--sc-dur-meter")).toBe(800);
    expect(millis("--sc-dur-press")).toBe(80);
  });

  it("keeps every Reduced_Motion fade at 200 ms or less", () => {
    const fades = [...tokens.keys()].filter((n) => n.startsWith("--sc-rm-"));
    expect(fades.length).toBeGreaterThan(0);
    for (const name of fades) {
      expect(millis(name), name).toBeLessThanOrEqual(200);
    }
  });

  it("self-check: a duration that is not a time is rejected", () => {
    expect(() => millis("--sc-night")).toThrow();
  });
});
