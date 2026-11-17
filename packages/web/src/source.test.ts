/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Scans the source text of the Web_Package. Scanned: every non-test `.ts`,
// `.css` and `.svg` file under `src/`, plus `index.html`. Test files
// (`*.test.ts`, `*.testutil.ts`, so this file too) and the committed JSON data
// (report.json, files.json) are not scanned: they are not page code, and the
// data holds sirv code that may contain words such as "window".

interface SourceFile {
  path: string; // relative to packages/web, with "/"
  text: string;
}

const WEB_DIR = fileURLToPath(new URL("../", import.meta.url));
const SCANNED = /\.(?:ts|css|svg)$/;
const TEST_FILE = /\.(?:test|testutil)\.ts$/;

function read(path: string): SourceFile {
  return { path, text: readFileSync(join(WEB_DIR, path), "utf8") };
}

const srcFiles: SourceFile[] = readdirSync(join(WEB_DIR, "src"), {
  recursive: true,
  encoding: "utf8",
})
  .map((name) => `src/${name.replaceAll("\\", "/")}`)
  .filter((path) => SCANNED.test(path) && !TEST_FILE.test(path))
  .sort()
  .map(read);
const indexHtml = read("index.html");
const allFiles = [...srcFiles, indexHtml];
const logicFiles = srcFiles.filter(
  (f) => f.path.startsWith("src/logic/") || f.path.startsWith("src/sample/"),
);
const viewFiles = srcFiles.filter((f) => f.path.startsWith("src/view/"));
const presentationFiles = [indexHtml, ...viewFiles];
const SCENIC_DIR = "src/view/scenic/";
const TOKENS_CSS = "src/view/simple/tokens.css";
const simpleCssFiles = viewFiles.filter(
  (f) =>
    f.path.startsWith("src/view/simple/") &&
    f.path.endsWith(".css") &&
    f.path !== TOKENS_CSS,
);

const STORAGE =
  /\b(?:localStorage|sessionStorage|indexedDB)\b|\bdocument\.cookie\b/;
const RAW_HTML =
  /\b(?:innerHTML|outerHTML|insertAdjacentHTML|DOMParser|createContextualFragment|setHTMLUnsafe)\b|\bdocument\.write/;
const POWER_WORD = /\bPower\b/;
const CHECK_BUTTON_TEXT = /Check GitHub connection/;
const INLINE_STYLE = /<style[\s>]|\sstyle\s*=/i;
const DOM_NAMES = /\b(?:document|window|HTMLElement)\b/;
const VIEW_IMPORT = /\b(?:from|import)\s*\(?\s*["'][^"']*\bview\/[^"']*["']/;
const RELATIVE_IMPORT = /\b(?:from|import)\s*\(?\s*["']\.\.?\//;
const CORE_SPECIFIER = /["']@haunted-repo\/core(?:\/[^"']*)?["']/g;
const CORE_TYPE_IMPORT =
  /\bimport\s+type\s[^;]*?\bfrom\s*["']@haunted-repo\/core(?:\/[^"']*)?["']/g;

// The Answer_Box text never leaves its DOM field (Requirement 6.23).
const GHOST_TS = "src/view/simple/ghost.ts";
const RENDERER_TS = "src/view/simple/renderer.ts";
const READS_VALUE = /\.value\b/;
const INPUT_LISTENER =
  /\baddEventListener\(\s*["'`](?:input|change)["'`]|\bon(?:input|change)\b/i;
// renderer.ts reads the URL field, so there only the Answer_Box is checked.
const ANSWER_BOX_READ =
  /\banswerBox\s*\??\.\s*(?:value|addEventListener|oninput|onchange)\b/;

// External addresses (Requirement 11.5), in index.html and src/view/.
const SVG_NAMESPACES = [
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
];
const FULL_ADDRESS = /https?:\/\//i;
const PROTOCOL_RELATIVE = [
  /\burl\(\s*["']?\s*\/\//i,
  /@import\s+(?:url\(\s*)?["']?\s*\/\//i,
  /\b(?:src|href)\s*[=:]\s*["'`]?\s*\/\//i,
  /["'](?:src|href)["']\s*,\s*["'`]\s*\/\//i,
];

/** True when the text loads or links anything outside the site. */
function hasExternalAddress(text: string): boolean {
  const rest = SVG_NAMESPACES.reduce((t, ns) => t.replaceAll(ns, ""), text);
  return FULL_ADDRESS.test(rest) || PROTOCOL_RELATIVE.some((p) => p.test(rest));
}

// Simple_Renderer CSS (Requirements 11.2, 11.3): only tokens.css has literal
// colours, sizes and fonts. Only declaration values are checked; comments,
// `@media` lines and the text inside `url(...)` are removed first.
// prettier-ignore
const CSS_NAMED_COLOURS = [
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige",
  "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown",
  "burlywood", "cadetblue", "chartreuse", "chocolate", "coral",
  "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan",
  "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred",
  "darksalmon", "darkseagreen", "darkslateblue", "darkslategray",
  "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue",
  "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite",
  "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod",
  "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred",
  "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen",
  "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
  "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink",
  "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
  "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen",
  "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue",
  "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
  "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue",
  "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace",
  "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod",
  "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
  "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red",
  "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen",
  "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
  "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle",
  "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
  "yellowgreen",
];
const HEX_COLOUR = /#[0-9a-f]{3,8}(?![\w-])/i;
const COLOUR_FUNCTION =
  /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const NAMED_COLOUR = new RegExp(
  `(?<![\\w-])(?:${CSS_NAMED_COLOURS.join("|")})(?![\\w-])`,
  "i",
);
const SIZE_UNIT =
  /(?<![\w.])\d*\.?\d+(?:(?:px|rem|em|ex|ch|vh|vw|vmin|vmax|svh|lvh|dvh|pt|pc|cm|mm|in|q)(?![\w-])|%)/i;
const DECLARATION = /([\w-]+)\s*:\s*([^;{}]+)(?=[;}])/g;

interface Declaration {
  property: string;
  value: string;
}

/** Declarations of a CSS text, without comments, @media lines and url(...). */
function declarations(css: string): Declaration[] {
  const clean = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*@media[^\n]*$/gm, "")
    .replace(/\burl\([^)]*\)/gi, "url()");
  return [...clean.matchAll(DECLARATION)].map((m) => ({
    property: (m[1] ?? "").toLowerCase(),
    // Custom property names such as --space-2 are names, not sizes.
    value: (m[2] ?? "").replace(/--[\w-]+/g, ""),
  }));
}

/** The rules of Requirements 11.2 and 11.3 that a CSS text breaks. */
function cssBreaks(css: string): string[] {
  const breaks = new Set<string>();
  for (const { property, value } of declarations(css)) {
    if (HEX_COLOUR.test(value) || COLOUR_FUNCTION.test(value))
      breaks.add("colour");
    if (NAMED_COLOUR.test(value)) breaks.add("colour");
    if (SIZE_UNIT.test(value)) breaks.add("size");
    if (property === "font-family" && !value.includes("var("))
      breaks.add("font");
  }
  return [...breaks].sort();
}

/** Number of references to Core that are not an `import type`. */
function valueCoreImports(text: string): number {
  const all = text.match(CORE_SPECIFIER)?.length ?? 0;
  const typeOnly = text.match(CORE_TYPE_IMPORT)?.length ?? 0;
  return all - typeOnly;
}

function offenders(files: SourceFile[], pattern: RegExp): string[] {
  return files.filter((f) => pattern.test(f.text)).map((f) => f.path);
}

describe("source scan", () => {
  it("finds the source files and skips tests and data", () => {
    const paths = srcFiles.map((f) => f.path);
    expect(paths).toContain("src/main.ts");
    expect(paths).toContain("src/logic/powerTexts.ts");
    expect(paths).toContain("src/sample/makeSample.ts");
    expect(paths).toContain("src/view/simple/simple.css");
    for (const added of [
      GHOST_TS,
      RENDERER_TS,
      "src/view/simple/focus.ts",
      "src/logic/demoScript.ts",
      "src/logic/exorcism.ts",
    ]) {
      expect(paths).toContain(added);
    }
    expect(
      paths.filter((p) => TEST_FILE.test(p) || p.endsWith(".json")),
    ).toEqual([]);
  });
});

describe("storage (Requirement 9.2)", () => {
  it("no file uses browser storage", () => {
    expect(offenders(allFiles, STORAGE)).toEqual([]);
  });
  it("self-check: the pattern catches storage", () => {
    expect(STORAGE.test('localStorage.setItem("a", "b")')).toBe(true);
    expect(STORAGE.test("document.cookie = x")).toBe(true);
  });
});

describe("Answer_Box (Requirements 6.23, 9.2)", () => {
  it("ghost.ts reads no .value and adds no input or change listener", () => {
    const ghost = viewFiles.filter((f) => f.path === GHOST_TS);
    expect(ghost).toHaveLength(1);
    expect(offenders(ghost, READS_VALUE)).toEqual([]);
    expect(offenders(ghost, INPUT_LISTENER)).toEqual([]);
  });
  it("renderer.ts never reads the Answer_Box or listens to it", () => {
    const renderer = viewFiles.filter((f) => f.path === RENDERER_TS);
    expect(renderer).toHaveLength(1);
    expect(offenders(renderer, ANSWER_BOX_READ)).toEqual([]);
  });
  it("self-check: the patterns catch reads and listeners", () => {
    expect(READS_VALUE.test("const text = box.value;")).toBe(true);
    expect(INPUT_LISTENER.test('box.addEventListener("input", f)')).toBe(true);
    expect(INPUT_LISTENER.test("box.addEventListener('change', f)")).toBe(true);
    expect(INPUT_LISTENER.test("box.oninput = f;")).toBe(true);
    expect(INPUT_LISTENER.test('button.addEventListener("click", f)')).toBe(
      false,
    );
    expect(ANSWER_BOX_READ.test("send(answerBox.value)")).toBe(true);
    expect(ANSWER_BOX_READ.test("answerBox?.addEventListener('x', f)")).toBe(
      true,
    );
    expect(ANSWER_BOX_READ.test("url: input.value")).toBe(false);
  });
});

describe("raw HTML", () => {
  it("no file writes HTML strings into the DOM", () => {
    expect(offenders(allFiles, RAW_HTML)).toEqual([]);
  });
  it("self-check: the pattern catches raw HTML", () => {
    expect(RAW_HTML.test("node.innerHTML = text")).toBe(true);
    expect(RAW_HTML.test("document.write(text)")).toBe(true);
    expect(RAW_HTML.test("new DOMParser().parseFromString(a, b)")).toBe(true);
    expect(RAW_HTML.test("range.createContextualFragment(text)")).toBe(true);
    expect(RAW_HTML.test("node.setHTMLUnsafe(text)")).toBe(true);
    expect(RAW_HTML.test("node.append(text)")).toBe(false);
  });
});

describe("page texts (Requirements 4.13, 14.1)", () => {
  it('the word "Power" appears only in powerTexts.ts', () => {
    const others = allFiles.filter((f) => f.path !== "src/logic/powerTexts.ts");
    expect(offenders(others, POWER_WORD)).toEqual([]);
    expect(offenders(allFiles, POWER_WORD)).toEqual([
      "src/logic/powerTexts.ts",
    ]);
  });
  it('the text "Check GitHub connection" appears nowhere', () => {
    expect(offenders(allFiles, CHECK_BUTTON_TEXT)).toEqual([]);
  });
  it("index.html has no inline style", () => {
    expect(INLINE_STYLE.test(indexHtml.text)).toBe(false);
  });
  it("self-check: the patterns catch the texts and styles", () => {
    expect(POWER_WORD.test("use the Power")).toBe(true);
    expect(
      CHECK_BUTTON_TEXT.test("<button>Check GitHub connection</button>"),
    ).toBe(true);
    expect(INLINE_STYLE.test('<div style="color: red">')).toBe(true);
    expect(INLINE_STYLE.test("<style>p {}</style>")).toBe(true);
  });
});

describe("layers (Requirement 11.7)", () => {
  it("the Logic_Layer uses no DOM", () => {
    expect(logicFiles.length).toBeGreaterThan(0);
    expect(offenders(logicFiles, DOM_NAMES)).toEqual([]);
  });
  it("the Logic_Layer imports nothing from src/view", () => {
    expect(offenders(logicFiles, VIEW_IMPORT)).toEqual([]);
  });
  it("makeSample.ts has no relative import", () => {
    const makeSample = logicFiles.filter(
      (f) => f.path === "src/sample/makeSample.ts",
    );
    expect(makeSample).toHaveLength(1);
    expect(offenders(makeSample, RELATIVE_IMPORT)).toEqual([]);
  });
  it("src/view imports Core only with import type", () => {
    expect(viewFiles.length).toBeGreaterThan(0);
    expect(
      viewFiles.filter((f) => valueCoreImports(f.text) > 0).map((f) => f.path),
    ).toEqual([]);
  });
  it("self-check: the patterns catch layer breaks", () => {
    expect(DOM_NAMES.test("const root = document.body;")).toBe(true);
    expect(DOM_NAMES.test("let node: HTMLElement;")).toBe(true);
    expect(
      VIEW_IMPORT.test('import { el } from "../view/simple/dom.js";'),
    ).toBe(true);
    expect(
      RELATIVE_IMPORT.test('import { TEXTS } from "../logic/texts.js";'),
    ).toBe(true);
    expect(RELATIVE_IMPORT.test('export { A } from "./a.js";')).toBe(true);
    expect(
      valueCoreImports('import { advance } from "@haunted-repo/core";'),
    ).toBe(1);
    expect(
      valueCoreImports('import type { Floor } from "@haunted-repo/core";'),
    ).toBe(0);
  });
});

describe("external addresses (Requirement 11.5)", () => {
  it("index.html and src/view load nothing from outside the site", () => {
    expect(presentationFiles.map((f) => f.path)).toContain("index.html");
    expect(
      presentationFiles
        .filter((f) => hasExternalAddress(f.text))
        .map((f) => f.path),
    ).toEqual([]);
  });
  it("self-check: the rule catches external addresses", () => {
    expect(hasExternalAddress('<a href="https://example.com">')).toBe(true);
    expect(hasExternalAddress("fetch('http://example.com/a')")).toBe(true);
    expect(hasExternalAddress('background: url("//cdn.example/a.png");')).toBe(
      true,
    );
    expect(hasExternalAddress("@import '//cdn.example/a.css';")).toBe(true);
    expect(hasExternalAddress('<script src="//cdn.example/a.js">')).toBe(true);
    expect(hasExternalAddress('img.src = "//cdn.example/a.png";')).toBe(true);
    expect(
      hasExternalAddress('node.setAttribute("href", "//cdn.example/");'),
    ).toBe(true);
  });
  it("self-check: the SVG namespaces and local files are allowed", () => {
    expect(
      hasExternalAddress(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
      ),
    ).toBe(false);
    expect(hasExternalAddress('url("../assets/files/door.svg")')).toBe(false);
    expect(hasExternalAddress('<script src="/src/main.ts">')).toBe(false);
    expect(hasExternalAddress("// a comment\nconst a = 1;")).toBe(false);
  });
});

describe("Simple_Renderer CSS (Requirements 11.2, 11.3)", () => {
  it("scans simple.css and skips tokens.css", () => {
    const paths = simpleCssFiles.map((f) => f.path);
    expect(paths).toContain("src/view/simple/simple.css");
    expect(paths).not.toContain(TOKENS_CSS);
  });
  it("no literal colour, size or font outside tokens.css", () => {
    expect(
      simpleCssFiles
        .map((f) => ({ path: f.path, breaks: cssBreaks(f.text) }))
        .filter((r) => r.breaks.length > 0),
    ).toEqual([]);
  });
  it("self-check: the rules catch literal colours", () => {
    for (const value of [
      "#fff",
      "#0a0f17",
      "rgb(0 0 0)",
      "rgba(0, 0, 0, 0.5)",
      "hsl(0 0% 0%)",
      "oklch(0.5 0.1 200)",
      "color(srgb 1 0 0)",
      "red",
      "RebeccaPurple",
    ]) {
      expect(cssBreaks(`a { color: ${value}; }`)).toContain("colour");
    }
  });
  it("self-check: the rules catch sizes and fonts", () => {
    for (const value of ["4px", "1.5rem", "-2em", ".5em", "100%", "50vw"]) {
      expect(cssBreaks(`a { margin: ${value}; }`)).toEqual(["size"]);
    }
    expect(cssBreaks("a { font-family: Georgia, serif; }")).toEqual(["font"]);
    expect(cssBreaks("a { --gap: 8px; }")).toEqual(["size"]);
  });
  it("self-check: the real tokens.css would break the rules", () => {
    const tokens = viewFiles.filter((f) => f.path === TOKENS_CSS);
    expect(tokens).toHaveLength(1);
    // tokens.css holds its fonts in custom properties, not in font-family.
    expect(cssBreaks(tokens[0]?.text ?? "")).toEqual(["colour", "size"]);
  });
  it("self-check: tokens, allowed values and exemptions pass", () => {
    const allowed = [
      "a { color: var(--color-text); margin: 0 auto; }",
      "a { line-height: 1.5; z-index: 2; opacity: 0.5; flex: 1 1 0; }",
      "a { grid-template-columns: 1fr 2fr; transition: color 200ms 0.1s; }",
      "a { transform: rotate(45deg) rotate(0.5turn); }",
      "a { font-family: var(--font-body); width: var(--size-full); }",
      "@media (min-width: 40rem) {\n  a { gap: var(--space-2); }\n}",
      'a { background: url("../assets/files/red-door-10px.svg"); }',
      "/* 4px red #fff */ a { border-style: dashed; }",
      ".ghost-card[data-ghost-state='locked'] h1:hover { display: grid; }",
    ];
    for (const css of allowed) {
      expect(cssBreaks(css)).toEqual([]);
    }
  });
});

describe("scenic files (Requirements 2.6, 2.9, 22.3, 22.8, 22.11)", () => {
  const scenicFiles = srcFiles.filter((f) => f.path.startsWith(SCENIC_DIR));

  it("has at least one .ts and one .css file, all in viewFiles", () => {
    expect(scenicFiles.some((f) => f.path.endsWith(".ts"))).toBe(true);
    expect(scenicFiles.some((f) => f.path.endsWith(".css"))).toBe(true);
    const viewPaths = viewFiles.map((f) => f.path);
    for (const f of scenicFiles) {
      expect(viewPaths).toContain(f.path);
    }
  });

  it("has no .svg file", () => {
    expect(
      scenicFiles.filter((f) => f.path.endsWith(".svg")).map((f) => f.path),
    ).toEqual([]);
  });

  it("self-check: the scan would see an .svg file", () => {
    expect(SCANNED.test(`${SCENIC_DIR}art/house.svg`)).toBe(true);
  });
});

// Scenic CSS (Requirements 22.5 to 22.7, 22.9): the Simple_Renderer rules run
// on every scenic CSS file except its tokens file.
const SCENIC_TOKENS_CSS = `${SCENIC_DIR}styles/scenic-tokens.css`;
const scenicCssFiles = viewFiles.filter(
  (f) =>
    f.path.startsWith(SCENIC_DIR) &&
    f.path.endsWith(".css") &&
    f.path !== SCENIC_TOKENS_CSS,
);
const scenicTsFiles = viewFiles.filter(
  (f) => f.path.startsWith(SCENIC_DIR) && f.path.endsWith(".ts"),
);
const SOURCE_TOKEN =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const NAMED_COLOUR_EXACT = new RegExp(
  `^(?:${CSS_NAMED_COLOURS.join("|")})$`,
  "i",
);

/** The string literals of a TypeScript text, without their quotes. */
function stringLiterals(ts: string): string[] {
  return [...ts.matchAll(SOURCE_TOKEN)]
    .map((m) => m[0])
    .filter((token) => !token.startsWith("/"))
    .map((token) => token.slice(1, -1));
}

/** The string literals that hold a colour value. */
function colourStrings(ts: string): string[] {
  return stringLiterals(ts).filter(
    (s) =>
      HEX_COLOUR.test(s) ||
      COLOUR_FUNCTION.test(s) ||
      NAMED_COLOUR_EXACT.test(s.trim()),
  );
}

describe("scenic CSS (Requirements 22.5, 22.9)", () => {
  it("scans every scenic CSS file except scenic-tokens.css", () => {
    const paths = scenicCssFiles.map((f) => f.path);
    expect(paths).not.toContain(SCENIC_TOKENS_CSS);
    expect(paths).not.toContain(TOKENS_CSS);
  });

  it("no literal colour, size or font outside scenic-tokens.css", () => {
    expect(
      scenicCssFiles
        .map((f) => ({ path: f.path, breaks: cssBreaks(f.text) }))
        .filter((r) => r.breaks.length > 0),
    ).toEqual([]);
  });

  it("self-check: scenic-tokens.css exists and would break the colour rule", () => {
    const tokens = viewFiles.filter((f) => f.path === SCENIC_TOKENS_CSS);
    expect(tokens).toHaveLength(1);
    expect(cssBreaks(tokens[0]?.text ?? "")).toContain("colour");
  });
});

describe("scenic strings (Requirements 22.6, 22.7)", () => {
  it("scans scenic TypeScript", () => {
    expect(scenicTsFiles.length).toBeGreaterThan(0);
  });

  it("no string literal holds a colour", () => {
    expect(
      scenicTsFiles
        .map((f) => ({ path: f.path, found: colourStrings(f.text) }))
        .filter((r) => r.found.length > 0),
    ).toEqual([]);
  });

  it("self-check: the rule catches a hex value, a function and a name", () => {
    expect(colourStrings('const a = "#ff7a1a";')).toEqual(["#ff7a1a"]);
    expect(colourStrings("const a = '#fff';")).toEqual(["#fff"]);
    expect(colourStrings('node.style = "rgb(0 0 0)";')).toEqual(["rgb(0 0 0)"]);
    expect(colourStrings("const a = `hsl(0 0% 0%)`;")).toEqual([
      "hsl(0 0% 0%)",
    ]);
    expect(colourStrings('const fill = "Red";')).toEqual(["Red"]);
  });

  it("self-check: allowed strings and comments pass", () => {
    for (const ts of [
      'const a = "transparent";',
      'const a = "currentColor";',
      'const a = "none";',
      'const a = "inherit";',
      'const a = "ghost--red-eyes";',
      'const a = "var(--sc-night)";',
      "// the colour is #fff or red\nconst a = 1;",
      '/* "red" */ const a = 1;',
    ]) {
      expect(colourStrings(ts)).toEqual([]);
    }
  });
});
