import { describe, expect, it } from "vitest";
import { createFakeGitHub, type FakeRepo } from "./fakeGitHub.testutil.js";

const repo: FakeRepo = {
  owner: "o",
  repo: "r",
  files: { "src/a.ts": "const a = 1;" },
};
const base = "https://api.github.com/repos/o/r";
const good = { "User-Agent": "test", Accept: "application/vnd.github+json" };

describe("fake GitHub", () => {
  it("answers 404 for an unknown tree ref", async () => {
    const f = createFakeGitHub([repo]);
    const res = await f(`${base}/git/trees/nope?recursive=1`, {
      headers: good,
    });
    expect(res.status).toBe(404);
  });

  it("answers 400 without User-Agent", async () => {
    const f = createFakeGitHub([repo]);
    const res = await f(base, {
      headers: { Accept: "application/vnd.github+json" },
    });
    expect(res.status).toBe(400);
  });

  it("answers 405 for POST", async () => {
    const f = createFakeGitHub([repo]);
    expect((await f(base, { method: "POST", headers: good })).status).toBe(405);
  });

  it("returns the tree with size only on blobs", async () => {
    const f = createFakeGitHub([repo]);
    const body = (await (
      await f(`${base}/git/trees/main?recursive=1`, { headers: good })
    ).json()) as {
      tree: { path: string; type: string; size?: number }[];
      truncated: boolean;
    };
    expect(body.truncated).toBe(false);
    expect(body.tree.find((e) => e.type === "tree")).not.toHaveProperty("size");
    expect(body.tree.find((e) => e.type === "blob")?.size).toBe(12);
  });

  it("returns JSON for non-raw contents and raw text for the raw Accept", async () => {
    const f = createFakeGitHub([repo]);
    const url = `${base}/contents/src/a.ts?ref=main`;
    const body = (await (await f(url, { headers: good })).json()) as {
      encoding: string;
      content: string;
    };
    expect(body.encoding).toBe("base64");
    expect(atob(body.content)).toBe("const a = 1;");
    const raw = await f(url, {
      headers: { ...good, Accept: "application/vnd.github.raw+json" },
    });
    expect(await raw.text()).toBe("const a = 1;");
  });

  it("answers 403 with rate-limit headers after N requests", async () => {
    const f = createFakeGitHub([repo], {
      rateLimitAfter: 1,
      rateLimitReset: 1234,
    });
    expect((await f(base, { headers: good })).status).toBe(200);
    const res = await f(base, { headers: good });
    expect(res.status).toBe(403);
    expect(res.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(res.headers.get("x-ratelimit-reset")).toBe("1234");
  });

  it("answers 409 on the tree of an empty repo", async () => {
    const f = createFakeGitHub([{ owner: "o", repo: "e", files: {} }]);
    const res = await f(
      "https://api.github.com/repos/o/e/git/trees/main?recursive=1",
      { headers: good },
    );
    expect(res.status).toBe(409);
  });

  it("hangs until the abort signal fires", async () => {
    const f = createFakeGitHub([repo], { hang: true });
    const res = f(base, { headers: good, signal: AbortSignal.timeout(20) });
    await expect(res).rejects.toThrow();
  });

  it("counts requests", async () => {
    const f = createFakeGitHub([repo]);
    await f(base, { headers: good });
    await f(base, { headers: good });
    expect(f.requestCount).toBe(2);
  });
});
