import {
  ALLOWED_EVENTS,
  advance,
  buildInstructions,
  formatProgress,
  startSession,
} from "@haunted-repo/core";
import type {
  ExorcismEvent,
  ExorcismProgress,
  SessionState,
} from "@haunted-repo/core";
import { tinyRecording } from "core-testutil/exorcism/tinySession.testutil.js";
import { describe, expect, it } from "vitest";
import { dataFileName, parseDataFile } from "./dataFile.js";
import {
  judgeNotAllowedMessage,
  judgementAcceptedMessage,
  saveFailedWarning,
  VERDICT_FAILED_MESSAGE,
  verdictRetryMessage,
} from "./messages.js";
import {
  HauntedPower,
  type ErrorAnswer,
  type JudgeAnswer,
  type Session,
  type SessionAnswer,
  type VerdictErrorAnswer,
} from "./power.js";
import { createMemoryStore, type Store } from "./store.js";
import { ALLOWED_VERDICT_LINES } from "./verdictGate.js";

// The tiny report: demo/tiny on ref "main", ghosts src/a.ts, src/b.ts, src/c.ts.
const report = tinyRecording.report;
const FILE = dataFileName("demo", "tiny");
const MANY_VERDICTS =
  "There is more than one VERDICT line; give one verdict per question.";
const BAD_LAST_LINE =
  "The last line must be exactly one of: VERDICT: right, VERDICT: half-right, VERDICT: wrong, VERDICT: dont-know.";

/** A Power whose in-memory session a test can set and read. */
class TestPower extends HauntedPower {
  /** Sets the session as if its progress had just been saved. */
  setSession(state: SessionState, invalidCount = 0): void {
    this.session = {
      owner: report.overview.owner,
      repo: report.overview.repo,
      report,
      state,
      invalidCount,
    };
    this.savedProgress = formatProgress(state.progress);
  }

  current(): Session {
    if (this.session === null) throw new Error("no session");
    return this.session;
  }

  storageWorks(): boolean {
    return this.storageOk;
  }
}

const noFetch = (() =>
  Promise.reject(new Error("fetch must not be used"))) as typeof fetch;

function setup() {
  const memory = createMemoryStore();
  const writes: string[] = [];
  const store: Store = {
    read: (name) => memory.read(name),
    write: (name, text) => {
      writes.push(name);
      return memory.write(name, text);
    },
  };
  const power = new TestPower({ fetch: noFetch, store, storageOk: true });
  return { power, store, writes };
}

/** Like setup, but the writes fail while `failing` is true. */
function failingSetup() {
  const memory = createMemoryStore();
  let failing = true;
  const writes: string[] = [];
  const store: Store = {
    read: (name) => memory.read(name),
    write: (name, text) => {
      writes.push(name);
      return failing
        ? Promise.resolve({ ok: false, message: "disk is full" })
        : memory.write(name, text);
    },
  };
  const power = new TestPower({ fetch: noFetch, store, storageOk: true });
  return {
    power,
    store,
    writes,
    setFailing(on: boolean) {
      failing = on;
    },
  };
}

/** The state after the first `n` events of the tiny recording. */
function tiny(n: number): SessionState {
  let state = startSession(report).state;
  for (const event of tinyRecording.events.slice(0, n)) {
    const t = advance(state, event as ExorcismEvent);
    if (!t.ok) throw new Error(t.error.message);
    state = t.state;
  }
  return state;
}

async function savedProgress(store: Store): Promise<ExorcismProgress> {
  const read = await store.read(FILE);
  if (read.kind !== "found") throw new Error(`file is ${read.kind}`);
  const content = parseDataFile(read.text, FILE);
  if (!content.ok) throw new Error(content.error.message);
  return content.value.progress;
}

function ok(answer: JudgeAnswer): SessionAnswer {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

function fail(answer: JudgeAnswer): ErrorAnswer {
  if (answer.ok) throw new Error("unexpected success");
  return answer;
}

const Q = "What does this file give to the rest of the project?";

describe("judge_answer: invalid judgements (Requirement 5.10)", () => {
  it.each<[string, string, string]>([
    ["an empty text", "", BAD_LAST_LINE],
    ["only spaces", "   \n  ", BAD_LAST_LINE],
    ["a bold verdict", "Good.\n**VERDICT: right**", BAD_LAST_LINE],
    ["a space before VERDICT:", "Good.\n VERDICT: right", BAD_LAST_LINE],
    ["a full stop", "Good.\nVERDICT: right.", BAD_LAST_LINE],
    ["two VERDICT: lines", "A.\nVERDICT: wrong\nVERDICT: right", MANY_VERDICTS],
  ])("rejects %s with a retry, state unchanged", async (_case, text, why) => {
    const { power, writes } = setup();
    const before = tiny(2); // asking src/a.ts, first question
    power.setSession(before);

    const answer = fail(
      await power.judgeAnswer({ question: Q, judgement: text }),
    );

    expect(answer).toEqual({
      ok: false,
      code: "INVALID_VERDICT",
      message: verdictRetryMessage(why, ALLOWED_VERDICT_LINES, 2),
      step: "asking",
      allowedEvents: ALLOWED_EVENTS.asking,
      retry: true,
      triesLeft: 2,
    });
    expect(power.current().state).toBe(before);
    expect(power.current().invalidCount).toBe(1);
    expect(writes).toEqual([]);
  });

  it.each<[string, string, string]>([
    ["trailing spaces after the verdict", "Good.\nVERDICT: right   ", "right"],
    [
      "an indented VERDICT: line before the last one",
      "A.\n  VERDICT: wrong\nVERDICT: half-right",
      "half-right",
    ],
  ])("accepts %s", async (_case, text, rating) => {
    const { power } = setup();
    power.setSession(tiny(2), 2);

    const answer = ok(
      await power.judgeAnswer({ question: Q, judgement: text }),
    );

    const session = power.current();
    expect(session.state.current?.ratings).toEqual([rating]);
    expect(session.state.asked["src/a.ts"]).toEqual([Q]);
    expect(session.invalidCount).toBe(0);
    expect(answer.step).toBe("asking");
    expect(answer.instructions).toBe(buildInstructions(session.state).text);
    expect(answer.message).toBe(judgementAcceptedMessage("asking"));
  });
});

describe("judge_answer: the strict flow", () => {
  it("refuses outside asking before parsing, count unchanged", async () => {
    const { power } = setup();
    const before = tiny(1); // explaining src/a.ts
    power.setSession(before, 2);

    const answer = fail(
      await power.judgeAnswer({ question: Q, judgement: "VERDICT: right" }),
    );

    expect(answer).toEqual({
      ok: false,
      code: "INVALID_EVENT",
      message: judgeNotAllowedMessage("explaining"),
      step: "explaining",
      allowedEvents: ALLOWED_EVENTS.explaining,
    });
    expect(power.current().state).toBe(before);
    expect(power.current().invalidCount).toBe(2);
  });

  it("gives two retries, then a Verdict_Failure, then counts again", async () => {
    const { power, writes } = setup();
    const before = tiny(2);
    power.setSession(before);
    const judge = () =>
      power.judgeAnswer({ question: Q, judgement: "VERDICT: right." });

    const first = fail(await judge()) as VerdictErrorAnswer;
    expect(first).toMatchObject({ retry: true, triesLeft: 2 });
    expect(first.message).toContain("Tries left: 2.");
    expect(first.message).toContain("do not ask the Student again");
    expect(first.message).toContain(ALLOWED_VERDICT_LINES.join(" | "));

    const second = fail(await judge()) as VerdictErrorAnswer;
    expect(second).toMatchObject({ code: "INVALID_VERDICT", triesLeft: 1 });
    expect(second.message).toContain("Tries left: 1.");
    expect(power.current().invalidCount).toBe(2);

    const third = fail(await judge());
    expect(third).toEqual({
      ok: false,
      code: "VERDICT_FAILED",
      message: VERDICT_FAILED_MESSAGE,
      step: "asking",
      allowedEvents: ALLOWED_EVENTS.asking,
      retry: false,
      instructions: buildInstructions(before).text,
    });
    expect(power.current().invalidCount).toBe(0);
    expect(power.current().state).toBe(before);

    const fourth = fail(await judge());
    expect(fourth).toMatchObject({ code: "INVALID_VERDICT", triesLeft: 2 });
    expect(power.current().state).toBe(before);
    expect(writes).toEqual([]);
  });

  it("first dont-know leads to a simpler explanation of the same question", async () => {
    const { power } = setup();
    power.setSession(tiny(8), 1); // asking src/b.ts, first question
    const question = "What does b hold?";

    const answer = ok(
      await power.judgeAnswer({
        question,
        judgement: "The Student said they do not know.\nVERDICT: dont-know",
      }),
    );

    const session = power.current();
    expect(answer.step).toBe("simplifying");
    expect(answer.message).toBe(judgementAcceptedMessage("simplifying"));
    expect(session.state.current?.pendingQuestion).toBe(question);
    expect(session.state.current?.ratings).toEqual([]);
    expect(session.invalidCount).toBe(0);
  });

  it("second dont-know uses the pendingQuestion and leads to a model answer", async () => {
    const { power } = setup();
    const before = tiny(10); // the same question asked again
    expect(before.current?.pendingQuestion).toBe("What does b hold?");
    power.setSession(before);

    // A blank Tutor question is refused by the Engine, so this passes only
    // because the Power sends the pendingQuestion instead (4.6).
    const answer = ok(
      await power.judgeAnswer({
        question: " ",
        judgement: "VERDICT: dont-know",
      }),
    );

    expect(answer.step).toBe("model-answer");
    expect(answer.message).toBe(judgementAcceptedMessage("model-answer"));
    expect(power.current().state.current?.ratings).toEqual(["wrong"]);
  });

  it("refuses a blank question with INVALID_EVENT, state unchanged", async () => {
    const { power, writes } = setup();
    const before = tiny(2);
    power.setSession(before, 2);

    const answer = fail(
      await power.judgeAnswer({ question: "  ", judgement: "VERDICT: right" }),
    );

    expect(answer).toEqual({
      ok: false,
      code: "INVALID_EVENT",
      message: 'The event "answer-rated" needs a "question" that is not blank.',
      step: "asking",
      allowedEvents: ALLOWED_EVENTS.asking,
    });
    expect(power.current().state).toBe(before);
    expect(power.current().invalidCount).toBe(0);
    expect(writes).toEqual([]);
  });

  it("saves the progress when the third rating exorcises the ghost", async () => {
    const { power, store } = setup();
    power.setSession(tiny(4)); // src/a.ts: two right answers so far

    const answer = ok(
      await power.judgeAnswer({
        question: "Can a change?",
        judgement: "Correct.\nVERDICT: right",
      }),
    );

    const state = power.current().state;
    expect(answer.step).toBe("self-check");
    expect(state.progress.ghosts[0]).toMatchObject({
      path: "src/a.ts",
      state: "exorcised",
    });
    expect(await savedProgress(store)).toEqual(state.progress);
  });
});

describe("judge_answer: a save that fails (Requirements 7.3, 7.6)", () => {
  it("warns once, keeps the session, and saves again with the next accepted judgement", async () => {
    const { power, store, writes, setFailing } = failingSetup();
    power.setSession(tiny(13)); // src/b.ts, third question, two wrong so far

    // The save fails: one warning, the session goes on in memory.
    const failed = ok(
      await power.judgeAnswer({
        question: "Can b be changed?",
        judgement: "Not quite.\nVERDICT: wrong",
      }),
    );
    expect(failed.step).toBe("failed");
    expect(failed.warning).toBe(saveFailedWarning("disk is full"));
    expect(power.storageWorks()).toBe(false);
    expect(writes).toEqual([FILE]);
    expect((await store.read(FILE)).kind).toBe("missing");

    // Still failing: the next accepted events try the save again, with no
    // new warning.
    expect(ok(await power.sendEvent({ type: "retry-ghost" })).warning).toBe(
      undefined,
    );
    const asking = ok(
      await power.sendEvent({ type: "explanation-done", text: "A new way." }),
    );
    expect(asking.step).toBe("asking");
    expect(asking.warning).toBeUndefined();
    expect(power.storageWorks()).toBe(false);
    expect(writes).toEqual([FILE, FILE, FILE]);

    // The store works again: the next accepted judgement saves the progress.
    setFailing(false);
    const recovered = ok(
      await power.judgeAnswer({ question: Q, judgement: "VERDICT: right" }),
    );
    expect(recovered.step).toBe("asking");
    expect(recovered.warning).toBeUndefined();
    expect(power.storageWorks()).toBe(true);
    expect(writes).toEqual([FILE, FILE, FILE, FILE]);
    expect(await savedProgress(store)).toEqual(power.current().state.progress);
  });
});
