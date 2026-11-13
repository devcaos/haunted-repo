/// <reference types="node" />
import { readFileSync } from "node:fs";
import { parseReport } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import { copyrightLineOf } from "./makeSample.js";
import { SAMPLE_SHA, loadSample, parseSampleFiles } from "./sampleData.js";

function readCommitted(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

const reportJson = readCommitted("./report.json");
const filesJson = readCommitted("./files.json");
const licenceText = readCommitted("../../public/sirv-license.txt");

function ghostPaths(): string[] {
  const report = parseReport(reportJson);
  if (!report.ok) throw new Error("the committed report does not parse");
  return report.value.ghosts.map((ghost) => ghost.path);
}

function filesWith(texts: Record<string, string>): string {
  const files = JSON.parse(filesJson) as { copyright: string };
  return JSON.stringify({ copyright: files.copyright, texts });
}

describe("the committed sample data", () => {
  it("parses as a Haunted Repo report", () => {
    expect(parseReport(reportJson).ok).toBe(true);
  });

  it("was made at the Sample_SHA", () => {
    const report = parseReport(reportJson);
    expect(report.ok && report.value.overview.ref).toBe(SAMPLE_SHA);
  });

  it("has one text per ghost path and nothing else", () => {
    const files = parseSampleFiles(filesJson);
    expect(files.ok).toBe(true);
    if (!files.ok) return;
    expect(Object.keys(files.value.texts).sort()).toEqual(ghostPaths().sort());
  });

  it("has the copyright line of the committed licence", () => {
    const files = parseSampleFiles(filesJson);
    expect(files.ok && files.value.copyright).toBe(
      copyrightLineOf(licenceText),
    );
  });

  it("loads with loadSample", () => {
    const sample = loadSample(reportJson, filesJson);
    expect(sample.ok).toBe(true);
    if (!sample.ok) return;
    expect(sample.value.report.ghosts.length).toBeGreaterThan(0);
    expect(sample.value.copyright).toBe(copyrightLineOf(licenceText));
  });
});

describe("loadSample rejects broken data", () => {
  it("rejects a missing text key", () => {
    const [, ...rest] = ghostPaths();
    const texts = Object.fromEntries(rest.map((path) => [path, "x"]));
    expect(loadSample(reportJson, filesWith(texts)).ok).toBe(false);
  });

  it("rejects an extra text key", () => {
    const texts = Object.fromEntries(ghostPaths().map((path) => [path, "x"]));
    texts["not-a-ghost.ts"] = "x";
    expect(loadSample(reportJson, filesWith(texts)).ok).toBe(false);
  });

  it("rejects invalid JSON", () => {
    expect(loadSample("{", filesJson).ok).toBe(false);
    expect(loadSample(reportJson, "{").ok).toBe(false);
  });

  it("rejects a wrong shape", () => {
    const wrong = [
      "null",
      "[]",
      JSON.stringify({ copyright: 1, texts: {} }),
      JSON.stringify({ copyright: "c", texts: [] }),
      JSON.stringify({ copyright: "c", texts: { a: 1 } }),
      JSON.stringify({ copyright: "c" }),
    ];
    for (const text of wrong) {
      expect(parseSampleFiles(text).ok).toBe(false);
      expect(loadSample(reportJson, text).ok).toBe(false);
    }
    expect(loadSample(JSON.stringify({ ghosts: [] }), filesJson).ok).toBe(
      false,
    );
  });
});
