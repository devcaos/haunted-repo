import { DetectError } from "./errors.js";

/** One entry of a GitHub git tree. `size` exists only for blobs. */
export interface TreeEntry {
  path: string;
  mode: string;
  type: string;
  size?: number;
}

export interface GitHubClientOptions {
  fetch?: typeof fetch; // injectable for tests
  timeoutMs?: number; // default 10_000
}

export interface GitHubClient {
  getRepo(
    owner: string,
    repo: string,
  ): Promise<{ defaultBranch: string | null }>;
  // ref: the default branch name, or the test-only commit SHA
  getTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<{ entries: TreeEntry[]; truncated: boolean }>;
  /** Raw text of one file. Throws NOT_TEXT if it is not valid UTF-8 or has a NUL byte. */
  getFileText(
    owner: string,
    repo: string,
    ref: string,
    path: string,
  ): Promise<string>;
  readonly requestCount: number;
}

const API_ROOT = "https://api.github.com";
const MAX_REQUESTS = 8;
const DEFAULT_TIMEOUT_MS = 10_000;

const NETWORK_MESSAGE = "Could not reach GitHub. Please try again in a moment.";

function networkError(): DetectError {
  return new DetectError("NETWORK_ERROR", NETWORK_MESSAGE);
}

function rateLimitError(headers: Headers): DetectError {
  if (headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(headers.get("x-ratelimit-reset"));
    if (headers.get("x-ratelimit-reset") !== null && Number.isFinite(reset)) {
      const time = new Date(reset * 1000);
      if (!Number.isNaN(time.getTime())) {
        const iso = time.toISOString().replace(/\.\d{3}Z$/, "Z");
        return new DetectError(
          "RATE_LIMITED",
          `GitHub rate limit reached. It resets at ${iso}. Try again after that.`,
        );
      }
    }
  }
  const retryAfter = Number(headers.get("retry-after"));
  if (headers.get("retry-after") !== null && Number.isFinite(retryAfter)) {
    return new DetectError(
      "RATE_LIMITED",
      `GitHub rate limit reached. Try again in about ${Math.ceil(retryAfter)} seconds.`,
    );
  }
  return new DetectError(
    "RATE_LIMITED",
    "GitHub rate limit reached. Try again in a minute.",
  );
}

export function createGitHubClient(
  opts: GitHubClientOptions = {},
): GitHubClient {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let count = 0;

  /** One anonymous GET. Throws DetectError for rate limits and network failures. */
  async function get(
    path: string,
    accept = "application/vnd.github+json",
  ): Promise<Response> {
    if (count >= MAX_REQUESTS) {
      throw new Error(`GitHub request budget of ${MAX_REQUESTS} exceeded`);
    }
    count++;
    const doFetch = opts.fetch ?? globalThis.fetch;
    let response: Response;
    try {
      response = await doFetch(`${API_ROOT}${path}`, {
        method: "GET",
        headers: {
          Accept: accept,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw networkError();
    }
    if (response.status === 403 || response.status === 429) {
      throw rateLimitError(response.headers);
    }
    return response;
  }

  async function readJson(
    response: Response,
  ): Promise<Record<string, unknown>> {
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && !Array.isArray(body)) {
        return body as Record<string, unknown>;
      }
    } catch {
      // falls through to the error below
    }
    throw networkError();
  }

  return {
    get requestCount(): number {
      return count;
    },

    async getRepo(owner, repo) {
      const response = await get(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      if (response.status === 404) {
        throw new DetectError(
          "REPO_NOT_FOUND",
          "Repository not found. Only public GitHub repositories are supported.",
        );
      }
      if (response.status !== 200) throw networkError();
      const body = await readJson(response);
      const branch = body["default_branch"];
      return {
        defaultBranch:
          typeof branch === "string" && branch !== "" ? branch : null,
      };
    },

    async getTree(owner, repo, ref) {
      const response = await get(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
          `/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      );
      if (response.status === 409) {
        throw new DetectError(
          "EMPTY_REPO",
          "This repository is empty. Add some code and try again.",
        );
      }
      if (response.status !== 200) throw networkError();
      const body = await readJson(response);
      const tree = body["tree"];
      if (!Array.isArray(tree)) throw networkError();
      const entries: TreeEntry[] = [];
      for (const item of tree as unknown[]) {
        if (typeof item !== "object" || item === null) throw networkError();
        const { path, mode, type, size } = item as Record<string, unknown>;
        if (
          typeof path !== "string" ||
          typeof mode !== "string" ||
          typeof type !== "string"
        ) {
          throw networkError();
        }
        entries.push(
          typeof size === "number"
            ? { path, mode, type, size }
            : { path, mode, type },
        );
      }
      return { entries, truncated: body["truncated"] === true };
    },

    async getFileText(owner, repo, ref, path) {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const response = await get(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
          `/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
        "application/vnd.github.raw+json",
      );
      const readError = (): DetectError =>
        new DetectError(
          "NETWORK_ERROR",
          `Could not read the file "${path}" from GitHub. Please try again in a moment.`,
        );
      if (response.status !== 200) throw readError();
      let bytes: ArrayBuffer;
      try {
        bytes = await response.arrayBuffer();
      } catch {
        // A timeout or a dropped connection while reading the body.
        throw readError();
      }
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw new DetectError("NOT_TEXT", `The file "${path}" is not text.`);
      }
      if (text.includes("\u0000")) {
        throw new DetectError("NOT_TEXT", `The file "${path}" is not text.`);
      }
      return text;
    },
  };
}
