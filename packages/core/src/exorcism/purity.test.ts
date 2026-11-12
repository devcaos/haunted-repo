/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";

// Source files of the exorcism module, read as plain text.
const modules = import.meta.glob("./*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const sources = Object.entries(modules).filter(
  ([name]) => !name.endsWith(".test.ts") && !name.endsWith(".testutil.ts"),
);

// Real uses only, so the English rule sentences never match.
const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: "new Date", pattern: /\bnew\s+Date\b/ },
  { name: "Date.now", pattern: /\bDate\.now\b/ },
  { name: "Math.random", pattern: /\bMath\.random\b/ },
  // Not preceded by a quote: fileKind.ts holds "process.argv" as a text marker.
  { name: "process.", pattern: /(?<!["'`])\bprocess\.[A-Za-z_]/ },
  { name: "fetch(", pattern: /\bfetch\s*\(/ },
  { name: "require(", pattern: /\brequire\s*\(/ },
  { name: "node: import", pattern: /\b(?:from\s+|import\s*\(?\s*)["']node:/ },
];

// Feature: exorcism, purity (Requirements 9.2, 9.3, 10.1)
describe("exorcism purity", () => {
  it("reads the source files of the module", () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(sources.some(([name]) => name === "./engine.ts")).toBe(true);
    expect(sources.some(([name]) => name.includes(".test."))).toBe(false);
    expect(sources.some(([name]) => name.includes(".testutil."))).toBe(false);
  });

  it("uses no clock, randomness, process, network, require or node: import", () => {
    const found: string[] = [];
    for (const [file, text] of sources) {
      for (const { name, pattern } of FORBIDDEN) {
        if (pattern.test(text)) found.push(`${file}: ${name}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("the pattern list matches each forbidden use (self-check)", () => {
    const samples: Record<string, string> = {
      "new Date": "const d = new Date();",
      "Date.now": "const t = Date.now();",
      "Math.random": "const r = Math.random();",
      "process.": "const e = process.env.HOME;",
      "fetch(": 'await fetch("https://example.com");',
      "require(": 'const fs = require("fs");',
      "node: import": 'import { readFileSync } from "node:fs";',
    };
    for (const { name, pattern } of FORBIDDEN) {
      const sample = samples[name];
      expect(sample, `missing sample for ${name}`).toBeDefined();
      expect(pattern.test(sample ?? ""), name).toBe(true);
    }
    expect(Object.keys(samples).length).toBe(FORBIDDEN.length);
  });
});
