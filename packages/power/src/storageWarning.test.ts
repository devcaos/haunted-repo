import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPower } from "./createPower.js";
import {
  MEMORY_MODE_WARNING,
  PARTIAL_WARNING,
  saveFailedWarning,
} from "./messages.js";
import { HauntedPower, type ErrorAnswer, type SessionAnswer } from "./power.js";
import { createMemoryStore, type Store } from "./store.js";
import { createTestGitHub, type FakeRepo } from "./testGitHub.testutil.js";

// Task 5.7: the PLUGIN_DATA memory fallback and the warning-once rule
// (Requirements 7.6, 7.10; design section 6).

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

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "haunted-power-storage-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

function ok<T extends SessionAnswer>(answer: T | ErrorAnswer): T {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

/** A memory store whose writes fail while `failing` is true. */
function switchableStore(): { store: Store; setFailing(on: boolean): void } {
  const inner = createMemoryStore();
  let failing = false;
  return {
    store: {
      read: (name) => inner.read(name),
      write: (name, text) =>
        failing
          ? Promise.resolve({ ok: false, message: "disk is full" })
          : inner.write(name, text),
    },
    setFailing(on) {
      failing = on;
    },
  };
}

describe("memory mode at start-up", () => {
  it("without PLUGIN_DATA, warns on the first answer only and writes no file", async () => {
    const github = createTestGitHub([fiveFiles]);
    const power = await createPower(undefined, github.fetch);

    const first = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(first.warning).toBe(MEMORY_MODE_WARNING);
    expect(first.warning).toMatch(/^Your progress will not be saved: /);
    expect(first.step).toBe("choosing");

    // The state does not change: no new warning.
    expect(ok(await power.houseStatus()).warning).toBeUndefined();
    expect(
      ok(await power.findGhosts({ url: "github.com/o/r", replace: true }))
        .warning,
    ).toBeUndefined();
    expect(await readdir(folder)).toEqual([]);
  });

  it("with PLUGIN_DATA pointing to a file, warns once and leaves the file", async () => {
    const file = join(folder, "not-a-folder");
    await writeFile(file, "content", "utf8");
    const github = createTestGitHub([fiveFiles]);
    const power = await createPower(file, github.fetch);

    const first = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(first.warning).toBe(MEMORY_MODE_WARNING);
    expect(ok(await power.houseStatus()).warning).toBeUndefined();
    expect(await readdir(folder)).toEqual(["not-a-folder"]);
  });

  it("gives the warning with the first accepted answer, not an error", async () => {
    const github = createTestGitHub([fiveFiles]);
    const power = await createPower(undefined, github.fetch);
    expect(await power.houseStatus()).toMatchObject({ code: "NO_SESSION" });
    const first = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(first.warning).toBe(MEMORY_MODE_WARNING);
  });

  it("continue_house works within one run in memory mode", async () => {
    const github = createTestGitHub([fiveFiles]);
    const power = await createPower(undefined, github.fetch);
    ok(await power.findGhosts({ url: "github.com/o/r" }));
    const requests = github.fake.requestCount;

    const continued = ok(await power.continueHouse({ url: "github.com/o/r" }));
    expect(continued.step).toBe("choosing");
    expect(continued.hauntedShare).toBe(1);
    expect(continued.warning).toBeUndefined();
    expect(github.fake.requestCount).toBe(requests);
  });

  it("keeps both texts when the list is partial: partial first", async () => {
    // Requests: repo, tree, first file; the second file is rate limited.
    const github = createTestGitHub([fiveFiles], { rateLimitAfter: 3 });
    const power = await createPower(undefined, github.fetch);
    const answer = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(answer.warning).toBe(`${PARTIAL_WARNING} ${MEMORY_MODE_WARNING}`);
  });
});

describe("a save that fails after start-up", () => {
  function setup() {
    const github = createTestGitHub([fiveFiles]);
    const switchable = switchableStore();
    const power = new HauntedPower({
      fetch: github.fetch,
      store: switchable.store,
      storageOk: true,
    });
    return { power, ...switchable };
  }

  it("warns once, keeps the session, and warns again after a save that works", async () => {
    const { power, setFailing } = setup();

    // Storage works: no warning.
    const saved = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(saved.warning).toBeUndefined();

    // The first failing save warns; the session is kept in memory.
    setFailing(true);
    const failed = ok(
      await power.findGhosts({ url: "github.com/o/r", replace: true }),
    );
    expect(failed.warning).toBe(saveFailedWarning("disk is full"));
    expect(failed.step).toBe("choosing");
    expect(ok(await power.houseStatus()).ghosts).toHaveLength(5);

    // More failing saves, no new warning.
    const again = ok(
      await power.findGhosts({ url: "github.com/o/r", replace: true }),
    );
    expect(again.warning).toBeUndefined();

    // A save that works clears the state, without a warning.
    setFailing(false);
    const recovered = ok(
      await power.findGhosts({ url: "github.com/o/r", replace: true }),
    );
    expect(recovered.warning).toBeUndefined();

    // So the next failure is told again.
    setFailing(true);
    const failedAgain = ok(
      await power.findGhosts({ url: "github.com/o/r", replace: true }),
    );
    expect(failedAgain.warning).toBe(saveFailedWarning("disk is full"));
  });

  it("keeps both texts when the list is partial and the save fails", async () => {
    const github = createTestGitHub([fiveFiles], { rateLimitAfter: 3 });
    const switchable = switchableStore();
    switchable.setFailing(true);
    const power = new HauntedPower({
      fetch: github.fetch,
      store: switchable.store,
      storageOk: true,
    });
    const answer = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(answer.warning).toBe(
      `${PARTIAL_WARNING} ${saveFailedWarning("disk is full")}`,
    );
  });
});
