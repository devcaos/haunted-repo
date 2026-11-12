import type { Ghost, HauntedReport } from "../ghost-detection/types.js";
import { ALLOWED_EVENTS, parseEvent } from "./event.js";
import { classifyFileKind } from "./fileKind.js";
import { buildInstructions } from "./instructions.js";
import { normaliseProgress } from "./progress.js";
import { isPickable, suggestGhost } from "./suggest.js";
import type {
  CurrentGhost,
  ExorcismErrorInfo,
  ExorcismEvent,
  ExorcismProgress,
  GhostProgress,
  Rating,
  SessionState,
  StudentProfile,
  TutorInstructions,
} from "./types.js";

export interface StartOptions {
  progress?: ExorcismProgress;
  profile?: StudentProfile;
}

/** Keeps the first ghost of each path, in report order, and copies it. */
function dedupeByPath(ghosts: readonly Ghost[]): Ghost[] {
  const seen = new Set<string>();
  const result: Ghost[] = [];
  for (const ghost of ghosts) {
    if (seen.has(ghost.path)) continue;
    seen.add(ghost.path);
    result.push({ ...ghost, factors: { ...ghost.factors } });
  }
  return result;
}

export function startSession(
  report: HauntedReport,
  options?: StartOptions,
): { state: SessionState; instructions: TutorInstructions } {
  const ghosts = dedupeByPath(report.ghosts);
  const progress = normaliseProgress(ghosts, options?.progress ?? null);
  const state: SessionState = {
    step: suggestGhost(ghosts, progress) === null ? "house-clean" : "choosing",
    profile: { knowsJava: options?.profile?.knowsJava ?? false },
    ghosts,
    progress,
    asked: {},
    current: null,
  };
  return { state, instructions: buildInstructions(state) };
}

export type Transition =
  | { ok: true; state: SessionState; instructions: TutorInstructions }
  | { ok: false; error: ExorcismErrorInfo; state: SessionState };

function refuse(state: SessionState, message: string): Transition {
  return { ok: false, error: { code: "INVALID_EVENT", message }, state };
}

function accept(state: SessionState): Transition {
  return { ok: true, state, instructions: buildInstructions(state) };
}

/** Starts a new attempt at a ghost (used by pick-ghost in choosing and failed). */
function pickGhost(
  state: SessionState,
  event: Extract<ExorcismEvent, { type: "pick-ghost" }>,
): Transition {
  if (!isPickable(state.ghosts, state.progress, event.path)) {
    return refuse(state, "That ghost cannot be picked.");
  }
  const ghost = state.ghosts.find((g) => g.path === event.path);
  if (ghost === undefined) return refuse(state, "That ghost cannot be picked.");
  const current: CurrentGhost = {
    path: event.path,
    text: event.text,
    kind: classifyFileKind(event.text, ghost.language),
    explanation: "",
    simpler: [],
    attemptStart: state.asked[event.path]?.length ?? 0,
    questionIndex: 0,
    dontKnowCount: 0,
    pendingQuestion: null,
    ratings: [],
  };
  return accept({ ...state, step: "explaining", current });
}

/** Moves the session one step. Never mutates its input and never throws on bad events. */
export function advance(state: SessionState, event: unknown): Transition {
  const parsed = parseEvent(event);
  if (!parsed.ok) return { ok: false, error: parsed.error, state };
  const e = parsed.value;
  if (!ALLOWED_EVENTS[state.step].includes(e.type)) {
    return refuse(
      state,
      `The event ${e.type} is not accepted in the step ${state.step}.`,
    );
  }
  if (e.type === "pick-ghost") return pickGhost(state, e);
  const current = state.current;
  if (current === null) return refuse(state, "There is no ghost in progress.");
  if (e.type === "explanation-done") {
    if (state.step === "explaining") {
      return accept({
        ...state,
        step: "asking",
        current: { ...current, explanation: e.text },
      });
    }
    if (state.step === "simplifying") {
      return accept({
        ...state,
        step: "asking",
        current: { ...current, simpler: [...current.simpler, e.text] },
      });
    }
    if (state.step === "model-answer") return nextQuestion(state, current);
  }
  if (e.type === "answer-rated" && state.step === "asking") {
    const asked =
      current.pendingQuestion === null
        ? withQuestion(state, current.path, e.question)
        : state.asked;
    return nextQuestion(
      { ...state, asked },
      { ...current, ratings: [...current.ratings, e.rating] },
    );
  }
  if (e.type === "dont-know" && state.step === "asking") {
    if (current.dontKnowCount === 0) {
      return accept({
        ...state,
        step: "simplifying",
        asked: withQuestion(state, current.path, e.question),
        current: { ...current, dontKnowCount: 1, pendingQuestion: e.question },
      });
    }
    return accept({
      ...state,
      step: "model-answer",
      current: { ...current, ratings: [...current.ratings, "wrong"] },
    });
  }
  if (e.type === "self-check-answered" && state.step === "self-check") {
    const progress = updateEntry(state, current.path, (entry) => ({
      ...entry,
      selfCheck: e.answer,
    }));
    const next = { ...state, progress, current: null };
    return accept({
      ...next,
      step:
        suggestGhost(state.ghosts, progress) === null
          ? "house-clean"
          : "choosing",
    });
  }
  if (e.type === "retry-ghost" && state.step === "failed") {
    return accept({
      ...state,
      step: "explaining",
      current: {
        ...current,
        simpler: [],
        attemptStart: state.asked[current.path]?.length ?? 0,
        questionIndex: 0,
        dontKnowCount: 0,
        pendingQuestion: null,
        ratings: [],
      },
    });
  }
  if (e.type === "leave-ghost") {
    return accept({ ...state, step: "choosing", current: null });
  }
  return refuse(state, `The event ${e.type} cannot be applied now.`);
}

/** Returns a new progress with one entry changed (no mutation). */
function updateEntry(
  state: SessionState,
  path: string,
  change: (entry: GhostProgress) => GhostProgress,
): ExorcismProgress {
  return {
    ghosts: state.progress.ghosts.map((entry) =>
      entry.path === path ? change(entry) : entry,
    ),
  };
}

/** Returns the asked map with one more question for a ghost (new object, no mutation). */
function withQuestion(
  state: SessionState,
  path: string,
  question: string,
): Record<string, string[]> {
  return { ...state.asked, [path]: [...(state.asked[path] ?? []), question] };
}

/** Goes to the next question, or (after the 3rd rating) decides the attempt. */
function nextQuestion(state: SessionState, current: CurrentGhost): Transition {
  if (current.questionIndex === 2) {
    const passed = decide(current.ratings);
    const progress = updateEntry(state, current.path, (entry) => ({
      ...entry,
      state: passed ? "exorcised" : "haunted",
      ratings: [...current.ratings],
    }));
    return accept({
      ...state,
      step: passed ? "self-check" : "failed",
      progress,
      current,
    });
  }
  const questionIndex = current.questionIndex === 0 ? 1 : 2;
  return accept({
    ...state,
    step: "asking",
    current: {
      ...current,
      questionIndex,
      dontKnowCount: 0,
      pendingQuestion: null,
    },
  });
}

/** True (exorcised) iff at least 2 ratings are good and the Core_Question (first) is not wrong. */
export function decide(ratings: readonly Rating[]): boolean {
  const good = ratings.filter((r) => r !== "wrong").length;
  return good >= 2 && ratings[0] !== "wrong";
}
