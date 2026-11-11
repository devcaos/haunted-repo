import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { detectGhosts } from "./detectGhosts.js";
import { createFakeGitHub } from "./fakeGitHub.testutil.js";
import type { FakeGitHubOptions, FakeRepo } from "./fakeGitHub.testutil.js";
import { parseReport } from "./parseReport.js";
import type { HauntedReport, Result } from "./types.js";

type Rewrite = (url: URL, body: Record<string, unknown>) => unknown;

/** The real client sends no User-Agent; Node and browsers add one. The wrapper does the same. */
function setup(
  repos: FakeRepo[],
  options: FakeGitHubOptions = {},
  rewrite?: Rewrite,
) {
  const fake = createFakeGitHub(repos, options);
  const wrapped = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "vitest");
    const response = await fake(input, { ...init, headers });
    if (!rewrite || response.status !== 200) return response;
    const url = new URL(String(input));
    if (url.pathname.includes("/contents/")) return response;
    const body = (await response.json()) as Record<string, unknown>;
    return new Response(JSON.stringify(rewrite(url, body)), { status: 200 });
  }) as typeof fetch;
  return { fetch: wrapped, fake };
}

const ts = (n: number): string => "const a = 1;\n".repeat(n);

const smallRepo: FakeRepo = {
  owner: "o",
  repo: "r",
  shas: ["abc123"],
  files: {
    "src/index.ts": ts(300),
    "src/util.ts": ts(5),
    "src/deep/helper.ts": ts(50),
    "app.py": ts(100),
    "lib/Thing.java": ts(20),
    "README.md": "# docs\n",
    "src/index.test.ts": ts(10),
  },
};

function value(result: Result<HauntedReport>): HauntedReport {
  if (!result.ok) throw new Error(`unexpected error ${result.error.code}`);
  return result.value;
}

function codeOf(result: Result<HauntedReport>): string | undefined {
  return result.ok ? undefined : result.error.code;
}

describe("detectGhosts", () => {
  it("builds a report for a small repository", async () => {
    const { fetch, fake } = setup([smallRepo]);
    const report = value(await detectGhosts("github.com/o/r", { fetch }));
    expect(report.overview).toMatchObject({
      owner: "o",
      repo: "r",
      ref: "main",
      analysed: 5,
      picked: 5,
      truncated: false,
      fewFiles: false,
      partial: false,
      skipped: [],
      message: null,
    });
    const scores = report.ghosts.map((g) => g.difficultyScore);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(report.ghosts.map((g) => g.path).sort()).toEqual([
      "app.py",
      "lib/Thing.java",
      "src/deep/helper.ts",
      "src/index.ts",
      "src/util.ts",
    ]);
    expect(report.ghosts.every((g) => g.floor === "attic")).toBe(true);
    expect(fake.requestCount).toBe(7);
  });

  it("puts a long, nested file on a higher floor", async () => {
    const hard = Array.from(
      { length: 400 },
      () => "\t\t\t\t\t\t\t\tif (x) { for (;;) {} }",
    ).join("\n");
    const { fetch } = setup([
      { owner: "o", repo: "r", files: { "src/a.ts": ts(2), "src/b.ts": hard } },
    ]);
    const report = value(await detectGhosts("github.com/o/r", { fetch }));
    expect(report.ghosts.map((g) => g.path)).toEqual(["src/a.ts", "src/b.ts"]);
    expect(report.ghosts[0]?.floor).toBe("attic");
    expect(report.ghosts[1]?.floor).toBe("basement");
    expect(report.overview.fewFiles).toBe(true);
  });

  it("reads the test-only ref as a commit SHA", async () => {
    const { fetch } = setup([smallRepo]);
    const report = value(
      await detectGhosts("https://github.com/o/r", { fetch, ref: "abc123" }),
    );
    expect(report.overview.ref).toBe("abc123");
  });

  it("returns INVALID_URL", async () => {
    const { fetch, fake } = setup([smallRepo]);
    expect(codeOf(await detectGhosts("nope", { fetch }))).toBe("INVALID_URL");
    expect(fake.requestCount).toBe(0);
  });

  it("returns REPO_NOT_FOUND", async () => {
    const { fetch } = setup([smallRepo]);
    expect(codeOf(await detectGhosts("github.com/o/missing", { fetch }))).toBe(
      "REPO_NOT_FOUND",
    );
  });

  it("returns RATE_LIMITED before any file is read", async () => {
    const { fetch } = setup([smallRepo], { rateLimitAfter: 0 });
    expect(codeOf(await detectGhosts("github.com/o/r", { fetch }))).toBe(
      "RATE_LIMITED",
    );
  });

  it("returns NETWORK_ERROR on a server error", async () => {
    const { fetch } = setup([smallRepo], { serverError: 500 });
    expect(codeOf(await detectGhosts("github.com/o/r", { fetch }))).toBe(
      "NETWORK_ERROR",
    );
  });

  it("returns EMPTY_REPO when the tree answers 409", async () => {
    const { fetch } = setup([{ owner: "o", repo: "r", files: {} }]);
    expect(codeOf(await detectGhosts("github.com/o/r", { fetch }))).toBe(
      "EMPTY_REPO",
    );
  });

  it("returns EMPTY_REPO when there is no default branch", async () => {
    const { fetch } = setup([smallRepo], {}, (url, body) =>
      url.pathname === "/repos/o/r" ? { ...body, default_branch: null } : body,
    );
    expect(codeOf(await detectGhosts("github.com/o/r", { fetch }))).toBe(
      "EMPTY_REPO",
    );
  });

  it("returns NO_SUPPORTED_FILES for docs-only and tests-only repos", async () => {
    const cases: Record<string, string>[] = [
      { "README.md": "# hi\n", "docs/guide.md": "text\n" },
      { "tests/a.ts": ts(3), "src/a.test.ts": ts(3) },
    ];
    for (const files of cases) {
      const { fetch } = setup([{ owner: "o", repo: "r", files }]);
      const result = await detectGhosts("github.com/o/r", { fetch });
      expect(codeOf(result)).toBe("NO_SUPPORTED_FILES");
      if (!result.ok) {
        expect(result.error.message).toContain(
          "TypeScript, JavaScript, Java and Python",
        );
        expect(result.error.message).toContain("Test files alone");
      }
    }
  });

  it("sets truncated when the tree has more than 5,000 entries", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 5001; i++) files[`f${i}.ts`] = "x\n";
    const { fetch } = setup([{ owner: "o", repo: "r", files }]);
    const report = value(await detectGhosts("github.com/o/r", { fetch }));
    expect(report.overview.truncated).toBe(true);
    expect(report.overview.analysed).toBe(5000);
  });

  it("ignores symlink and submodule entries", async () => {
    const { fetch } = setup(
      [{ owner: "o", repo: "r", files: { "src/a.ts": ts(3) } }],
      {},
      (url, body) =>
        url.pathname.includes("/git/trees/")
          ? {
              ...body,
              tree: [
                ...(body["tree"] as unknown[]),
                { path: "link.ts", mode: "120000", type: "blob", size: 5 },
                { path: "mod.ts", mode: "160000", type: "commit" },
              ],
            }
          : body,
    );
    const report = value(await detectGhosts("github.com/o/r", { fetch }));
    expect(report.overview.analysed).toBe(1);
    expect(report.ghosts.map((g) => g.path)).toEqual(["src/a.ts"]);
  });

  it("sets fewFiles for 1 and 2 files", async () => {
    for (const n of [1, 2]) {
      const files: Record<string, string> = {};
      for (let i = 0; i < n; i++) files[`src/f${i}.ts`] = ts(3);
      const { fetch } = setup([{ owner: "o", repo: "r", files }]);
      const report = value(await detectGhosts("github.com/o/r", { fetch }));
      expect(report.overview.fewFiles).toBe(true);
      expect(report.overview.message).toContain(`only ${n} file(s)`);
    }
  });

  describe("skips, partial reports and the request budget", () => {
    const big = "x".repeat(102_401);
    const binary = new Uint8Array(30_000).fill(0xff);
    const repoWith = (files: FakeRepo["files"]): FakeRepo => ({
      owner: "o",
      repo: "r",
      files,
    });

    it("replaces a large file with the next candidate", async () => {
      const { fetch, fake } = setup([
        repoWith({ "src/index.ts": big, "src/a.ts": ts(3), "src/b.ts": ts(4) }),
      ]);
      const report = value(await detectGhosts("github.com/o/r", { fetch }));
      expect(report.ghosts.map((g) => g.path).sort()).toEqual([
        "src/a.ts",
        "src/b.ts",
      ]);
      expect(report.overview.skipped).toEqual([
        { path: "src/index.ts", reason: "TOO_LARGE" },
      ]);
      expect(fake.requestCount).toBe(4);
    });

    it("replaces a binary file with the next candidate", async () => {
      const { fetch } = setup([
        repoWith({
          "src/index.ts": binary,
          "src/a.ts": ts(3),
          "src/b.ts": ts(4),
        }),
      ]);
      const report = value(await detectGhosts("github.com/o/r", { fetch }));
      expect(report.ghosts.map((g) => g.path)).not.toContain("src/index.ts");
      expect(report.ghosts).toHaveLength(2);
      expect(report.overview.skipped).toEqual([
        { path: "src/index.ts", reason: "NOT_TEXT" },
      ]);
    });

    it("returns a partial report when the limit hits on the third file", async () => {
      // Requests: repo, tree, file 1, file 2, then file 3 is limited.
      const { fetch } = setup(
        [
          repoWith({
            "src/a.ts": ts(3),
            "src/b.ts": ts(4),
            "src/c.ts": ts(5),
            "src/d.ts": ts(6),
          }),
        ],
        { rateLimitAfter: 4 },
      );
      const report = value(await detectGhosts("github.com/o/r", { fetch }));
      expect(report.overview.partial).toBe(true);
      expect(report.ghosts).toHaveLength(2);
      expect(parseReport(JSON.stringify(report))).toEqual({
        ok: true,
        value: report,
      });
    });

    it("returns RATE_LIMITED when the limit hits on the first file", async () => {
      const { fetch } = setup([repoWith({ "src/a.ts": ts(3) })], {
        rateLimitAfter: 2,
      });
      expect(codeOf(await detectGhosts("github.com/o/r", { fetch }))).toBe(
        "RATE_LIMITED",
      );
    });

    it("returns NO_SUPPORTED_FILES listing the skipped paths", async () => {
      const { fetch, fake } = setup([
        repoWith({ "src/a.ts": big, "src/b.ts": big }),
      ]);
      const result = await detectGhosts("github.com/o/r", { fetch });
      expect(codeOf(result)).toBe("NO_SUPPORTED_FILES");
      if (!result.ok) {
        expect(result.error.message).toContain("src/a.ts (too large)");
        expect(result.error.message).toContain("src/b.ts (too large)");
      }
      expect(fake.requestCount).toBe(2);
    });

    it("lists a binary file with its reason when all files are skipped", async () => {
      const { fetch } = setup([repoWith({ "src/a.ts": binary })]);
      const result = await detectGhosts("github.com/o/r", { fetch });
      expect(codeOf(result)).toBe("NO_SUPPORTED_FILES");
      if (!result.ok)
        expect(result.error.message).toContain("src/a.ts (not text)");
    });

    it("never makes more than 8 requests and no request for large files", async () => {
      const files: Record<string, string> = {};
      for (let i = 0; i < 20; i++) files[`src/big${i}.ts`] = big;
      const large = setup([repoWith(files)]);
      await detectGhosts("github.com/o/r", { fetch: large.fetch });
      expect(large.fake.requestCount).toBe(2);

      const bins: Record<string, Uint8Array> = {};
      for (let i = 0; i < 20; i++) bins[`src/bin${i}.ts`] = binary;
      const worst = setup([repoWith(bins)]);
      await detectGhosts("github.com/o/r", { fetch: worst.fetch });
      expect(worst.fake.requestCount).toBe(8);
    });
  });

  it("never throws for any URL text", async () => {
    const { fetch } = setup([smallRepo]);
    await fc.assert(
      fc.asyncProperty(fc.string(), async (url) => {
        const result = await detectGhosts(url, { fetch });
        expect(typeof result.ok).toBe("boolean");
      }),
      { numRuns: 100 },
    );
  });
});
