/** Strict fake of the GitHub REST API (tests only). Never more permissive than the real API. */

export interface FakeRepo {
  owner: string;
  repo: string;
  /** Default branch name. Defaults to "main". */
  defaultBranch?: string;
  /** Commit SHAs accepted as tree refs besides the default branch. */
  shas?: string[];
  /** path -> content. A Uint8Array allows invalid UTF-8 bytes. No files = empty repo. */
  files: Record<string, string | Uint8Array>;
  /** Mark the tree answer as truncated. */
  truncated?: boolean;
}

export interface FakeGitHubOptions {
  /** Answer 403 with rate-limit headers once more than this many requests were made. */
  rateLimitAfter?: number;
  /** Value of x-ratelimit-reset (epoch seconds). */
  rateLimitReset?: number;
  /** Answer every request with this 5xx status. */
  serverError?: number;
  /** Never answer; reject only when the abort signal fires. */
  hang?: boolean;
}

export type FakeFetch = typeof fetch & { readonly requestCount: number };

const RAW_ACCEPT = "application/vnd.github.raw+json";
const encoder = new TextEncoder();

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function notFound(): Response {
  return json({ message: "Not Found" }, 404);
}

function toBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? encoder.encode(content) : content;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function treeEntries(repo: FakeRepo): unknown[] {
  const dirs = new Set<string>();
  for (const path of Object.keys(repo.files)) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++)
      dirs.add(parts.slice(0, i).join("/"));
  }
  const entries: unknown[] = [...dirs].map((path) => ({
    path,
    mode: "040000",
    type: "tree",
  }));
  for (const [path, content] of Object.entries(repo.files)) {
    entries.push({
      path,
      mode: "100644",
      type: "blob",
      size: toBytes(content).length,
    });
  }
  return entries;
}

export function createFakeGitHub(
  repos: FakeRepo[],
  options: FakeGitHubOptions = {},
): FakeFetch {
  let count = 0;

  const fake = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    count++;
    const request = input instanceof Request ? input : undefined;
    const signal = init?.signal ?? request?.signal;
    if (options.hang) {
      return new Promise<Response>((_resolve, reject) => {
        const abort = (): void =>
          reject(new DOMException("The operation was aborted.", "AbortError"));
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      });
    }
    if (
      options.rateLimitAfter !== undefined &&
      count > options.rateLimitAfter
    ) {
      return json({ message: "API rate limit exceeded" }, 403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(options.rateLimitReset ?? 1_900_000_000),
      });
    }
    if (options.serverError !== undefined)
      return json({ message: "Server Error" }, options.serverError);

    const method = init?.method ?? request?.method ?? "GET";
    if (method !== "GET") return json({ message: "Method Not Allowed" }, 405);
    const headers = new Headers(init?.headers ?? request?.headers);
    if (!headers.get("user-agent") || !headers.get("accept")) {
      return json(
        { message: "Request forbidden by administrative rules." },
        400,
      );
    }

    const url = new URL(input instanceof Request ? input.url : String(input));
    const match =
      /^\/repos\/([^/]+)\/([^/]+)(?:\/(git\/trees|contents)\/(.+))?$/.exec(
        url.pathname,
      );
    if (!match) return notFound();
    const [, owner, name, route, rest] = match;
    const repo = repos.find((r) => r.owner === owner && r.repo === name);
    if (!repo) return notFound();
    const branch = repo.defaultBranch ?? "main";
    const knownRef = (ref: string): boolean =>
      ref === branch || (repo.shas ?? []).includes(ref);

    if (!route) return json({ name: repo.repo, default_branch: branch });

    if (route === "git/trees") {
      if (!knownRef(decodeURIComponent(rest ?? ""))) return notFound();
      if (Object.keys(repo.files).length === 0)
        return json({ message: "Git Repository is empty." }, 409);
      return json({
        sha: "0".repeat(40),
        tree: treeEntries(repo),
        truncated: repo.truncated ?? false,
      });
    }

    const ref = url.searchParams.get("ref");
    if (ref !== null && !knownRef(ref)) return notFound();
    const path = (rest ?? "").split("/").map(decodeURIComponent).join("/");
    const content = repo.files[path];
    if (content === undefined) return notFound();
    const bytes = toBytes(content);
    if (headers.get("accept")?.includes(RAW_ACCEPT)) {
      return new Response(bytes as BodyInit, {
        status: 200,
        headers: { "content-type": "application/vnd.github.raw+json" },
      });
    }
    return json({
      type: "file",
      path,
      size: bytes.length,
      encoding: "base64",
      content: toBase64(bytes),
    });
  };

  return Object.defineProperty(fake, "requestCount", {
    get: () => count,
  }) as FakeFetch;
}
