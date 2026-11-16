// HauntedPower: all the logic of the Power_Server (design section 4).
// It imports neither the MCP SDK nor node:fs: fetch and the store are
// constructor arguments, so every rule can be tested without Kiro.
import {
  ALLOWED_EVENTS,
  buildInstructions,
  hauntedShare,
} from "@haunted-repo/core";
import type {
  ExorcismEvent,
  ExorcismStep,
  HauntedReport,
  SessionState,
} from "@haunted-repo/core";
import { INTERNAL_MESSAGE, NO_SESSION_MESSAGE } from "./messages.js";
import type { Store } from "./store.js";

/** The answer of a session tool when the call is accepted. */
export interface SessionAnswer {
  ok: true;
  step: ExorcismStep;
  allowedEvents: readonly ExorcismEvent["type"][];
  instructions: string;
  hauntedShare: number;
  message: string;
  warning?: string;
}

/** The answer of any tool when the call is refused or fails. */
export interface ErrorAnswer {
  ok: false;
  code: string;
  message: string;
  step?: ExorcismStep;
  allowedEvents?: readonly ExorcismEvent["type"][];
}

export type Answer = SessionAnswer | ErrorAnswer;

/** The one in-memory session. `invalidCount` is the Invalid_Judgement_Count. */
export interface Session {
  owner: string;
  repo: string;
  report: HauntedReport;
  state: SessionState;
  invalidCount: number;
}

export interface HauntedPowerOptions {
  fetch: typeof fetch;
  store: Store;
  storageOk: boolean;
}

/**
 * Builds the session answer: `instructions` is the text of
 * buildInstructions(state) unchanged, `allowedEvents` is ALLOWED_EVENTS[step].
 */
export function sessionAnswer(
  session: Session,
  message: string,
  warning?: string,
): SessionAnswer {
  const { state } = session;
  const answer: SessionAnswer = {
    ok: true,
    step: state.step,
    allowedEvents: ALLOWED_EVENTS[state.step],
    instructions: buildInstructions(state).text,
    hauntedShare: hauntedShare(session.report, state.progress),
    message,
  };
  if (warning !== undefined) answer.warning = warning;
  return answer;
}

/** Builds an error answer; `step` and `allowedEvents` only when given. */
export function errorAnswer(
  code: string,
  message: string,
  state?: SessionState,
): ErrorAnswer {
  const answer: ErrorAnswer = { ok: false, code, message };
  if (state !== undefined) {
    answer.step = state.step;
    answer.allowedEvents = ALLOWED_EVENTS[state.step];
  }
  return answer;
}

/**
 * Runs async calls one at a time, in the order they arrive. A call that
 * throws or rejects never blocks the next one.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = this.tail.then(fn);
    this.tail = run.catch(() => {});
    return run;
  }
}

export class HauntedPower {
  protected readonly fetch: typeof fetch;
  protected readonly store: Store;
  protected storageOk: boolean;
  protected session: Session | null = null;
  private readonly queue = new SerialQueue();

  constructor(options: HauntedPowerOptions) {
    this.fetch = options.fetch;
    this.store = options.store;
    this.storageOk = options.storageOk;
  }

  /** pick_ghost (task 7.1). For now only the NO_SESSION check. */
  pickGhost(): Promise<Answer> {
    return this.queue.run(() => this.skeleton());
  }

  /** send_event (task 7.2). For now only the NO_SESSION check. */
  sendEvent(): Promise<Answer> {
    return this.queue.run(() => this.skeleton());
  }

  /** judge_answer (task 7.3). For now only the NO_SESSION check. */
  judgeAnswer(): Promise<Answer> {
    return this.queue.run(() => this.skeleton());
  }

  /** house_status (task 5.6). For now only the NO_SESSION check. */
  houseStatus(): Promise<Answer> {
    return this.queue.run(() => this.skeleton());
  }

  // Session tools answer NO_SESSION without a session (Requirement 9.3).
  // No session can exist until find_ghosts arrives (task 5.3), so the other
  // branch is a placeholder that later tasks replace.
  private skeleton(): Answer {
    if (this.session === null) {
      return errorAnswer("NO_SESSION", NO_SESSION_MESSAGE);
    }
    return errorAnswer("INTERNAL", INTERNAL_MESSAGE, this.session.state);
  }
}
