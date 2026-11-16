// The Repository_Data_File (design section 5): its name, and how its text is
// written and read. Pure: no disk access here (store.ts does the IO).
import {
  formatProgress,
  parseProgress,
  parseReport,
  type ExorcismProgress,
  type HauntedReport,
  type Result,
} from "@haunted-repo/core";

export type DataFileErrorCode = "INVALID_REPORT" | "INVALID_PROGRESS";

export interface DataFileError {
  code: DataFileErrorCode;
  message: string; // English, names the file
}

export interface DataFileContent {
  report: HauntedReport;
  progress: ExorcismProgress;
}

const MARKER = "haunted-repo--";
const OWNER_PATTERN = /^[a-z0-9-]+$/;
const REPO_PATTERN = /^[a-z0-9._-]+$/;
const OWN_FILE_PATTERN = /^haunted-repo--[a-z0-9-]+@[a-z0-9._-]+\.json$/;

/**
 * Name of the Repository_Data_File of one repository, in lowercase.
 * Throws if owner or repo has a character that parseRepoUrl would refuse.
 */
export function dataFileName(owner: string, repo: string): string {
  const lowOwner = owner.toLowerCase();
  const lowRepo = repo.toLowerCase();
  if (!OWNER_PATTERN.test(lowOwner)) {
    throw new Error(`Invalid repository owner for a data file: "${owner}".`);
  }
  if (!REPO_PATTERN.test(lowRepo)) {
    throw new Error(`Invalid repository name for a data file: "${repo}".`);
  }
  return `${MARKER}${lowOwner}@${lowRepo}.json`;
}

/** True only for names that Haunted Repo owns (Requirement 7.11). */
export function isOwnDataFile(name: string): boolean {
  return OWN_FILE_PATTERN.test(name);
}

/** Text of the file: { format: 1, report, progress } and no other keys. */
export function serialiseDataFile(
  report: HauntedReport,
  progress: ExorcismProgress,
): string {
  return `{"format":1,"report":${JSON.stringify(report)},"progress":${formatProgress(progress)}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(
  code: DataFileErrorCode,
  fileName: string,
  problem: string,
): Result<DataFileContent, DataFileError> {
  return {
    ok: false,
    error: {
      code,
      message: `The saved file "${fileName}" is broken: ${problem}`,
    },
  };
}

/** Reads the text of a Repository_Data_File. Never throws. */
export function parseDataFile(
  text: string,
  fileName: string,
): Result<DataFileContent, DataFileError> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("INVALID_REPORT", fileName, "it is not valid JSON text.");
  }
  if (!isRecord(raw) || raw["format"] !== 1) {
    return fail("INVALID_REPORT", fileName, "its format is not 1.");
  }
  if (!("report" in raw)) {
    return fail("INVALID_REPORT", fileName, "it has no report.");
  }
  const report = parseReport(JSON.stringify(raw["report"]));
  if (!report.ok) {
    return fail("INVALID_REPORT", fileName, report.error.message);
  }
  if (!("progress" in raw)) {
    return fail("INVALID_PROGRESS", fileName, "it has no progress.");
  }
  const progress = parseProgress(JSON.stringify(raw["progress"]));
  if (!progress.ok) {
    return fail("INVALID_PROGRESS", fileName, progress.error.message);
  }
  const { owner, repo } = report.value.overview;
  let expected: string;
  try {
    expected = dataFileName(owner, repo);
  } catch {
    expected = "";
  }
  if (expected !== fileName) {
    return fail(
      "INVALID_REPORT",
      fileName,
      `its report is for ${owner}/${repo}, which does not match the file name.`,
    );
  }
  return {
    ok: true,
    value: { report: report.value, progress: progress.value },
  };
}
