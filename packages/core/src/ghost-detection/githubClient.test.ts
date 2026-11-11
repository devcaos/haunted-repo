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

  describe("getFileText", () => {
    it("reads a normal file", async () => {
      const { client } = setup();
      expect(await client.getFileText("o", "r", "main", "src/a.ts")).toBe(
        "const a = 1;\n",
      );
    });

    it("reads a path with spaces and non-ASCII characters", async () => {
      const { client } = setup([
        {
          owner: "o",
          repo: "r",
          files: { "mi carpeta/año #1.ts": "ok ñ\n" },
        },
      ]);
      expect(
        await client.getFileText("o", "r", "main", "mi carpeta/año #1.ts"),
      ).toBe("ok ñ\n");
    });

    it("maps invalid UTF-8 to NOT_TEXT", async () => {
      const { client } = setup([
        {
          owner: "o",
          repo: "r",
          files: { "bad.txt": new Uint8Array([0x61, 0xff, 0xfe, 0x62]) },
        },
      ]);
      expect(
        await codeOf(client.getFileText("o", "r", "main", "bad.txt")),
      ).toBe("NOT_TEXT");
    });

    it("maps a NUL byte to NOT_TEXT", async () => {
      const { client } = setup([
        { owner: "o", repo: "r", files: { "nul.txt": "ab\u0000cd" } },
      ]);
      expect(
        await codeOf(client.getFileText("o", "r", "main", "nul.txt")),
      ).toBe("NOT_TEXT");
    });

    it("maps a missing file (404) to NETWORK_ERROR mentioning the file", async () => {
      const { client } = setup();
      const error = await client
        .getFileText("o", "r", "main", "nope.ts")
        .catch((e: unknown) => e);
      expect(isCode(error, "NETWORK_ERROR")).toBe(true);
      expect((error as Error).message).toContain("nope.ts");
    });

    it("maps a rate limit to RATE_LIMITED", async () => {
      const { client } = setup(undefined, { rateLimitAfter: 0 });
      expect(
        await codeOf(client.getFileText("o", "r", "main", "src/a.ts")),
      ).toBe("RATE_LIMITED");
    });

    it("maps a body that fails while reading to NETWORK_ERROR, not NOT_TEXT", async () => {
      const client = createGitHubClient({
        fetch: (() => {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.error(new Error("connection cut"));
            },
          });
          return Promise.resolve(new Response(body, { status: 200 }));
        }) as typeof fetch,
      });
      const error = await client
        .getFileText("o", "r", "main", "src/a.ts")
        .catch((e: unknown) => e);
      expect(isCode(error, "NETWORK_ERROR")).toBe(true);
      expect((error as Error).message).toContain("src/a.ts");
    });

    it("always sends the raw Accept header and counts the request", async () => {
      const accepts: string[] = [];
      const { client, fake } = setup();
      const spy = createGitHubClient({
        fetch: ((url: string, init?: RequestInit) => {
          accepts.push(new Headers(init?.headers).get("accept") ?? "");
          return fake(url, {
            ...init,
            headers: {
              ...Object.fromEntries(new Headers(init?.headers)),
              "User-Agent": "vitest",
            },
          });
        }) as typeof fetch,
      });
      await spy.getFileText("o", "r", "main", "src/a.ts");
      expect(accepts).toEqual(["application/vnd.github.raw+json"]);
      expect(spy.requestCount).toBe(1);
      await client.getFileText("o", "r", "main", "README.md");
      expect(client.requestCount).toBe(1);
    });
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
