import { describe, expect, it } from "vitest";
import { ForbiddenUrlError, guardFetch } from "./guardFetch.js";

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

  it("passes a URL under https://api.github.com/ unchanged", async () => {
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
    expect(rec.calls[0]?.init).toBe(init);
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
    expect(request.headers.has("Authorization")).toBe(false);
  });
});
