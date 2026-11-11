import { fail, ok } from "./errors.js";
import type { RepoReference, Result } from "./types.js";

const INVALID_URL_MESSAGE =
  "That does not look like a GitHub repository URL. Example: https://github.com/owner/repo";

const OWNER_PATTERN = /^[A-Za-z0-9-]+$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Reads a public GitHub repository URL. Never throws.
 * Extra path parts (/tree/main, /issues, a final /) are ignored.
 * A branch or ref is never read from the URL.
 */
export function parseRepoUrl(text: string): Result<RepoReference> {
  if (typeof text !== "string") {
    return fail("INVALID_URL", INVALID_URL_MESSAGE);
  }

  let rest = text.trim();
  rest = rest.split("#")[0] ?? "";
  rest = rest.split("?")[0] ?? "";
  rest = rest.replace(/^https?:\/\//i, "");
  rest = rest.replace(/^www\./i, "");

  const hostMatch = /^github\.com\//i.exec(rest);
  if (hostMatch === null) {
    return fail("INVALID_URL", INVALID_URL_MESSAGE);
  }

  const [owner, rawRepo] = rest.slice(hostMatch[0].length).split("/");
  if (owner === undefined || !OWNER_PATTERN.test(owner)) {
    return fail("INVALID_URL", INVALID_URL_MESSAGE);
  }
  if (rawRepo === undefined || !REPO_PATTERN.test(rawRepo)) {
    return fail("INVALID_URL", INVALID_URL_MESSAGE);
  }

  const repo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;
  if (repo === "" || repo === "." || repo === "..") {
    return fail("INVALID_URL", INVALID_URL_MESSAGE);
  }

  return ok({ owner, repo });
}

/** Canonical URL of a repository. Never includes a ref. */
export function formatRepoUrl(ref: RepoReference): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}
