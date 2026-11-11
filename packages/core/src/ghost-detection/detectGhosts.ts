import { DetectError, fail, isCode, ok } from "./errors.js";
import { languageOf } from "./eligibility.js";
import { measureFactors } from "./factors.js";
import { createGitHubClient } from "./githubClient.js";
import type { GitHubClientOptions, TreeEntry } from "./githubClient.js";
import { rankKeyFiles } from "./keyFiles.js";
import { parseRepoUrl } from "./repoUrl.js";
import { buildReport } from "./report.js";
import type { ScoredFile } from "./report.js";
import type { FileEntry, HauntedReport, Result, SkippedFile } from "./types.js";

export interface DetectOptions extends GitHubClientOptions {
  /** TEST ONLY: a commit SHA read instead of the default branch. No URL can set it. */
  ref?: string;
}

const MAX_TREE_ENTRIES = 5000;
const MAX_FILE_BYTES = 102_400;
const MAX_GHOSTS = 5;
const MAX_CONTENT_REQUESTS = 6;

function isRegularBlob(entry: TreeEntry): boolean {
  return entry.type === "blob" && entry.mode.startsWith("100");
}

function skippedMessage(skipped: SkippedFile[]): string {
  const list = skipped
    .map(
      (s) =>
        `${s.path} (${s.reason === "TOO_LARGE" ? "too large" : "not text"})`,
    )
    .join(", ");
  return `All supported files were skipped: ${list}. Nothing could be analysed.`;
}

export async function detectGhosts(
  url: string,
  opts: DetectOptions = {},
): Promise<Result<HauntedReport>> {
  const parsed = parseRepoUrl(url);
  if (!parsed.ok) return parsed;
  const { owner, repo } = parsed.value;
  try {
    const client = createGitHubClient(opts);
    const { defaultBranch } = await client.getRepo(owner, repo);
    const ref = opts.ref ?? defaultBranch;
    if (ref === null) {
      throw new DetectError(
        "EMPTY_REPO",
        "This repository is empty. Add some code and try again.",
      );
    }
    const tree = await client.getTree(owner, repo, ref);
    let entries = tree.entries;
    let truncated = tree.truncated;
    if (entries.length > MAX_TREE_ENTRIES) {
      entries = entries.slice(0, MAX_TREE_ENTRIES);
      truncated = true;
    }
    const files: FileEntry[] = entries
      .filter(isRegularBlob)
      .map((e) => ({ path: e.path, size: e.size ?? 0 }));
    const candidates = rankKeyFiles(files);
    if (candidates.length === 0) {
      return fail(
        "NO_SUPPORTED_FILES",
        "No supported source files found. Supported languages: TypeScript, JavaScript, Java and Python. Test files alone are not analysed.",
      );
    }

    const scored: ScoredFile[] = [];
    const skipped: SkippedFile[] = [];
    let used = 0;
    let partial = false;
    for (const c of candidates) {
      if (scored.length === MAX_GHOSTS) break;
      if (c.size > MAX_FILE_BYTES) {
        skipped.push({ path: c.path, reason: "TOO_LARGE" });
        continue;
      }
      if (used === MAX_CONTENT_REQUESTS) break;
      used++;
      try {
        const text = await client.getFileText(owner, repo, ref, c.path);
        const language = languageOf(c.path);
        if (language === null) continue;
        scored.push({ path: c.path, language, factors: measureFactors(text) });
      } catch (e) {
        if (isCode(e, "NOT_TEXT")) {
          skipped.push({ path: c.path, reason: "NOT_TEXT" });
          continue;
        }
        if (isCode(e, "RATE_LIMITED") && scored.length > 0) {
          partial = true;
          break;
        }
        throw e;
      }
    }
    if (scored.length === 0) {
      return fail("NO_SUPPORTED_FILES", skippedMessage(skipped));
    }
    return ok(
      buildReport({
        owner,
        repo,
        ref,
        analysed: candidates.length,
        truncated,
        partial,
        skipped,
        ghosts: scored,
      }),
    );
  } catch (e) {
    if (e instanceof DetectError) return { ok: false, error: e.info };
    throw e;
  }
}
