import { parseReport } from "@haunted-repo/core";
import type { HauntedReport, Result } from "@haunted-repo/core";
// The constants are defined in makeSample.ts and only imported here.
export { SAMPLE_REPO_URL, SAMPLE_SHA } from "./makeSample.js";

export interface SampleData {
  report: HauntedReport;
  texts: Readonly<Record<string, string>>; // one Ghost_Text per ghost path
  copyright: string;
}

interface SampleFiles {
  copyright: string;
  texts: Record<string, string>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Strict, never throws. Rejects a files.json that is not { copyright: string; texts: Record<string, string> }. */
export function parseSampleFiles(
  jsonText: string,
): Result<SampleFiles, string> {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "The sample files are not valid JSON." };
  }
  if (
    !isPlainObject(data) ||
    Object.keys(data).length !== 2 ||
    typeof data.copyright !== "string" ||
    !isPlainObject(data.texts) ||
    !Object.values(data.texts).every((text) => typeof text === "string")
  ) {
    return { ok: false, error: "The sample files have the wrong shape." };
  }
  return {
    ok: true,
    value: {
      copyright: data.copyright,
      texts: data.texts as Record<string, string>,
    },
  };
}

/** Parses both committed texts. Never throws. */
export function loadSample(
  reportJson: string,
  filesJson: string,
): Result<SampleData, string> {
  const report = parseReport(reportJson);
  if (!report.ok) return { ok: false, error: report.error.message };
  const files = parseSampleFiles(filesJson);
  if (!files.ok) return files;

  const paths = new Set(report.value.ghosts.map((ghost) => ghost.path));
  const keys = Object.keys(files.value.texts);
  const samePaths =
    keys.length === paths.size && keys.every((key) => paths.has(key));
  if (!samePaths) {
    return {
      ok: false,
      error: "The sample texts do not match the ghost paths.",
    };
  }
  return {
    ok: true,
    value: {
      report: report.value,
      texts: files.value.texts,
      copyright: files.value.copyright,
    },
  };
}
