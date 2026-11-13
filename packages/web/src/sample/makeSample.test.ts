import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFetch } from "../logic/fakeDetect.testutil.js";
import type { FakeRepo } from "../logic/fakeDetect.testutil.js";
import { SAMPLE_SHA, copyrightLineOf, makeSample } from "./makeSample.js";

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network is forbidden in tests");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ts = (n: number): string => "const a = 1;\n".repeat(n);

const LICENCE =
  "MIT License\n\n  Copyright (c) Luke Edwards  \n\nPermission...\n";

const ghostFiles: Record<string, string> = {
  "src/index.ts": ts(300),
  "src/util.ts": ts(5),
  "src/deep/helper.ts": ts(50),
  "app.py": ts(100),
  "lib/Thing.java": ts(20),
};

function sirv(files: Record<string, string> = {}): FakeRepo {
  return {
    owner: "lukeed",
    repo: "sirv",
    defaultBranch: "master",
    shas: [SAMPLE_SHA],
    files: { ...ghostFiles, license: LICENCE, ...files },
  };
}

describe("makeSample with the strict fake GitHub", () => {
  it("gives the report, one text per ghost and the copyright line", async () => {
    const fake = createFakeFetch([sirv()]);
    const result = await makeSample({ fetch: fake.fetch });
    if (!result.ok) throw new Error(result.error);

    const report = JSON.parse(result.value.reportJson) as {
      overview: { ref: string };
      ghosts: { path: string }[];
    };
    const files = JSON.parse(result.value.filesJson) as {
      copyright: string;
      texts: Record<string, string>;
    };
    expect(report.overview.ref).toBe(SAMPLE_SHA);
    expect(report.ghosts).toHaveLength(5);
    expect(Object.keys(files.texts).sort()).toEqual(
      report.ghosts.map((g) => g.path).sort(),
    );
    for (const [path, text] of Object.entries(files.texts)) {
      expect(text).toBe(ghostFiles[path]);
    }
    expect(files.copyright).toBe("Copyright (c) Luke Edwards");
    expect(result.value.licenceText).toBe(LICENCE);
    expect(result.value.reportJson.endsWith("}\n")).toBe(true);
    expect(result.value.filesJson.endsWith("}\n")).toBe(true);

    const treeUrls = fake.urls.filter((u) => u.includes("/git/trees/"));
    expect(treeUrls).toHaveLength(1);
    expect(treeUrls[0]).toContain(`/git/trees/${SAMPLE_SHA}`);
    expect(fake.requestCount()).toBeLessThanOrEqual(14);
  });

  it("gives an error when the repository is not found", async () => {
    const result = await makeSample({ fetch: createFakeFetch([]).fetch });
    expect(result.ok).toBe(false);
  });

  it("gives an error when the rate limit hits after k requests", async () => {
    const full = createFakeFetch([sirv()]);
    expect((await makeSample({ fetch: full.fetch })).ok).toBe(true);
    for (let k = 0; k < full.requestCount(); k++) {
      const fake = createFakeFetch([sirv()], { rateLimitAfter: k });
      const result = await makeSample({ fetch: fake.fetch });
      expect(result.ok, `rate limit after ${k}`).toBe(false);
    }
  });

  it("gives an error when the license file is missing", async () => {
    const repo = sirv();
    delete repo.files["license"];
    const result = await makeSample({ fetch: createFakeFetch([repo]).fetch });
    expect(result.ok).toBe(false);
  });

  it("gives an error when the licence has no copyright line", async () => {
    const fake = createFakeFetch([sirv({ license: "MIT License\n" })]);
    const result = await makeSample({ fetch: fake.fetch });
    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });
});

describe("copyrightLineOf", () => {
  it("returns the first matching line", () => {
    expect(copyrightLineOf("MIT\nCopyright A\nCopyright B\n")).toBe(
      "Copyright A",
    );
  });

  it("matches any case and trims the line", () => {
    expect(copyrightLineOf("x\r\n   COPYRIGHT (c) 2020 Z \t\r\n")).toBe(
      "COPYRIGHT (c) 2020 Z",
    );
  });

  it("returns null when no line starts with copyright", () => {
    expect(copyrightLineOf("MIT License\nThe copyright holder\n")).toBeNull();
    expect(copyrightLineOf("")).toBeNull();
  });
});
