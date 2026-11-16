import {
  ALLOWED_EVENTS,
  buildInstructions,
  hauntedShare,
  startSession,
} from "@haunted-repo/core";
import { tinyRecording } from "core-testutil/exorcism/tinySession.testutil.js";
import { describe, expect, it } from "vitest";
import { NO_SESSION_MESSAGE } from "./messages.js";
import {
  errorAnswer,
  HauntedPower,
  SerialQueue,
  sessionAnswer,
  type Session,
} from "./power.js";
import type { Store } from "./store.js";

// The skeleton never reads or writes, so this store fails loudly if it does.
const unusedStore: Store = {
  read: () => Promise.reject(new Error("store must not be used")),
  write: () => Promise.reject(new Error("store must not be used")),
};
const unusedFetch = (() =>
  Promise.reject(new Error("fetch must not be used"))) as typeof fetch;

function newPower(): HauntedPower {
  return new HauntedPower({
    fetch: unusedFetch,
    store: unusedStore,
    storageOk: true,
  });
}

function tinySession(): Session {
  const report = tinyRecording.report;
  const { state } = startSession(report);
  return {
    owner: report.overview.owner,
    repo: report.overview.repo,
    report,
    state,
    invalidCount: 0,
  };
}

describe("HauntedPower without a session", () => {
  const calls: [string, (p: HauntedPower) => Promise<unknown>][] = [
    ["pickGhost", (p) => p.pickGhost({ path: "src/a.ts" })],
    ["sendEvent", (p) => p.sendEvent({ type: "leave-ghost" })],
    ["judgeAnswer", (p) => p.judgeAnswer()],
    ["houseStatus", (p) => p.houseStatus()],
  ];

  it.each(calls)("%s answers NO_SESSION", async (_name, call) => {
    expect(await call(newPower())).toEqual({
      ok: false,
      code: "NO_SESSION",
      message: NO_SESSION_MESSAGE,
    });
  });
});

describe("sessionAnswer", () => {
  it("gives the instructions text unchanged and the allowed events", () => {
    const session = tinySession();
    const answer = sessionAnswer(session, "Hello.");
    expect(answer).toEqual({
      ok: true,
      step: "choosing",
      allowedEvents: ALLOWED_EVENTS.choosing,
      instructions: buildInstructions(session.state).text,
      hauntedShare: hauntedShare(session.report, session.state.progress),
      message: "Hello.",
    });
    expect("warning" in answer).toBe(false);
  });

  it("adds the warning only when given", () => {
    expect(sessionAnswer(tinySession(), "Hi.", "Careful.").warning).toBe(
      "Careful.",
    );
  });
});

describe("errorAnswer", () => {
  it("has only ok, code and message without a state", () => {
    expect(errorAnswer("NO_SESSION", "No.")).toEqual({
      ok: false,
      code: "NO_SESSION",
      message: "No.",
    });
  });

  it("adds the step and allowed events of a state", () => {
    const { state } = tinySession();
    expect(errorAnswer("INVALID_EVENT", "No.", state)).toEqual({
      ok: false,
      code: "INVALID_EVENT",
      message: "No.",
      step: "choosing",
      allowedEvents: ALLOWED_EVENTS.choosing,
    });
  });
});

describe("SerialQueue", () => {
  it("runs two calls in order, even when the first one is slower", async () => {
    const queue = new SerialQueue();
    const log: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    const first = queue.run(async () => {
      log.push("first start");
      await gate;
      log.push("first end");
      return 1;
    });
    const second = queue.run(() => {
      log.push("second");
      return 2;
    });

    await Promise.resolve();
    expect(log).toEqual(["first start"]);
    release();
    expect(await Promise.all([first, second])).toEqual([1, 2]);
    expect(log).toEqual(["first start", "first end", "second"]);
  });

  it("still runs the next call after a call that throws", async () => {
    const queue = new SerialQueue();
    const failing = queue.run(() => {
      throw new Error("boom");
    });
    const next = queue.run(() => "answered");
    await expect(failing).rejects.toThrow("boom");
    expect(await next).toBe("answered");
  });

  it("still runs the next call after a call that rejects", async () => {
    const queue = new SerialQueue();
    const failing = queue.run(() => Promise.reject(new Error("late boom")));
    await expect(failing).rejects.toThrow("late boom");
    expect(await queue.run(() => "answered")).toBe("answered");
  });
});
