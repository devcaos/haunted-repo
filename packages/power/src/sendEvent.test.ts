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
  eventAcceptedMessage,
  GHOST_FAILED_MESSAGE,
  HOUSE_CLEAN_MESSAGE,
  saveFailedWarning,
  sendEventTypeMessage,
} from "./messages.js";
import {
  HauntedPower,
  type Answer,
  type ErrorAnswer,
  type SendEventInput,
  type Session,
  type SessionAnswer,
} from "./power.js";
import { createMemoryStore, type Store } from "./store.js";

// The tiny report: demo/tiny on ref "main", ghosts src/a.ts, src/b.ts, src/c.ts.
const report = tinyRecording.report;
const FILE = dataFileName("demo", "tiny");

/** A Power whose in-memory session a test can set and read. */
class TestPower extends HauntedPower {
  /** Sets the session as if its progress had just been saved. */
  setSession(state: SessionState): void {
    this.session = {
      owner: report.overview.owner,
      repo: report.overview.repo,
      report,
      state,
      invalidCount: 2,
    };
    this.savedProgress = formatProgress(state.progress);
  }

  current(): Session | null {
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

/** Runs events through the Engine from a start state. */
function walk(
  events: readonly ExorcismEvent[],
  progress?: ExorcismProgress,
): SessionState {
  let state = startSession(
    report,
    progress === undefined ? {} : { progress },
  ).state;
  for (const event of events) {
    const t = advance(state, event);
    if (!t.ok) throw new Error(t.error.message);
    state = t.state;
  }
  return state;
}

/** The first `n` events of the tiny recording. */
function tiny(n: number): SessionState {
  return walk(tinyRecording.events.slice(0, n) as ExorcismEvent[]);
}

async function savedProgress(store: Store): Promise<ExorcismProgress> {
  const read = await store.read(FILE);
  if (read.kind !== "found") throw new Error(`file is ${read.kind}`);
  const content = parseDataFile(read.text, FILE);
  if (!content.ok) throw new Error(content.error.message);
  return content.value.progress;
}

function ok(answer: Answer): SessionAnswer {
  if (!answer.ok) throw new Error(`unexpected ${answer.code}`);
  return answer;
}

function fail(answer: Answer): ErrorAnswer {
  if (answer.ok) throw new Error("unexpected success");
  return answer;
}

describe("send_event", () => {
  it("explanation-done keeps the text and goes to asking, with no save", async () => {
    const { power, writes } = setup();
    power.setSession(tiny(1)); // explaining src/a.ts

    const answer = ok(
      await power.sendEvent({ type: "explanation-done", text: "It is one." }),
    );

    const session = power.current()!;
    expect(session.state.step).toBe("asking");
    expect(session.state.current?.explanation).toBe("It is one.");
    expect(session.invalidCount).toBe(0);
    expect(answer.step).toBe("asking");
    expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.asking);
    expect(answer.instructions).toBe(buildInstructions(session.state).text);
    expect(answer.message).toBe(eventAcceptedMessage("asking"));
    expect(writes).toEqual([]);
  });

  it("self-check-answered saves the progress before answering", async () => {
    const { power, store } = setup();
    power.setSession(tiny(5)); // self-check of src/a.ts

    const answer = ok(
      await power.sendEvent({ type: "self-check-answered", answer: "half" }),
    );

    const state = power.current()!.state;
    expect(answer.step).toBe("choosing");
    expect(state.progress.ghosts[0]).toMatchObject({
      path: "src/a.ts",
      state: "exorcised",
      selfCheck: "half",
    });
    expect(await savedProgress(store)).toEqual(state.progress);
  });

  it("retry-ghost starts the same ghost again, with no save", async () => {
    const { power, writes } = setup();
    power.setSession(tiny(14)); // src/b.ts failed

    const answer = ok(await power.sendEvent({ type: "retry-ghost" }));

    expect(answer.step).toBe("explaining");
    expect(power.current()!.state.current?.path).toBe("src/b.ts");
    expect(answer.message).toBe(eventAcceptedMessage("explaining"));
    expect(writes).toEqual([]);
  });

  it("leave-ghost goes back to choosing", async () => {
    const { power } = setup();
    power.setSession(tiny(2)); // asking src/a.ts

    const answer = ok(await power.sendEvent({ type: "leave-ghost" }));

    expect(answer.step).toBe("choosing");
    expect(answer.allowedEvents).toEqual(ALLOWED_EVENTS.choosing);
    expect(power.current()!.state.current).toBeNull();
  });

  it.each<[string, SendEventInput, number, string]>([
    [
      "an event the step does not allow",
      { type: "retry-ghost" },
      1,
      "The event retry-ghost is not accepted in the step explaining.",
    ],
    [
      "a blank explanation",
      { type: "explanation-done", text: "  " },
      1,
      'The event "explanation-done" needs a "text" that is not blank.',
    ],
    [
      "a self-check with no answer",
      { type: "self-check-answered" },
      5,
      'The event "self-check-answered" needs an "answer" of yes, half or no.',
    ],
    [
      "a rating, which only judge_answer sends",
      { type: "answer-rated" } as unknown as SendEventInput,
      2,
      sendEventTypeMessage("answer-rated"),
    ],
  ])(
    "refuses %s with INVALID_EVENT, state unchanged",
    async (_case, input, events, message) => {
      const { power, writes } = setup();
      const before = tiny(events);
      power.setSession(before);

      const answer = fail(await power.sendEvent(input));

      expect(answer).toEqual({
        ok: false,
        code: "INVALID_EVENT",
        message,
        step: before.step,
        allowedEvents: ALLOWED_EVENTS[before.step],
      });
      expect(power.current()!.state).toBe(before);
      // A refused event does not reset the Invalid_Judgement_Count.
      expect(power.current()!.invalidCount).toBe(2);
      expect(writes).toEqual([]);
    },
  );

  it("returns the two options of failed and saves the haunted ghost", async () => {
    const { power, store } = setup();
    // src/b.ts: two wrong answers, then "I don't know" twice on question 3.
    const q3 = "Can b be changed?";
    power.setSession(
      walk([
        { type: "pick-ghost", path: "src/b.ts", text: "export const b = 2;" },
        { type: "explanation-done", text: "It holds two." },
        { type: "answer-rated", rating: "wrong", question: "What is b?" },
        { type: "answer-rated", rating: "wrong", question: "Who uses b?" },
        { type: "dont-know", question: q3 },
        { type: "explanation-done", text: "b is a box." },
        { type: "dont-know", question: q3 },
      ]),
    );
    expect(power.current()!.state.step).toBe("model-answer");

    const answer = ok(
      await power.sendEvent({ type: "explanation-done", text: "Yes, it can." }),
    );

    expect(answer.step).toBe("failed");
    expect(answer.allowedEvents).toEqual(["retry-ghost", "pick-ghost"]);
    expect(answer.message).toBe(GHOST_FAILED_MESSAGE);
    const progress = await savedProgress(store);
    expect(progress.ghosts[1]).toEqual({
      path: "src/b.ts",
      state: "haunted",
      ratings: ["wrong", "wrong", "wrong"],
      selfCheck: null,
    });
    expect(progress).toEqual(power.current()!.state.progress);
  });

  it("gives the house-clean message and a haunted share of 0", async () => {
    const { power, store } = setup();
    const done = (path: string) => ({
      path,
      state: "exorcised" as const,
      ratings: ["right" as const, "right" as const, "right" as const],
      selfCheck: "yes" as const,
    });
    power.setSession(
      walk(
        [
          { type: "pick-ghost", path: "src/c.ts", text: "export const c = 3;" },
          { type: "explanation-done", text: "It holds three." },
          { type: "answer-rated", rating: "right", question: "What is c?" },
          { type: "answer-rated", rating: "right", question: "Who uses c?" },
          { type: "answer-rated", rating: "right", question: "Can c change?" },
        ],
        { ghosts: [done("src/a.ts"), done("src/b.ts")] },
      ),
    );
    expect(power.current()!.state.step).toBe("self-check");

    const answer = ok(
      await power.sendEvent({ type: "self-check-answered", answer: "yes" }),
    );

    expect(answer.step).toBe("house-clean");
    expect(answer.allowedEvents).toEqual([]);
    expect(answer.hauntedShare).toBe(0);
    expect(answer.message).toBe(HOUSE_CLEAN_MESSAGE);
    expect(await savedProgress(store)).toEqual(power.current()!.state.progress);
  });
});

describe("send_event: a save that fails (Requirements 7.3, 7.6)", () => {
  it("warns once, keeps the session, and saves again with the next accepted event", async () => {
    const { power, store, writes, setFailing } = failingSetup();
    // src/b.ts in model-answer: the next explanation-done fails the ghost.
    const q3 = "Can b be changed?";
    power.setSession(
      walk([
        { type: "pick-ghost", path: "src/b.ts", text: "export const b = 2;" },
        { type: "explanation-done", text: "It holds two." },
        { type: "answer-rated", rating: "wrong", question: "What is b?" },
        { type: "answer-rated", rating: "wrong", question: "Who uses b?" },
        { type: "dont-know", question: q3 },
        { type: "explanation-done", text: "b is a box." },
        { type: "dont-know", question: q3 },
      ]),
    );

    // The save fails: one warning, the session goes on in memory.
    const failed = ok(
      await power.sendEvent({ type: "explanation-done", text: "Yes, it can." }),
    );
    expect(failed.step).toBe("failed");
    expect(failed.warning).toBe(saveFailedWarning("disk is full"));
    expect(power.current()!.state.progress.ghosts[1]?.ratings).toEqual([
      "wrong",
      "wrong",
      "wrong",
    ]);
    expect(power.storageWorks()).toBe(false);
    expect(writes).toEqual([FILE]);
    expect((await store.read(FILE)).kind).toBe("missing");

    // Still failing: the save is tried again, but no new warning.
    const again = ok(await power.sendEvent({ type: "retry-ghost" }));
    expect(again.step).toBe("explaining");
    expect(again.warning).toBeUndefined();
    expect(power.storageWorks()).toBe(false);
    expect(writes).toEqual([FILE, FILE]);
    expect((await store.read(FILE)).kind).toBe("missing");

    // The store works again: the next accepted event saves the progress.
    setFailing(false);
    const recovered = ok(
      await power.sendEvent({ type: "explanation-done", text: "A new way." }),
    );
    expect(recovered.step).toBe("asking");
    expect(recovered.warning).toBeUndefined();
    expect(power.storageWorks()).toBe(true);
    expect(writes).toEqual([FILE, FILE, FILE]);
    expect(await savedProgress(store)).toEqual(power.current()!.state.progress);
  });
});
