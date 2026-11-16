import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALLOWED_EVENTS, hauntedShare } from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dataFileName, parseDataFile, serialiseDataFile } from "./dataFile.js";
import { houseStatusMessage, NO_SESSION_MESSAGE } from "./messages.js";
import { HauntedPower, type Answer, type HouseStatusAnswer } from "./power.js";
import { createFolderStore } from "./store.js";
import { createTestGitHub, type FakeRepo } from "./testGitHub.testutil.js";

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

const name = dataFileName("o", "r");
let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "haunted-power-status-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

/** A Power on the temporary folder; `seen` records every fetch request. */
function setup() {
  const github = createTestGitHub([fiveFiles]);
  const seen: string[] = [];
  const recorder = ((input: string | URL | Request, init?: RequestInit) => {
    seen.push(input instanceof Request ? input.url : String(input));
    return github.fetch(input, init);
  }) as typeof fetch;
  const power = new HauntedPower({
    fetch: recorder,
    store: createFolderStore(folder),
    storageOk: true,
  });
  return { power, seen };
}

function status(answer: HouseStatusAnswer | Answer): HouseStatusAnswer {
  if (!answer.ok || !("ghosts" in answer)) {
    throw new Error("unexpected answer");
  }
  return answer as HouseStatusAnswer;
}

describe("house_status", () => {
  it("answers NO_SESSION without a session", async () => {
    const { power, seen } = setup();
    expect(await power.houseStatus()).toEqual({
      ok: false,
      code: "NO_SESSION",
      message: NO_SESSION_MESSAGE,
    });
    expect(seen).toEqual([]);
  });

  it("shows every ghost haunted after find_ghosts, with no request", async () => {
    const { power, seen } = setup();
    const found = await power.findGhosts({ url: "github.com/o/r" });
    if (!found.ok) throw new Error(found.code);
    const requests = seen.length;

    const answer = status(await power.houseStatus());
    expect(seen.length).toBe(requests);
    expect(answer.ghosts).toEqual(
      found.ghosts.map((g) => ({
        path: g.path,
        floor: g.floor,
        state: "haunted",
      })),
    );
    expect(answer.hauntedShare).toBe(1);
    expect(answer.message).toBe("5 of 5 ghosts still haunt this house.");
    expect(answer.step).toBe("choosing");
    expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.choosing);
  });

  it("counts an exorcised ghost of a continued house", async () => {
    const first = setup();
    const found = await first.power.findGhosts({ url: "github.com/o/r" });
    if (!found.ok) throw new Error(found.code);
    const saved = parseDataFile(
      await readFile(join(folder, name), "utf8"),
      name,
    );
    if (!saved.ok) throw new Error(saved.error.message);
    const [firstGhost, ...rest] = saved.value.progress.ghosts;
    if (firstGhost === undefined) throw new Error("no ghost");
    const progress = {
      ghosts: [{ ...firstGhost, state: "exorcised" as const }, ...rest],
    };
    await writeFile(
      join(folder, name),
      serialiseDataFile(saved.value.report, progress),
      "utf8",
    );

    const { power } = setup();
    const continued = await power.continueHouse({ url: "github.com/o/r" });
    if (!continued.ok) throw new Error(continued.code);
    const answer = status(await power.houseStatus());
    expect(answer.ghosts[0]).toMatchObject({
      path: firstGhost.path,
      state: "exorcised",
    });
    expect(answer.ghosts.filter((g) => g.state === "haunted")).toHaveLength(4);
    expect(answer.hauntedShare).toBe(
      hauntedShare(saved.value.report, progress),
    );
    expect(answer.hauntedShare).toBe(4 / 5);
    expect(answer.message).toBe("4 of 5 ghosts still haunt this house.");
  });
});

describe("houseStatusMessage", () => {
  it.each<[number, number, string]>([
    [3, 5, "3 of 5 ghosts still haunt this house."],
    [1, 5, "1 of 5 ghosts still haunts this house."],
    [1, 1, "1 of 1 ghost still haunts this house."],
    [0, 5, "No ghost haunts this house any more: all 5 are exorcised."],
  ])("%i of %i", (haunted, total, text) => {
    expect(houseStatusMessage(haunted, total)).toBe(text);
  });
});
