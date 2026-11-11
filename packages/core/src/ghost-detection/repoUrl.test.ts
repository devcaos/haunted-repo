import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatRepoUrl, parseRepoUrl } from "./repoUrl.js";

describe("parseRepoUrl", () => {
  const accepted = [
    "https://github.com/owner/repo",
    "github.com/owner/repo",
    "http://github.com/owner/repo",
    "HTTPS://GitHub.com/owner/repo",
    "https://www.github.com/owner/repo",
    "www.github.com/owner/repo",
    "https://github.com/owner/repo.git",
    "https://github.com/owner/repo/",
    "https://github.com/owner/repo/tree/main/src",
    "https://github.com/owner/repo/issues",
    "https://github.com/owner/repo?tab=readme#top",
    "  https://github.com/owner/repo  ",
  ];

  it.each(accepted)("accepts %s", (url) => {
    expect(parseRepoUrl(url)).toEqual({
      ok: true,
      value: { owner: "owner", repo: "repo" },
    });
  });

  const rejected = [
    "",
    "   ",
    "https://gitlab.com/owner/repo",
    "https://github.com/",
    "https://github.com/owner",
    "https://github.com/owner/",
    "https://github.com//repo",
    "https://github.com/owner/..",
    "https://github.com/owner/.",
    "https://github.com/owner/.git",
    "https://notgithub.com/owner/repo",
    "https://github.com.evil.com/owner/repo",
    "https://github.com/ow ner/repo",
  ];

  it.each(rejected)("rejects %j with INVALID_URL", (url) => {
    const result = parseRepoUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_URL");
      expect(result.error.message).toBe(
        "That does not look like a GitHub repository URL. Example: https://github.com/owner/repo",
      );
    }
  });

  it("never throws for any string", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(() => parseRepoUrl(text)).not.toThrow();
      }),
    );
  });
});

describe("formatRepoUrl", () => {
  it("returns the canonical URL without a ref", () => {
    expect(formatRepoUrl({ owner: "o", repo: "r" })).toBe(
      "https://github.com/o/r",
    );
  });
});

describe("repository URL properties", () => {
  // Feature: ghost-detection, Property 1: Repository URL round trip
  it("parsing a formatted URL returns the same reference", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9-]{1,20}$/),
        fc
          .stringMatching(/^[A-Za-z0-9._-]{1,20}$/)
          .filter((r) => !r.endsWith(".git") && r !== "." && r !== ".."),
        (owner, repo) => {
          const result = parseRepoUrl(formatRepoUrl({ owner, repo }));
          expect(result).toEqual({ ok: true, value: { owner, repo } });
        },
      ),
      { numRuns: 100 },
    );
  });
});
