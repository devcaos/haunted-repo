import { describe, expect, it } from "vitest";
import { isCode } from "./errors.js";
import {
  createFakeGitHub,
  type FakeGitHubOptions,
  type FakeRepo,
} from "./fakeGitHub.testutil.js";
import { createGitHubClient } from "./githubClient.js";

const files = { "src/a.ts": "const a = 1;\n", "README.md": "# hi\n" };

/** The real client sends no User-Agent; Node and browsers add one. The wrapper does the same. */
function setup(
  repos: FakeRepo[] = [{ owner: "o", repo: "r", files, shas: ["abc123"] }],
  options: FakeGitHubOptions = {},
  timeoutMs?: number,
) {
  const fake = createFakeGitHub(repos, options);
  const wrapped = ((input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "vitest");
    return fake(input, { ...init, headers });
  }) as typeof fetch;
  const client = createGitHubClient({
    fetch: wrapped,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  return { client, fake };
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
}

describe("createGitHubClient", () => {
  it("returns the default branch", async () => {
    const { client } = setup([
      { owner: "o", repo: "r", defaultBranch: "dev", files },
    ]);
    expect(await client.getRepo("o", "r")).toEqual({ defaultBranch: "dev" });
  });

  it("returns tree entries and the truncated flag", async () => {
    const { client } = setup();
    const { entries, truncated } = await client.getTree("o", "r", "main");
    expect(truncated).toBe(false);
    expect(entries).toContainEqual({
      path: "src/a.ts",
      mode: "100644",
      type: "blob",
      size: 13,
    });
    expect(entries).toContainEqual({
      path: "src",
      mode: "040000",
      type: "tree",
    });
  });

  it("reads a tree by commit SHA and reports truncated", async () => {
    const { client } = setup([
      { owner: "o", repo: "r", files, shas: ["abc123"], truncated: true },
    ]);
    const result = await client.getTree("o", "r", "abc123");
    expect(result.truncated).toBe(true);
  });

  it("maps a missing repository to REPO_NOT_FOUND", async () => {
    const { client } = setup();
    expect(await codeOf(client.getRepo("o", "nope"))).toBe("REPO_NOT_FOUND");
  });

  it("maps an empty repository tree (409) to EMPTY_REPO", async () => {
    const { client } = setup([{ owner: "o", repo: "r", files: {} }]);
    expect(await codeOf(client.getTree("o", "r", "main"))).toBe("EMPTY_REPO");
  });

  it("maps a wrong tree ref (404) to NETWORK_ERROR", async () => {
    const { client } = setup();
    expect(await codeOf(client.getTree("o", "r", "deadbeef"))).toBe(
      "NETWORK_ERROR",
    );
  });

  it("maps a rate limit to RATE_LIMITED with the UTC reset time", async () => {
    const { client } = setup(undefined, {
      rateLimitAfter: 0,
      rateLimitReset: 1_900_000_000,
    });
    const error = await client.getRepo("o", "r").catch((e: unknown) => e);
    expect(isCode(error, "RATE_LIMITED")).toBe(true);
    expect((error as Error).message).toBe(
      "GitHub rate limit reached. It resets at 2030-03-17T17:46:40Z. Try again after that.",
    );
  });

  it("maps 403/429 with retry-after or without headers to RATE_LIMITED", async () => {
    const respond = (status: number, headers: Record<string, string>) =>
      createGitHubClient({
        fetch: (() =>
          Promise.resolve(
            new Response("{}", { status, headers }),
          )) as typeof fetch,
      }).getRepo("o", "r");
    const withRetry = await respond(429, { "retry-after": "30" }).catch(
      (e: unknown) => e,
    );
    expect((withRetry as Error).message).toContain("about 30 seconds");
    expect(await codeOf(respond(403, {}))).toBe("RATE_LIMITED");
    expect(await codeOf(respond(403, { "x-ratelimit-remaining": "5" }))).toBe(
      "RATE_LIMITED",
    );
  });

  it("maps a 5xx to NETWORK_ERROR", async () => {
    const { client } = setup(undefined, { serverError: 503 });
    expect(await codeOf(client.getRepo("o", "r"))).toBe("NETWORK_ERROR");
  });

  it("maps a body that is not JSON to NETWORK_ERROR", async () => {
    const client = createGitHubClient({
      fetch: (() =>
        Promise.resolve(
          new Response("<html>", { status: 200 }),
        )) as typeof fetch,
    });
    expect(await codeOf(client.getRepo("o", "r"))).toBe("NETWORK_ERROR");
  });

  it("maps a rejected fetch to NETWORK_ERROR", async () => {
    const client = createGitHubClient({
      fetch: (() => Promise.reject(new TypeError("offline"))) as typeof fetch,
    });
    expect(await codeOf(client.getRepo("o", "r"))).toBe("NETWORK_ERROR");
  });

  it("maps a timeout to NETWORK_ERROR", async () => {
    const { client } = setup(undefined, { hang: true }, 20);
    expect(await codeOf(client.getRepo("o", "r"))).toBe("NETWORK_ERROR");
  });

  it("sends the required headers and no User-Agent or auth", async () => {
    let seen: Headers | undefined;
    let signal: AbortSignal | null | undefined;
    const client = createGitHubClient({
      fetch: ((_url: string, init?: RequestInit) => {
        seen = new Headers(init?.headers);
        signal = init?.signal;
        return Promise.resolve(new Response('{"default_branch":"main"}'));
      }) as unknown as typeof fetch,
    });
    await client.getRepo("o", "r");
    expect(seen?.get("accept")).toBe("application/vnd.github+json");
    expect(seen?.get("x-github-api-version")).toBe("2022-11-28");
    expect(seen?.has("user-agent")).toBe(false);
    expect(seen?.has("authorization")).toBe(false);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("counts requests and throws a plain Error on the 9th", async () => {
    const { client, fake } = setup();
    expect(client.requestCount).toBe(0);
    for (let i = 0; i < 8; i++) await client.getRepo("o", "r");
    expect(client.requestCount).toBe(8);
    const error = await client.getRepo("o", "r").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("Error");
    expect(fake.requestCount).toBe(8);
  });
});
