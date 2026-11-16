import {
  ALLOWED_EVENTS,
  advance,
  buildInstructions,
  startSession,
} from "@haunted-repo/core";
import type { SessionState } from "@haunted-repo/core";
import { tinyRecording } from "core-testutil/exorcism/tinySession.testutil.js";
import { describe, expect, it } from "vitest";
import {
  ghostPickedMessage,
  ghostTextUnreadableMessage,
  notPickableMessage,
  pickNotAllowedMessage,
} from "./messages.js";
import {
  coreMessage,
  HauntedPower,
  type Answer,
  type ErrorAnswer,
  type Session,
  type SessionAnswer,
} from "./power.js";
import { createMemoryStore } from "./store.js";
import {
  createTestGitHub,
  type FakeGitHubOptions,
  type FakeRepo,
} from "./testGitHub.testutil.js";

// The tiny report: demo/tiny on ref "main", ghosts src/a.ts, src/b.ts, src/c.ts.
const report = tinyRecording.report;

// CRLF, a tab and non-ASCII text: the Engine must get these bytes unchanged.
const A_TEXT = "export const a = 1;\r\n\t// caf\u00e9 \u{1F47B}\n";

const C_TEXT = "export const c = 3;\n";

const tinyRepo: FakeRepo = {
  owner: "demo",
  repo: "tiny",
  files: {
    "src/a.ts": A_TEXT,
    // src/b.ts is missing on GitHub: reading it gives a 404.
    "src/c.ts": C_TEXT,
  },
};

// The same repository where src/c.ts is not UTF-8 text.
const binaryRepo: FakeRepo = {
  ...tinyRepo,
  files: { ...tinyRepo.files, "src/c.ts": new Uint8Array([0xff, 0xfe, 0x41]) },
};

/** A Power whose in-memory session a test can set and read. */
class TestPower extends HauntedPower {
  setSession(state: SessionState): void {
    this.session = {
      owner: report.overview.owner,
      repo: report.overview.repo,
      report,
      state,
      invalidCount: 2,
    };
  }

  current(): Session | null {
    return this.session;
  }
}

function setup(
  options: FakeGitHubOptions = {},
  wrap: (f: typeof fetch) => typeof fetch = (f) => f,
  repo: FakeRepo = tinyRepo,
) {
  const github = createTestGitHub([repo], options);
  const seen: string[] = [];
  const recorder = ((input: string | URL | Request, init?: RequestInit) => {
    seen.push(input instanceof Request ? input.url : String(input));
    return github.fetch(input, init);
  }) as typeof fetch;
  const power = new TestPower({
    fetch: wrap(recorder),
    store: createMemoryStore(),
    storageOk: true,
  });
  return { power, seen };
}

function choosingState(): SessionState {
  return startSession(report).state;
}

/** Replays the tiny events up to src/b.ts failing (step `failed`). */
function failedState(): SessionState {
  let state = choosingState();
  for (const event of tinyRecording.events.slice(0, 14)) {
    const t = advance(state, event);
    if (!t.ok) throw new Error(t.error.message);
    state = t.state;
  }
  if (state.step !== "failed") throw new Error(`step is ${state.step}`);
  return state;
}

function ok(answer: Answer): SessionAnswer {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

function fail(answer: Answer): ErrorAnswer {
  if (answer.ok) throw new Error("unexpected success");
  return answer;
}

describe("pick_ghost", () => {
  it("reads the ghost text and gives it to the Engine unchanged", async () => {
    const { power, seen } = setup();
    power.setSession(choosingState());

    const answer = ok(await power.pickGhost({ path: "src/a.ts" }));

    const state = power.current()?.state;
    expect(state?.step).toBe("explaining");
    expect(state?.current?.path).toBe("src/a.ts");
    expect(state?.current?.text).toBe(A_TEXT);
    expect(answer.step).toBe("explaining");
    expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.explaining);
    expect(answer.instructions).toBe(buildInstructions(state!).text);
    expect(answer.message).toBe(ghostPickedMessage("src/a.ts"));
    expect(power.current()?.invalidCount).toBe(0);
    // One request, for the file on the report's ref.
    expect(seen).toEqual([
      "https://api.github.com/repos/demo/tiny/contents/src/a.ts?ref=main",
    ]);
  });

  it.each<[string, string, string | null]>([
    [
      "404",
      "src/b.ts",
      'Could not read the file "src/b.ts" from GitHub. Please try again in a moment.',
    ],
    ["not text", "src/c.ts", 'The file "src/c.ts" is not text.'],
  ])(
    "answers GHOST_TEXT_UNREADABLE for %s, state unchanged",
    async (_case, path, problem) => {
      const { power } = setup({}, undefined, binaryRepo);
      const before = choosingState();
      power.setSession(before);

      const answer = fail(await power.pickGhost({ path }));

      expect(answer).toEqual({
        ok: false,
        code: "GHOST_TEXT_UNREADABLE",
        message: ghostTextUnreadableMessage(path, problem),
        step: "choosing",
        allowedEvents: ALLOWED_EVENTS.choosing,
      });
      expect(power.current()?.state).toBe(before);
    },
  );

  it("answers GHOST_TEXT_UNREADABLE when GitHub's rate limit is reached", async () => {
    const { power } = setup({ rateLimitAfter: 0 });
    const before = choosingState();
    power.setSession(before);
    const answer = fail(await power.pickGhost({ path: "src/a.ts" }));
    expect(answer.code).toBe("GHOST_TEXT_UNREADABLE");
    expect(answer.message).toContain("rate limit");
    expect(power.current()?.state).toBe(before);
  });

  it("uses a new client for each read, so the request budget is never reached", async () => {
    const { power, seen } = setup();
    power.setSession(choosingState());
    // 9 failed reads: one client would refuse the 9th (budget of 8).
    for (let i = 0; i < 9; i++) {
      expect(fail(await power.pickGhost({ path: "src/b.ts" })).message).toBe(
        ghostTextUnreadableMessage(
          "src/b.ts",
          'Could not read the file "src/b.ts" from GitHub. Please try again in a moment.',
        ),
      );
    }
    expect(seen).toHaveLength(9);
  });

  it("gives the general text for the plain request budget error", () => {
    // The budget error of the core client is a plain Error with no code.
    expect(
      coreMessage(new Error("GitHub request budget of 8 exceeded")),
    ).toBeNull();
    expect(ghostTextUnreadableMessage("src/a.ts", null)).toContain(
      'Could not read the file "src/a.ts" from GitHub.',
    );
    const coded = Object.assign(new Error("The file is not text."), {
      code: "NOT_TEXT",
    });
    expect(coreMessage(coded)).toBe("The file is not text.");
    expect(coreMessage("boom")).toBeNull();
  });

  it("picks another ghost from the failed step", async () => {
    const { power } = setup();
    const failed = failedState();
    power.setSession(failed);

    // src/a.ts was exorcised by the tiny walk, so it cannot be picked.
    expect(fail(await power.pickGhost({ path: "src/a.ts" })).code).toBe(
      "INVALID_EVENT",
    );
    expect(power.current()?.state).toBe(failed);

    const answer = ok(await power.pickGhost({ path: "src/c.ts" }));
    const state = power.current()?.state;
    expect(answer.step).toBe("explaining");
    expect(state?.current?.path).toBe("src/c.ts");
    expect(state?.current?.text).toBe(C_TEXT);
    // The progress of the walk is kept.
    expect(state?.progress).toEqual(failed.progress);
  });

  it("refuses a step that does not allow pick-ghost, with no request", async () => {
    const { power, seen } = setup();
    power.setSession(choosingState());
    ok(await power.pickGhost({ path: "src/a.ts" }));
    const before = power.current()?.state;

    const answer = fail(await power.pickGhost({ path: "src/a.ts" }));

    expect(answer).toEqual({
      ok: false,
      code: "INVALID_EVENT",
      message: pickNotAllowedMessage("explaining"),
      step: "explaining",
      allowedEvents: ALLOWED_EVENTS.explaining,
    });
    expect(power.current()?.state).toBe(before);
    expect(seen).toHaveLength(1);
  });

  it.each(["src/missing.ts", ""])(
    "refuses %j, which is not a ghost, with no request",
    async (path) => {
      const { power, seen } = setup();
      const before = choosingState();
      power.setSession(before);
      const answer = fail(await power.pickGhost({ path }));
      expect(answer.code).toBe("INVALID_EVENT");
      expect(answer.message).toBe(notPickableMessage(path));
      expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.choosing);
      expect(power.current()?.state).toBe(before);
      expect(seen).toEqual([]);
    },
  );

  it("waits for a slow pick before the next call (queue)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = (f: typeof fetch) =>
      (async (input: string | URL | Request, init?: RequestInit) => {
        await gate;
        return f(input, init);
      }) as typeof fetch;
    const { power } = setup({}, slow);
    power.setSession(choosingState());

    const pick = power.pickGhost({ path: "src/a.ts" });
    const status = power.houseStatus();
    const second = power.pickGhost({ path: "src/a.ts" });
    release();
    const [picked, statusAnswer, secondAnswer] = await Promise.all([
      pick,
      status,
      second,
    ]);

    // The same calls run one after the other.
    const serial = setup();
    serial.power.setSession(choosingState());
    const sPicked = await serial.power.pickGhost({ path: "src/a.ts" });
    const sStatus = await serial.power.houseStatus();
    const sSecond = await serial.power.pickGhost({ path: "src/a.ts" });

    expect(ok(picked).step).toBe("explaining");
    expect(ok(statusAnswer).step).toBe("explaining");
    expect(fail(secondAnswer).code).toBe("INVALID_EVENT");
    expect([picked, statusAnswer, secondAnswer]).toEqual([
      sPicked,
      sStatus,
      sSecond,
    ]);
    expect(power.current()?.state).toEqual(serial.power.current()?.state);
  });

  it("finishes a slow pick before a send_event sent during it (queue)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = (f: typeof fetch) =>
      (async (input: string | URL | Request, init?: RequestInit) => {
        await gate;
        return f(input, init);
      }) as typeof fetch;
    const { power } = setup({}, slow);
    power.setSession(choosingState());
    const explained = { type: "explanation-done", text: "It is one." } as const;

    const pick = power.pickGhost({ path: "src/a.ts" });
    // Sent before the pick resolves: run alone, it would be refused.
    const event = power.sendEvent(explained);
    release();
    const [picked, sent] = await Promise.all([pick, event]);

    // The same two calls run one after the other.
    const serial = setup();
    serial.power.setSession(choosingState());
    const sPicked = await serial.power.pickGhost({ path: "src/a.ts" });
    const sSent = await serial.power.sendEvent(explained);

    expect(ok(picked).step).toBe("explaining");
    expect(ok(sent).step).toBe("asking");
    expect([picked, sent]).toEqual([sPicked, sSent]);
    expect(power.current()?.state).toEqual(serial.power.current()?.state);
    expect(power.current()?.state.current?.explanation).toBe("It is one.");
  });
});
