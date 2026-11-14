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

const STORAGE =
  /\b(?:localStorage|sessionStorage|indexedDB)\b|\bdocument\.cookie\b/;
const RAW_HTML =
  /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b|\bdocument\.write/;
const POWER_WORD = /\bPower\b/;
const CHECK_BUTTON_TEXT = /Check GitHub connection/;
const INLINE_STYLE = /<style[\s>]|\sstyle\s*=/i;
const DOM_NAMES = /\b(?:document|window|HTMLElement)\b/;
const VIEW_IMPORT = /\b(?:from|import)\s*\(?\s*["'][^"']*\bview\/[^"']*["']/;
const RELATIVE_IMPORT = /\b(?:from|import)\s*\(?\s*["']\.\.?\//;
const CORE_SPECIFIER = /["']@haunted-repo\/core(?:\/[^"']*)?["']/g;
const CORE_TYPE_IMPORT =
  /\bimport\s+type\s[^;]*?\bfrom\s*["']@haunted-repo\/core(?:\/[^"']*)?["']/g;

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

describe("raw HTML", () => {
  it("no file writes HTML strings into the DOM", () => {
    expect(offenders(allFiles, RAW_HTML)).toEqual([]);
  });
  it("self-check: the pattern catches raw HTML", () => {
    expect(RAW_HTML.test("node.innerHTML = text")).toBe(true);
    expect(RAW_HTML.test("document.write(text)")).toBe(true);
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
