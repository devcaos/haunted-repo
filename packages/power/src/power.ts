// HauntedPower: all the logic of the Power_Server (design section 4).
// It imports neither the MCP SDK nor node:fs: fetch and the store are
// constructor arguments, so every rule can be tested without Kiro.
import {
  ALLOWED_EVENTS,
  advance,
  buildInstructions,
  createGitHubClient,
  detectGhosts,
  formatProgress,
  hauntedShare,
  isPickable,
  parseEvent,
  parseRepoUrl,
  startSession,
  suggestGhost,
} from "@haunted-repo/core";
import type {
  ExorcismEvent,
  ExorcismProgress,
  ExorcismStep,
  Floor,
  HauntedReport,
  SessionState,
} from "@haunted-repo/core";
import { dataFileName, parseDataFile, serialiseDataFile } from "./dataFile.js";
import {
  brokenDataMessage,
  dataExistsMessage,
  eventAcceptedMessage,
  ghostPickedMessage,
  ghostsFoundMessage,
  ghostTextUnreadableMessage,
  houseContinuedMessage,
  houseStatusMessage,
  judgeNotAllowedMessage,
  judgementAcceptedMessage,
  MEMORY_MODE_WARNING,
  noDataMessage,
  NO_SESSION_MESSAGE,
  notPickableMessage,
  pickNotAllowedMessage,
  PARTIAL_WARNING,
  REPO_NOT_FOUND_MESSAGE,
  saveFailedWarning,
  sendEventTypeMessage,
  VERDICT_FAILED_MESSAGE,
  verdictRetryMessage,
} from "./messages.js";
import type { Store } from "./store.js";
import {
  ALLOWED_VERDICT_LINES,
  gateJudgement,
  questionFor,
  verdictEvent,
} from "./verdictGate.js";

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

/** One ghost as find_ghosts shows it (Requirement 2.1). */
export interface GhostSummary {
  path: string;
  floor: Floor;
  difficultyScore: number;
  reason: string;
}

/** The answer of find_ghosts when it succeeds. */
export interface FindGhostsAnswer extends SessionAnswer {
  ghosts: GhostSummary[];
  suggested: string | null;
}

/** One ghost as house_status shows it (Requirement 10.1). */
export interface GhostStatus {
  path: string;
  floor: Floor;
  state: "haunted" | "exorcised";
}

/** The answer of house_status when there is a session. */
export interface HouseStatusAnswer extends SessionAnswer {
  ghosts: GhostStatus[];
}

export interface FindGhostsInput {
  url: string;
  knowsJava?: boolean;
  replace?: boolean;
}

export interface PickGhostInput {
  path: string;
}

/** The only event types send_event sends (design section 4). */
export const SEND_EVENT_TYPES = [
  "explanation-done",
  "self-check-answered",
  "retry-ghost",
  "leave-ghost",
] as const;

export interface SendEventInput {
  type: (typeof SEND_EVENT_TYPES)[number];
  text?: string;
  answer?: "yes" | "half" | "no";
}

/**
 * The message of an error thrown by the core GitHub client: core errors
 * (DetectError, not exported by core) carry a string `code`. Any other
 * error, such as the plain Error of the request budget, gives null, so the
 * Student gets the general text and no internal detail.
 */
export function coreMessage(error: unknown): string | null {
  if (
    error instanceof Error &&
    typeof (error as { code?: unknown }).code === "string" &&
    error.message !== ""
  ) {
    return error.message;
  }
  return null;
}

export interface JudgeAnswerInput {
  question: string;
  judgement: string;
}

/** Verdict_Retry (INVALID_VERDICT) and Verdict_Failure (VERDICT_FAILED). */
export interface VerdictErrorAnswer extends ErrorAnswer {
  retry: boolean;
  /** Verdict_Retry only: MAX_VERDICT_RETRIES + 1 minus the count. */
  triesLeft?: number;
  /** Verdict_Failure only: the instructions of the unchanged state. */
  instructions?: string;
}

export type JudgeAnswer = SessionAnswer | ErrorAnswer | VerdictErrorAnswer;

export interface ContinueHouseInput {
  url: string;
  knowsJava?: boolean;
}

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
    // fn is called with no argument: it never receives the previous result.
    const run = this.tail.then(() => fn());
    this.tail = run.catch(() => {});
    return run;
  }
}

export class HauntedPower {
  protected readonly fetch: typeof fetch;
  protected readonly store: Store;
  /**
   * True while saves reach the Power_Data_Folder. False for the whole run
   * when the run starts in memory mode (Requirement 7.10), and after a
   * failed save until a later save works (Requirement 7.6).
   */
  protected storageOk: boolean;
  protected session: Session | null = null;
  /**
   * formatProgress of the progress last written to the store for the
   * current session, or null when none was written. After an accepted
   * advance the progress is saved when it differs from this text (7.3), so
   * a failed save is tried again with the next accepted event.
   */
  protected savedProgress: string | null = null;
  /** The run started in memory mode: the store is a memory store. */
  private readonly memoryOnly: boolean;
  /**
   * The storage warning not yet given to the Student. It is set when the
   * state of storageOk changes to false and given once, with the next
   * accepted answer (design section 6).
   */
  private pendingWarning: string | null;
  private readonly queue = new SerialQueue();

  constructor(options: HauntedPowerOptions) {
    this.fetch = options.fetch;
    this.store = options.store;
    this.storageOk = options.storageOk;
    this.memoryOnly = !options.storageOk;
    this.pendingWarning = this.memoryOnly ? MEMORY_MODE_WARNING : null;
  }

  /**
   * find_ghosts (Requirement 2). The Repository_Data_File is read before
   * any network call; an existing file (valid or broken) is never changed
   * unless `replace` is true.
   */
  findGhosts(input: FindGhostsInput): Promise<FindGhostsAnswer | ErrorAnswer> {
    return this.queue.run(() => this.doFindGhosts(input));
  }

  private async doFindGhosts(
    input: FindGhostsInput,
  ): Promise<FindGhostsAnswer | ErrorAnswer> {
    const parsed = parseRepoUrl(input.url);
    if (!parsed.ok) {
      return errorAnswer(parsed.error.code, parsed.error.message);
    }
    const name = dataFileName(parsed.value.owner, parsed.value.repo);

    if (input.replace !== true) {
      const saved = await this.store.read(name);
      if (saved.kind === "found") {
        const content = parseDataFile(saved.text, name);
        if (content.ok) {
          return errorAnswer("DATA_EXISTS", dataExistsMessage(name));
        }
        return errorAnswer(
          content.error.code,
          brokenDataMessage(content.error.message),
        );
      }
      if (saved.kind === "error") {
        // A file that exists but cannot be read is treated as broken.
        return errorAnswer("INVALID_REPORT", brokenDataMessage(saved.message));
      }
    }

    const detected = await detectGhosts(input.url, { fetch: this.fetch });
    if (!detected.ok) {
      const { code, message } = detected.error;
      return errorAnswer(
        code,
        code === "REPO_NOT_FOUND" ? REPO_NOT_FOUND_MESSAGE : message,
      );
    }
    const report = detected.value;
    const { state } = startSession(report, {
      profile: { knowsJava: input.knowsJava ?? false },
    });

    this.savedProgress = null;
    await this.save(name, report, state.progress);

    const session: Session = {
      owner: report.overview.owner,
      repo: report.overview.repo,
      report,
      state,
      invalidCount: 0,
    };
    this.session = session;

    const suggested = suggestGhost(state.ghosts, state.progress)?.path ?? null;
    let message = ghostsFoundMessage(
      session.owner,
      session.repo,
      report.ghosts.length,
      suggested,
    );
    if (report.overview.fewFiles && report.overview.message !== null) {
      message = `${message} ${report.overview.message}`;
    }
    // Both texts are kept when both apply: the partial list first, then the
    // storage warning.
    const base = sessionAnswer(
      session,
      message,
      this.withStorageWarning(
        report.overview.partial ? PARTIAL_WARNING : undefined,
      ),
    );
    return {
      ...base,
      ghosts: report.ghosts.map((g) => ({
        path: g.path,
        floor: g.floor,
        difficultyScore: g.difficultyScore,
        reason: g.reason,
      })),
      suggested,
    };
  }

  /**
   * continue_house (Requirements 4.1, 9.2). No network: it reads the
   * Repository_Data_File and starts a new session from its report and
   * progress, so exorcised ghosts stay exorcised. Any attempt in memory is
   * dropped (Requirement 7.9). A broken file is never changed here.
   */
  continueHouse(input: ContinueHouseInput): Promise<Answer> {
    return this.queue.run(() => this.doContinueHouse(input));
  }

  private async doContinueHouse(input: ContinueHouseInput): Promise<Answer> {
    const parsed = parseRepoUrl(input.url);
    if (!parsed.ok) {
      return errorAnswer(parsed.error.code, parsed.error.message);
    }
    const name = dataFileName(parsed.value.owner, parsed.value.repo);

    const saved = await this.store.read(name);
    if (saved.kind === "missing") {
      return errorAnswer("NO_DATA", noDataMessage(name));
    }
    if (saved.kind === "error") {
      // A file that exists but cannot be read is treated as broken.
      return errorAnswer("INVALID_REPORT", brokenDataMessage(saved.message));
    }
    const content = parseDataFile(saved.text, name);
    if (!content.ok) {
      return errorAnswer(
        content.error.code,
        brokenDataMessage(content.error.message),
      );
    }

    const { report, progress } = content.value;
    const { state } = startSession(report, {
      progress,
      profile: { knowsJava: input.knowsJava ?? false },
    });
    const session: Session = {
      owner: report.overview.owner,
      repo: report.overview.repo,
      report,
      state,
      invalidCount: 0,
    };
    this.session = session;
    // The file holds this progress (the Engine only normalises it).
    this.savedProgress = formatProgress(state.progress);
    return sessionAnswer(
      session,
      houseContinuedMessage(session.owner, session.repo),
      this.withStorageWarning(),
    );
  }

  /**
   * Saves report and progress in the Repository_Data_File and updates
   * storageOk (design section 6). The session always continues, in memory
   * when the save failed (Requirement 7.6).
   *
   * - Memory mode: the memory store keeps the data; storageOk stays false
   *   for the whole run and no new warning is added.
   * - A failed save while storageOk is true sets it to false and adds the
   *   warning once; more failed saves add nothing.
   * - A save that works sets storageOk back to true, so a later failure is
   *   told again.
   */
  private async save(
    name: string,
    report: HauntedReport,
    progress: ExorcismProgress,
  ): Promise<void> {
    const result = await this.store.write(
      name,
      serialiseDataFile(report, progress),
    );
    if (result.ok) this.savedProgress = formatProgress(progress);
    if (this.memoryOnly) return;
    if (result.ok) {
      this.storageOk = true;
      // The data is on disk now; an undelivered failure warning is stale.
      this.pendingWarning = null;
      return;
    }
    if (this.storageOk) {
      this.storageOk = false;
      this.pendingWarning = saveFailedWarning(result.message);
    }
  }

  /**
   * The warning of an accepted answer: `other` (if any) followed by the
   * pending storage warning, which is given only once.
   */
  private withStorageWarning(other?: string): string | undefined {
    const parts: string[] = [];
    if (other !== undefined) parts.push(other);
    if (this.pendingWarning !== null) {
      parts.push(this.pendingWarning);
      this.pendingWarning = null;
    }
    return parts.length > 0 ? parts.join(" ") : undefined;
  }

  /**
   * pick_ghost (Requirements 3.1 to 3.4). The step and the path are checked
   * before any request. The Ghost_Text is read from GitHub with a new client
   * and given to the Engine unchanged. A failed read leaves the session as
   * it was and never sends pick-ghost.
   */
  pickGhost(input: PickGhostInput): Promise<Answer> {
    return this.queue.run(() => this.doPickGhost(input));
  }

  private async doPickGhost(input: PickGhostInput): Promise<Answer> {
    const session = this.session;
    if (session === null) {
      return errorAnswer("NO_SESSION", NO_SESSION_MESSAGE);
    }
    const { state } = session;
    if (!ALLOWED_EVENTS[state.step].includes("pick-ghost")) {
      return errorAnswer(
        "INVALID_EVENT",
        pickNotAllowedMessage(state.step),
        state,
      );
    }
    if (!isPickable(state.ghosts, state.progress, input.path)) {
      return errorAnswer(
        "INVALID_EVENT",
        notPickableMessage(input.path),
        state,
      );
    }

    let text: string;
    try {
      const client = createGitHubClient({ fetch: this.fetch });
      text = await client.getFileText(
        session.owner,
        session.repo,
        session.report.overview.ref,
        input.path,
      );
    } catch (error) {
      return errorAnswer(
        "GHOST_TEXT_UNREADABLE",
        ghostTextUnreadableMessage(input.path, coreMessage(error)),
        state,
      );
    }

    const transition = advance(state, {
      type: "pick-ghost",
      path: input.path,
      text,
    });
    if (!transition.ok) {
      return errorAnswer("INVALID_EVENT", transition.error.message, state);
    }
    session.state = transition.state;
    // Any accepted advance resets the Invalid_Judgement_Count (5.7).
    session.invalidCount = 0;
    // pick-ghost never changes the progress, so there is nothing to save.
    return sessionAnswer(
      session,
      ghostPickedMessage(input.path),
      this.withStorageWarning(),
    );
  }

  /**
   * send_event (Requirements 4.4, 4.5, 4.10 to 4.12, 6.3, 6.4, 7.3). Builds
   * the event from the input, checks it with parseEvent and advance; a
   * refused event leaves the session as it was. answer-rated and dont-know
   * are never sent here: only judge_answer sends them (5.2).
   */
  sendEvent(input: SendEventInput): Promise<Answer> {
    return this.queue.run(() => this.doSendEvent(input));
  }

  private async doSendEvent(input: SendEventInput): Promise<Answer> {
    const session = this.session;
    if (session === null) {
      return errorAnswer("NO_SESSION", NO_SESSION_MESSAGE);
    }
    const { state } = session;
    if (!(SEND_EVENT_TYPES as readonly string[]).includes(input.type)) {
      return errorAnswer(
        "INVALID_EVENT",
        sendEventTypeMessage(String(input.type)),
        state,
      );
    }
    const raw: Record<string, unknown> = { type: input.type };
    if (input.text !== undefined) raw["text"] = input.text;
    if (input.answer !== undefined) raw["answer"] = input.answer;
    const parsed = parseEvent(raw);
    if (!parsed.ok) {
      return errorAnswer("INVALID_EVENT", parsed.error.message, state);
    }
    const transition = advance(state, parsed.value);
    if (!transition.ok) {
      return errorAnswer("INVALID_EVENT", transition.error.message, state);
    }
    await this.accept(session, transition.state);
    return sessionAnswer(
      session,
      eventAcceptedMessage(session.state.step),
      this.withStorageWarning(),
    );
  }

  /**
   * Keeps the state of an advance the Engine accepted: resets the
   * Invalid_Judgement_Count (5.7) and, when the progress differs from the
   * saved one, saves it before the answer is returned (7.3).
   */
  protected async accept(session: Session, next: SessionState): Promise<void> {
    session.state = next;
    session.invalidCount = 0;
    if (formatProgress(next.progress) !== this.savedProgress) {
      await this.save(
        dataFileName(session.owner, session.repo),
        session.report,
        next.progress,
      );
    }
  }

  /**
   * judge_answer (Requirements 4.6, 5, 6.2 to 6.4, 9.4): the strict verdict
   * flow of design section 7. The step is checked before parseVerdict; a
   * rejected judgement never reaches advance, so the state stays the same.
   */
  judgeAnswer(input: JudgeAnswerInput): Promise<JudgeAnswer> {
    return this.queue.run(() => this.doJudgeAnswer(input));
  }

  private async doJudgeAnswer(input: JudgeAnswerInput): Promise<JudgeAnswer> {
    const session = this.session;
    if (session === null) {
      return errorAnswer("NO_SESSION", NO_SESSION_MESSAGE);
    }
    const { state } = session;
    // 5.11: outside asking, refuse before parseVerdict; the count stays.
    if (state.step !== "asking" || state.current === null) {
      return errorAnswer(
        "INVALID_EVENT",
        judgeNotAllowedMessage(state.step),
        state,
      );
    }

    const decision = gateJudgement(input.judgement, session.invalidCount);
    session.invalidCount = decision.count;
    if (decision.kind === "retry") {
      return {
        ...errorAnswer(
          "INVALID_VERDICT",
          verdictRetryMessage(
            decision.reason,
            ALLOWED_VERDICT_LINES,
            decision.triesLeft,
          ),
          state,
        ),
        retry: true,
        triesLeft: decision.triesLeft,
      };
    }
    if (decision.kind === "failure") {
      return {
        ...errorAnswer("VERDICT_FAILED", VERDICT_FAILED_MESSAGE, state),
        retry: false,
        instructions: buildInstructions(state).text,
      };
    }

    const question = questionFor(state.current.pendingQuestion, input.question);
    const transition = advance(state, verdictEvent(decision.verdict, question));
    if (!transition.ok) {
      // Only a blank question gets here; the count is already 0.
      return errorAnswer("INVALID_EVENT", transition.error.message, state);
    }
    await this.accept(session, transition.state);
    return sessionAnswer(
      session,
      judgementAcceptedMessage(session.state.step),
      this.withStorageWarning(),
    );
  }

  /**
   * house_status (Requirements 10.1, 10.2). Every ghost of the current
   * session with its floor and state, and the Haunted_Share, which comes
   * only from hauntedShare of the Engine. No network, no file access.
   */
  houseStatus(): Promise<HouseStatusAnswer | ErrorAnswer> {
    return this.queue.run(() => this.doHouseStatus());
  }

  private doHouseStatus(): HouseStatusAnswer | ErrorAnswer {
    const session = this.session;
    if (session === null) {
      return errorAnswer("NO_SESSION", NO_SESSION_MESSAGE);
    }
    const { state } = session;
    // state.progress is normalised by the Engine: one entry per ghost.
    const ghosts: GhostStatus[] = state.ghosts.map((ghost) => ({
      path: ghost.path,
      floor: ghost.floor,
      state:
        state.progress.ghosts.find((entry) => entry.path === ghost.path)
          ?.state ?? "haunted",
    }));
    const haunted = ghosts.filter((g) => g.state === "haunted").length;
    return {
      ...sessionAnswer(
        session,
        houseStatusMessage(haunted, ghosts.length),
        this.withStorageWarning(),
      ),
      ghosts,
    };
  }
}
