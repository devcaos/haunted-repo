import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ALLOWED_EVENTS,
  buildInstructions,
  hauntedShare,
  startSession,
} from "@haunted-repo/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dataFileName, parseDataFile, serialiseDataFile } from "./dataFile.js";
import { noDataMessage } from "./messages.js";
import {
  HauntedPower,
  type Answer,
  type ErrorAnswer,
  type SessionAnswer,
} from "./power.js";
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

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "haunted-power-continue-"));
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

function ok(answer: Answer): SessionAnswer {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

function fail(answer: Answer): ErrorAnswer {
  if (answer.ok) throw new Error("unexpected success");
  return answer;
}

const name = dataFileName("o", "r");

/** Saves a house of o/r with its first ghost exorcised; returns the text. */
async function saveHouseWithOneExorcised(): Promise<string> {
  const first = setup();
  ok(await first.power.findGhosts({ url: "github.com/o/r" }));
  const saved = parseDataFile(await readFile(join(folder, name), "utf8"), name);
  if (!saved.ok) throw new Error(saved.error.message);
  const [firstGhost, ...rest] = saved.value.progress.ghosts;
  if (firstGhost === undefined) throw new Error("no ghost");
  const text = serialiseDataFile(saved.value.report, {
    ghosts: [{ ...firstGhost, state: "exorcised" }, ...rest],
  });
  await writeFile(join(folder, name), text, "utf8");
  return text;
}

describe("continue_house", () => {
  it("keeps exorcised ghosts exorcised, with no request and no file change", async () => {
    const text = await saveHouseWithOneExorcised();
    const saved = parseDataFile(text, name);
    if (!saved.ok) throw new Error(saved.error.message);
    const { report, progress } = saved.value;

    const { power, seen } = setup();
    const answer = ok(
      await power.continueHouse({ url: "https://github.com/O/R" }),
    );

    const { state } = startSession(report, {
      progress,
      profile: { knowsJava: false },
    });
    expect(answer.step).toBe("choosing");
    expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.choosing);
    expect(answer.instructions).toBe(buildInstructions(state).text);
    expect(answer.hauntedShare).toBe(hauntedShare(report, progress));
    expect(answer.hauntedShare).toBe(4 / 5);
    expect(answer.message).toContain("o/r");
    expect(seen).toEqual([]);
    expect(await readFile(join(folder, name), "utf8")).toBe(text);
  });

  it("uses knowsJava when given", async () => {
    const text = await saveHouseWithOneExorcised();
    const saved = parseDataFile(text, name);
    if (!saved.ok) throw new Error(saved.error.message);
    const { power } = setup();
    const answer = ok(
      await power.continueHouse({ url: "github.com/o/r", knowsJava: true }),
    );
    const { state } = startSession(saved.value.report, {
      progress: saved.value.progress,
      profile: { knowsJava: true },
    });
    expect(answer.instructions).toBe(buildInstructions(state).text);
  });

  it("replaces the session in memory with the saved one", async () => {
    const { power } = setup();
    const fresh = ok(await power.findGhosts({ url: "github.com/o/r" }));
    expect(fresh.hauntedShare).toBe(1);
    // The saved file changes behind the session (one ghost exorcised).
    const saved = parseDataFile(
      await readFile(join(folder, name), "utf8"),
      name,
    );
    if (!saved.ok) throw new Error(saved.error.message);
    const [firstGhost, ...rest] = saved.value.progress.ghosts;
    if (firstGhost === undefined) throw new Error("no ghost");
    await writeFile(
      join(folder, name),
      serialiseDataFile(saved.value.report, {
        ghosts: [{ ...firstGhost, state: "exorcised" }, ...rest],
      }),
      "utf8",
    );
    const continued = ok(await power.continueHouse({ url: "github.com/o/r" }));
    expect(continued.hauntedShare).toBe(4 / 5);
  });

  it("answers NO_DATA when there is no saved file, with no request", async () => {
    const { power, seen } = setup();
    const answer = fail(await power.continueHouse({ url: "github.com/o/r" }));
    expect(answer).toEqual({
      ok: false,
      code: "NO_DATA",
      message: noDataMessage(name),
    });
    expect(answer.message).toContain("find_ghosts");
    expect(seen).toEqual([]);
    expect(await readdir(folder)).toEqual([]);
    // No session was started.
    expect(await power.houseStatus()).toMatchObject({ code: "NO_SESSION" });
  });

  it("refuses an invalid URL", async () => {
    const { power, seen } = setup();
    const answer = fail(await power.continueHouse({ url: "not a url" }));
    expect(answer.code).toBe("INVALID_URL");
    expect(seen).toEqual([]);
  });

  it.each<[string, string]>([
    ["INVALID_REPORT", "{ not json"],
    ["INVALID_REPORT", '{"format":2,"report":{},"progress":{"ghosts":[]}}'],
    ["INVALID_PROGRESS", "progress"],
  ])(
    "refuses a broken file with %s and leaves it unchanged",
    async (code, text) => {
      let content = text;
      if (text === "progress") {
        // A valid report with a broken progress.
        const saved = JSON.parse(await saveHouseWithOneExorcised()) as Record<
          string,
          unknown
        >;
        content = JSON.stringify({ ...saved, progress: { ghosts: 3 } });
      }
      await writeFile(join(folder, name), content, "utf8");

      const { power, seen } = setup();
      const answer = fail(await power.continueHouse({ url: "github.com/o/r" }));
      expect(answer.code).toBe(code);
      expect(answer.message).toContain(name);
      expect(answer.message).toContain("replace: true");
      expect(seen).toEqual([]);
      expect(await readFile(join(folder, name), "utf8")).toBe(content);
      expect(await power.houseStatus()).toMatchObject({ code: "NO_SESSION" });
    },
  );
});
