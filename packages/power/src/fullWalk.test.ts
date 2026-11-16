import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatProgress } from "@haunted-repo/core";
import type { ExorcismProgress } from "@haunted-repo/core";
import { tinyRecording } from "core-testutil/exorcism/tinySession.testutil.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dataFileName, parseDataFile } from "./dataFile.js";
import { NO_SESSION_MESSAGE } from "./messages.js";
import {
  HauntedPower,
  type Answer,
  type Session,
  type SessionAnswer,
} from "./power.js";
import { createFolderStore } from "./store.js";
import { createTestGitHub, type FakeRepo } from "./testGitHub.testutil.js";

// The tiny report: demo/tiny on ref "main", ghosts src/a.ts, src/b.ts, src/c.ts.
const tinyPaths = tinyRecording.report.ghosts.map((g) => g.path);
const REPO_URL = "https://github.com/demo/tiny";
const FILE = dataFileName("demo", "tiny");

// The texts of the tiny recording; more lines make each ghost a bit harder,
// so the detected order is the order of the tiny report.
const tinyRepo: FakeRepo = {
  owner: "demo",
  repo: "tiny",
  files: {
    "src/a.ts": "export const a = 1;\n",
    "src/b.ts": 'import { a } from "./a";\nexport const b = a + 1;\n',
    "src/c.ts":
      'import { a } from "./a";\nimport { b } from "./b";\nexport const c = a + b;\nexport const d = c;\n',
  },
};

/** A Power whose in-memory session a test can read. */
class TestPower extends HauntedPower {
  current(): Session {
    if (this.session === null) throw new Error("no session");
    return this.session;
  }
}

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "haunted-power-walk-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

/** A new Power on the temporary folder, as after a start of the server. */
function newPower(): TestPower {
  const github = createTestGitHub([tinyRepo]);
  return new TestPower({
    fetch: github.fetch,
    store: createFolderStore(folder),
    storageOk: true,
  });
}

function ok(answer: Answer): SessionAnswer {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

async function fileText(): Promise<string> {
  return readFile(join(folder, FILE), "utf8");
}

async function savedProgress(): Promise<ExorcismProgress> {
  const content = parseDataFile(await fileText(), FILE);
  if (!content.ok) throw new Error(content.error.message);
  return content.value.progress;
}

function stateOf(progress: ExorcismProgress, path: string): string {
  return progress.ghosts.find((g) => g.path === path)?.state ?? "missing";
}

/**
 * Runs one tool call and checks the saved file: it is rewritten exactly
 * when the progress of the session changed (7.3), and it always holds the
 * progress of the session.
 */
async function step(
  power: TestPower,
  call: () => Promise<Answer>,
): Promise<SessionAnswer> {
  const progressBefore = formatProgress(power.current().state.progress);
  const textBefore = await fileText();
  const answer = ok(await call());
  const progressAfter = formatProgress(power.current().state.progress);
  if (progressAfter === progressBefore) {
    expect(await fileText()).toBe(textBefore);
  } else {
    expect(await fileText()).not.toBe(textBefore);
  }
  expect(await savedProgress()).toEqual(power.current().state.progress);
  return answer;
}

/** find_ghosts, then src/a.ts exorcised with three right answers. */
async function exorciseA(power: TestPower): Promise<void> {
  const found = await power.findGhosts({ url: REPO_URL });
  if (!found.ok) throw new Error(`unexpected ${found.code}`);
  expect(found.ghosts.map((g) => g.path)).toEqual(tinyPaths);
  expect(found.suggested).toBe("src/a.ts");
  expect(found.hauntedShare).toBe(1);
  const first = await savedProgress();
  expect(first).toEqual(power.current().state.progress);
  for (const path of tinyPaths) expect(stateOf(first, path)).toBe("haunted");

  expect(
    (await step(power, () => power.pickGhost({ path: "src/a.ts" }))).step,
  ).toBe("explaining");
  expect(
    (
      await step(power, () =>
        power.sendEvent({
          type: "explanation-done",
          text: "This file stores the number one.",
        }),
      )
    ).step,
  ).toBe("asking");
  const questions = [
    "What does this file give to the rest of the project?",
    "What is a?",
    "Can a change?",
  ];
  for (const [i, question] of questions.entries()) {
    const answer = await step(power, () =>
      power.judgeAnswer({ question, judgement: "Correct.\nVERDICT: right" }),
    );
    expect(answer.step).toBe(i < 2 ? "asking" : "self-check");
    const expected = i < 2 ? "haunted" : "exorcised";
    expect(stateOf(await savedProgress(), "src/a.ts")).toBe(expected);
  }
  const done = await step(power, () =>
    power.sendEvent({ type: "self-check-answered", answer: "yes" }),
  );
  expect(done.step).toBe("choosing");
  expect(done.hauntedShare).toBe(2 / 3);
}

describe("a full exorcism walk (Requirements 4.1, 7.3)", () => {
  it("exorcises src/a.ts and saves the progress after each change", async () => {
    const power = newPower();
    await exorciseA(power);

    const saved = await savedProgress();
    expect(stateOf(saved, "src/a.ts")).toBe("exorcised");
    expect(stateOf(saved, "src/b.ts")).toBe("haunted");
    expect(stateOf(saved, "src/c.ts")).toBe("haunted");
    const status = await power.houseStatus();
    if (!status.ok) throw new Error(`unexpected ${status.code}`);
    expect(status.ghosts.map((g) => [g.path, g.state])).toEqual([
      ["src/a.ts", "exorcised"],
      ["src/b.ts", "haunted"],
      ["src/c.ts", "haunted"],
    ]);
  });
});

describe("a restart (Requirements 7.9, 9.1, 9.2)", () => {
  it("keeps exorcised ghosts and drops the unfinished attempt", async () => {
    const first = newPower();
    await exorciseA(first);
    // An unfinished attempt on src/b.ts: one right answer, then the stop.
    await step(first, () => first.pickGhost({ path: "src/b.ts" }));
    await step(first, () =>
      first.sendEvent({
        type: "explanation-done",
        text: "This file adds one to a.",
      }),
    );
    await step(first, () =>
      first.judgeAnswer({
        question: "What does b hold?",
        judgement: "Correct.\nVERDICT: right",
      }),
    );
    expect(first.current().state.step).toBe("asking");
    const beforeStop = await fileText();

    // The server starts again: a new Power on the same folder.
    const second = newPower();
    expect(await second.pickGhost({ path: "src/b.ts" })).toEqual({
      ok: false,
      code: "NO_SESSION",
      message: NO_SESSION_MESSAGE,
    });
    expect(await fileText()).toBe(beforeStop);

    const continued = ok(await second.continueHouse({ url: REPO_URL }));
    expect(continued.step).toBe("choosing");
    expect(continued.hauntedShare).toBe(2 / 3);
    expect(second.current().state.current).toBeNull();
    expect(await fileText()).toBe(beforeStop);

    const status = await second.houseStatus();
    if (!status.ok) throw new Error(`unexpected ${status.code}`);
    expect(status.ghosts.map((g) => [g.path, g.state])).toEqual([
      ["src/a.ts", "exorcised"],
      ["src/b.ts", "haunted"],
      ["src/c.ts", "haunted"],
    ]);

    // src/b.ts starts again from the explanation, with no rating kept.
    const picked = ok(await second.pickGhost({ path: "src/b.ts" }));
    expect(picked.step).toBe("explaining");
    expect(second.current().state.current?.ratings).toEqual([]);
    expect(await fileText()).toBe(beforeStop);
  });
});
