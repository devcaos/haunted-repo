import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ALLOWED_EVENTS,
  buildInstructions,
  startSession,
} from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPower } from "./createPower.js";
import { dataFileName, parseDataFile, serialiseDataFile } from "./dataFile.js";
import {
  dataExistsMessage,
  PARTIAL_WARNING,
  REPO_NOT_FOUND_MESSAGE,
} from "./messages.js";
import {
  HauntedPower,
  type FindGhostsAnswer,
  type ErrorAnswer,
} from "./power.js";
import { createFolderStore, type Store } from "./store.js";
import {
  createTestGitHub,
  type FakeGitHubOptions,
  type FakeRepo,
} from "./testGitHub.testutil.js";

const ts = (n: number): string => "const a = 1;\n".repeat(n);

const fiveFiles: FakeRepo = {
  owner: "o",
  repo: "r",
  files: {
    "src/index.ts": ts(300),
    "src/util.ts": ts(5),
    "src/deep/helper.ts": ts(50),
    "app.py": ts(100),
    "lib/Thing.java": ts(20),
  },
};

const twoFiles: FakeRepo = {
  owner: "o",
  repo: "small",
  files: { "src/a.ts": ts(3), "src/b.ts": ts(4) },
};

const otherRepo: FakeRepo = {
  owner: "other",
  repo: "thing",
  files: { "src/x.ts": ts(3) },
};

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "haunted-power-find-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

function setup(
  repos: FakeRepo[] = [fiveFiles, twoFiles, otherRepo],
  options: FakeGitHubOptions = {},
  store: Store = createFolderStore(folder),
) {
  const github = createTestGitHub(repos, options);
  const power = new HauntedPower({
    fetch: github.fetch,
    store,
    storageOk: true,
  });
  return { power, fake: github.fake };
}

function ok(answer: FindGhostsAnswer | ErrorAnswer): FindGhostsAnswer {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

function fail(answer: FindGhostsAnswer | ErrorAnswer): ErrorAnswer {
  if (answer.ok) throw new Error("unexpected success");
  return answer;
}

async function folderSnapshot(): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const name of await readdir(folder)) {
    snapshot[name] = await readFile(join(folder, name), "utf8");
  }
  return snapshot;
}

describe("find_ghosts", () => {
  it("returns the ghosts in report order, saves them and starts a session", async () => {
    const { power } = setup();
    const answer = ok(await power.findGhosts({ url: "github.com/o/r" }));

    const name = dataFileName("o", "r");
    const text = await readFile(join(folder, name), "utf8");
    const saved = parseDataFile(text, name);
    if (!saved.ok) throw new Error(saved.error.message);
    const { report, progress } = saved.value;

    expect(answer.ghosts).toEqual(
      report.ghosts.map((g) => ({
        path: g.path,
        floor: g.floor,
        difficultyScore: g.difficultyScore,
        reason: g.reason,
      })),
    );
    const scores = answer.ghosts.map((g) => g.difficultyScore);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(progress.ghosts.every((g) => g.state === "haunted")).toBe(true);
    expect(progress.ghosts.map((g) => g.path).sort()).toEqual(
      report.ghosts.map((g) => g.path).sort(),
    );

    const { state } = startSession(report, { profile: { knowsJava: false } });
    expect(answer.step).toBe("choosing");
    expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.choosing);
    expect(answer.instructions).toBe(buildInstructions(state).text);
    expect(answer.hauntedShare).toBe(1);
    expect(answer.suggested).toBe(report.ghosts[0]?.path);
    expect(answer.warning).toBeUndefined();
    expect(answer.message).toContain("Found 5 ghosts in o/r");
  });

  it("uses knowsJava when given", async () => {
    const { power } = setup();
    const answer = ok(
      await power.findGhosts({ url: "github.com/o/r", knowsJava: true }),
    );
    const name = dataFileName("o", "r");
    const saved = parseDataFile(
      await readFile(join(folder, name), "utf8"),
      name,
    );
    if (!saved.ok) throw new Error(saved.error.message);
    const { state } = startSession(saved.value.report, {
      profile: { knowsJava: true },
    });
    expect(answer.instructions).toBe(buildInstructions(state).text);
  });

  it("refuses an invalid URL without any request or file", async () => {
    const { power, fake } = setup();
    const answer = fail(await power.findGhosts({ url: "not a url" }));
    expect(answer.code).toBe("INVALID_URL");
    expect(fake.requestCount).toBe(0);
    expect(await folderSnapshot()).toEqual({});
  });

  it.each<[string, string, FakeRepo[], FakeGitHubOptions]>([
    ["REPO_NOT_FOUND", "github.com/o/missing", [fiveFiles], {}],
    ["RATE_LIMITED", "github.com/o/r", [fiveFiles], { rateLimitAfter: 0 }],
    ["NETWORK_ERROR", "github.com/o/r", [fiveFiles], { serverError: 500 }],
    [
      "EMPTY_REPO",
      "github.com/o/r",
      [{ owner: "o", repo: "r", files: {} }],
      {},
    ],
    [
      "NO_SUPPORTED_FILES",
      "github.com/o/r",
      [{ owner: "o", repo: "r", files: { "README.md": "# hi\n" } }],
      {},
    ],
  ])(
    "returns %s with an English message and saves nothing",
    async (code, url, repos, options) => {
      const { power } = setup(repos, options);
      const answer = fail(await power.findGhosts({ url }));
      expect(answer.code).toBe(code);
      expect(answer.message.length).toBeGreaterThan(0);
      expect(await folderSnapshot()).toEqual({});
      // No session was started.
      expect(await power.houseStatus()).toMatchObject({ code: "NO_SESSION" });
    },
  );

  it("says that only public repositories work and never asks for a token", async () => {
    const { power } = setup();
    const answer = fail(await power.findGhosts({ url: "github.com/o/nope" }));
    expect(answer.message).toBe(REPO_NOT_FOUND_MESSAGE);
    expect(answer.message).toContain("public");
    expect(answer.message).toContain("URL may be wrong");
    expect(answer.message.toLowerCase()).not.toMatch(/token|password/);
  });

  it("warns that a partial list is incomplete", async () => {
    // Requests: repo, tree, first file; the second file is rate limited.
    const { power } = setup([fiveFiles], { rateLimitAfter: 3 });
    const answer = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(answer.ghosts).toHaveLength(1);
    expect(answer.warning).toBe(PARTIAL_WARNING);
  });

  it("adds the report message when there are few files", async () => {
    const { power } = setup();
    const answer = ok(await power.findGhosts({ url: "github.com/o/small" }));
    expect(answer.ghosts).toHaveLength(2);
    expect(answer.message).toContain("only 2 file(s)");
  });

  it("refuses with DATA_EXISTS before any request when a valid file exists", async () => {
    const first = setup();
    ok(await first.power.findGhosts({ url: "github.com/o/r" }));
    const before = await folderSnapshot();

    const { power, fake } = setup();
    const answer = fail(
      await power.findGhosts({ url: "https://github.com/O/R" }),
    );
    const name = dataFileName("o", "r");
    expect(answer).toEqual({
      ok: false,
      code: "DATA_EXISTS",
      message: dataExistsMessage(name),
    });
    expect(answer.message).toContain(name);
    expect(answer.message).toContain("replace: true");
    expect(fake.requestCount).toBe(0);
    expect(await folderSnapshot()).toEqual(before);
  });

  it.each<[string, string]>([
    ["INVALID_REPORT", "{ not json"],
    ["INVALID_REPORT", '{"format":2,"report":{},"progress":{"ghosts":[]}}'],
    ["INVALID_PROGRESS", "progress"],
  ])(
    "refuses a broken file with %s and leaves it unchanged",
    async (code, text) => {
      const name = dataFileName("o", "r");
      let content = text;
      if (text === "progress") {
        // A valid report with a broken progress.
        const first = setup();
        ok(await first.power.findGhosts({ url: "github.com/o/r" }));
        const saved = JSON.parse(
          await readFile(join(folder, name), "utf8"),
        ) as Record<string, unknown>;
        content = JSON.stringify({ ...saved, progress: { ghosts: 3 } });
      }
      await writeFile(join(folder, name), content, "utf8");

      const { power, fake } = setup();
      const answer = fail(await power.findGhosts({ url: "github.com/o/r" }));
      expect(answer.code).toBe(code);
      expect(answer.message).toContain(name);
      expect(answer.message).toContain("replace: true");
      expect(fake.requestCount).toBe(0);
      expect(await readFile(join(folder, name), "utf8")).toBe(content);
    },
  );

  it("with replace: true replaces the file of that repository only", async () => {
    const first = setup();
    ok(await first.power.findGhosts({ url: "github.com/other/thing" }));
    const otherName = dataFileName("other", "thing");
    const otherBefore = await readFile(join(folder, otherName), "utf8");

    // A saved file of o/r with one ghost exorcised.
    ok(await first.power.findGhosts({ url: "github.com/o/r" }));
    const name = dataFileName("o", "r");
    const saved = parseDataFile(
      await readFile(join(folder, name), "utf8"),
      name,
    );
    if (!saved.ok) throw new Error(saved.error.message);
    const [firstGhost, ...rest] = saved.value.progress.ghosts;
    if (firstGhost === undefined) throw new Error("no ghost");
    const edited = serialiseDataFile(saved.value.report, {
      ghosts: [{ ...firstGhost, state: "exorcised" }, ...rest],
    });
    await writeFile(join(folder, name), edited, "utf8");

    const { power } = setup();
    const answer = ok(
      await power.findGhosts({ url: "github.com/o/r", replace: true }),
    );
    expect(answer.hauntedShare).toBe(1);
    const after = await readFile(join(folder, name), "utf8");
    expect(after).not.toBe(edited);
    const reread = parseDataFile(after, name);
    if (!reread.ok) throw new Error(reread.error.message);
    expect(
      reread.value.progress.ghosts.every((g) => g.state === "haunted"),
    ).toBe(true);
    expect(await readFile(join(folder, otherName), "utf8")).toBe(otherBefore);
  });

  it("with replace: true overwrites a broken file", async () => {
    const name = dataFileName("o", "r");
    await writeFile(join(folder, name), "{ broken", "utf8");
    const { power } = setup();
    ok(await power.findGhosts({ url: "github.com/o/r", replace: true }));
    const reread = parseDataFile(
      await readFile(join(folder, name), "utf8"),
      name,
    );
    expect(reread.ok).toBe(true);
  });

  it("keeps the session and warns when the save fails", async () => {
    const failing: Store = {
      read: () => Promise.resolve({ kind: "missing" }),
      write: () => Promise.resolve({ ok: false, message: "disk is full" }),
    };
    const { power } = setup([fiveFiles], {}, failing);
    const answer = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(answer.warning).toContain("Your progress will not be saved");
    expect(answer.warning).toContain("disk is full");
    expect(answer.step).toBe("choosing");
  });
});

describe("createPower", () => {
  it("puts guardFetch in front of the injected fetch and uses PLUGIN_DATA", async () => {
    const github = createTestGitHub([fiveFiles]);
    const seen: string[] = [];
    const recorder = ((input: string | URL | Request, init?: RequestInit) => {
      seen.push(input instanceof Request ? input.url : String(input));
      return github.fetch(input, init);
    }) as typeof fetch;
    const power = await createPower(folder, recorder);
    ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(seen.length).toBeGreaterThan(0);
    expect(
      seen.every((u) => new URL(u).origin === "https://api.github.com"),
    ).toBe(true);
    expect(Object.keys(await folderSnapshot())).toEqual([
      dataFileName("o", "r"),
    ]);
  });
});
