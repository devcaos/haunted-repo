import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { detectGhosts } from "@haunted-repo/core";
import { describe, expect, it } from "vitest";
import {
  ForbiddenUrlError,
  guardFetch,
  RedirectRefusedError,
} from "./guardFetch.js";

interface Call {
  input: string | URL | Request;
  init: RequestInit | undefined;
}

// Recording fake: never touches the network.
function recorder(): { calls: Call[]; fetch: typeof fetch } {
  const calls: Call[] = [];
  const fake: typeof fetch = (input, init) => {
    calls.push({ input, init });
    return Promise.resolve(new Response("ok", { status: 200 }));
  };
  return { calls, fetch: fake };
}

describe("guardFetch", () => {
  it.each([
    "https://example.com/repos/a/b",
    "https://api.github.com.evil.example/",
    "http://api.github.com/repos/a/b",
    "https://api.github.com:8443/repos/a/b",
    "https://u:p@api.github.com/",
    "not a url",
    "",
  ])("refuses %j without calling the inner fetch", async (url) => {
    const rec = recorder();
    await expect(guardFetch(rec.fetch)(url)).rejects.toBeInstanceOf(
      ForbiddenUrlError,
    );
    expect(rec.calls).toHaveLength(0);
  });

  it("refuses a URL object and a Request with another origin", async () => {
    const rec = recorder();
    const guarded = guardFetch(rec.fetch);
    await expect(
      guarded(new URL("https://example.com/repos/a/b")),
    ).rejects.toBeInstanceOf(ForbiddenUrlError);
    await expect(
      guarded(new Request("https://api.github.com.evil.example/")),
    ).rejects.toBeInstanceOf(ForbiddenUrlError);
    expect(rec.calls).toHaveLength(0);
  });

  it("passes a URL under https://api.github.com/ with redirect error", async () => {
    const rec = recorder();
    const url = "https://api.github.com/repos/lukeed/sirv";
    const init: RequestInit = {
      method: "GET",
      headers: { Accept: "application/vnd.github+json" },
    };
    const response = await guardFetch(rec.fetch)(url, init);
    expect(response.status).toBe(200);
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0]?.input).toBe(url);
    expect(rec.calls[0]?.init).toEqual({ ...init, redirect: "error" });
    expect(init.redirect).toBeUndefined();
    expect(new Headers(rec.calls[0]?.init?.headers).has("Authorization")).toBe(
      false,
    );
  });

  it("passes URL and Request inputs under the allowed origin", async () => {
    const rec = recorder();
    const guarded = guardFetch(rec.fetch);
    const url = new URL("https://api.github.com/repos/a/b");
    const request = new Request("https://api.github.com/repos/a/b/git/trees");
    await guarded(url);
    await guarded(request);
    expect(rec.calls.map((c) => c.input)).toEqual([url, request]);
    expect(rec.calls.map((c) => c.init?.redirect)).toEqual(["error", "error"]);
    expect(request.headers.has("Authorization")).toBe(false);
  });

  it("asks for redirect error even when the caller asks to follow", async () => {
    const rec = recorder();
    await guardFetch(rec.fetch)("https://api.github.com/repos/a/b", {
      redirect: "follow",
    });
    expect(rec.calls[0]?.init?.redirect).toBe("error");
  });

  it("turns a refused redirect into a clear RedirectRefusedError", async () => {
    // Same shape as Node's fetch (checked against the real fetch below).
    const redirecting: typeof fetch = () =>
      Promise.reject(
        new TypeError("fetch failed", {
          cause: new Error("unexpected redirect"),
        }),
      );
    const error: unknown = await guardFetch(redirecting)(
      "https://api.github.com/repos/old/name",
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RedirectRefusedError);
    expect((error as Error).message).toContain("redirect");
    expect((error as Error).message).toContain("new URL");
  });

  it("passes other inner fetch errors on unchanged", async () => {
    const original = new TypeError("fetch failed", {
      cause: new Error("getaddrinfo ENOTFOUND"),
    });
    const failing: typeof fetch = () => Promise.reject(original);
    await expect(
      guardFetch(failing)("https://api.github.com/repos/a/b"),
    ).rejects.toBe(original);
  });

  it("matches how the real Node fetch refuses a 3xx with redirect error", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(301, { location: "https://example.com/" });
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const error: unknown = await fetch(`http://127.0.0.1:${port}/`, {
        redirect: "error",
      }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(TypeError);
      const cause = (error as TypeError).cause;
      expect(cause).toBeInstanceOf(Error);
      expect((cause as Error).message).toBe("unexpected redirect");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("guardFetch with detectGhosts", () => {
  it("tells the Student that a redirect was refused", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(301, {
        Location: "https://api.github.com/repos/new-owner/repo",
      });
      response.end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;
    // The guard checks the api.github.com URL; the inner fetch sends it to
    // the local server, which answers with a real 301.
    const inner: typeof fetch = (input, init) =>
      fetch(
        String(input).replace(
          "https://api.github.com",
          `http://127.0.0.1:${port}`,
        ),
        init,
      );
    try {
      const result = await detectGhosts("https://github.com/old-owner/repo", {
        fetch: guardFetch(inner),
      });
      expect(result).toEqual({
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: new RedirectRefusedError().message,
        },
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
