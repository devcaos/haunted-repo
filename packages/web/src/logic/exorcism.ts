import type {
  CurrentGhost,
  ExorcismEvent,
  ExorcismStep,
  SessionState,
} from "@haunted-repo/core";
import type { AvailableAction, UserAction } from "./actions.js";
import type { GhostContent } from "./demoScript.js";
import { TEXTS } from "./texts.js";
import type { GhostView, ReadingKind } from "./viewModel.js";

type GhostStep = GhostView["step"];

const GHOST_STEPS: readonly ExorcismStep[] = [
  "explaining",
  "asking",
  "simplifying",
  "model-answer",
  "self-check",
  "failed",
];

/** Steps in which the full Ghost_Text is shown (Requirements 6.5, 6.6). */
const CODE_STEPS: readonly ExorcismStep[] = [
  "explaining",
  "asking",
  "simplifying",
  "model-answer",
];

function isGhostStep(step: ExorcismStep): step is GhostStep {
  return GHOST_STEPS.includes(step);
}

function questionOf(current: CurrentGhost, content: GhostContent): string {
  return content.questions[current.questionIndex];
}

/** The text shown in a reading step; the same text is sent in explanation-done. */
export function readingText(
  state: SessionState,
  content: GhostContent,
): { kind: ReadingKind; text: string } | null {
  const current = state.current;
  if (current === null) return null;
  switch (state.step) {
    case "explaining":
      // current.explanation is "" until the first explanation is done and is
      // kept across retry-ghost, so a non-empty value means this is a retry.
      return current.explanation === ""
        ? { kind: "explanation", text: content.explanation }
        : { kind: "retry-explanation", text: content.retryExplanation };
    case "simplifying":
      return {
        kind: "simpler",
        text: content.simpler[current.questionIndex],
      };
    case "model-answer":
      return {
        kind: "model-answer",
        text: content.modelAnswers[current.questionIndex],
      };
    default:
      return null;
  }
}

/**
 * The ghost part of the View_Model. Only called while a ghost is open
 * (one of the six ghost steps, with a current ghost); otherwise it throws,
 * because that is a bug in the controller.
 */
export function buildGhostView(
  state: SessionState,
  content: GhostContent,
  text: string,
  revealed: boolean,
): GhostView {
  const current = state.current;
  const step = state.step;
  if (current === null || !isGhostStep(step)) {
    throw new Error(`No ghost is open in the step ${step}.`);
  }
  const ghost = state.ghosts.find((g) => g.path === current.path);
  if (ghost === undefined) {
    throw new Error(`The ghost ${current.path} is not in the session.`);
  }
  const showCode = CODE_STEPS.includes(step);
  const asking = step === "asking";
  const numbered = asking || step === "simplifying" || step === "model-answer";
  return {
    path: current.path,
    floor: ghost.floor,
    step,
    code: showCode ? text : null,
    licenceNextToCode: showCode,
    judgeLine: TEXTS.judgeLine,
    reading: readingText(state, content),
    questionNumber: numbered
      ? ((current.questionIndex + 1) as 1 | 2 | 3)
      : null,
    question: asking ? questionOf(current, content) : null,
    revealedAnswer:
      asking && revealed ? content.modelAnswers[current.questionIndex] : null,
    showAnswerBox: asking,
    prompt:
      step === "self-check"
        ? TEXTS.selfCheck
        : step === "failed"
          ? TEXTS.stillHaunted
          : null,
  };
}

/** The ghost actions of the table in the design (actions.ts) for this step. */
export function ghostActions(
  step: ExorcismStep,
  revealed: boolean,
): AvailableAction[] {
  switch (step) {
    case "explaining":
    case "simplifying":
    case "model-answer":
      return [{ type: "explanation-continue" }, { type: "leave-ghost" }];
    case "asking":
      return revealed
        ? [
            { type: "rate", rating: "right" },
            { type: "rate", rating: "half-right" },
            { type: "rate", rating: "wrong" },
            { type: "dont-know" },
            { type: "leave-ghost" },
          ]
        : [
            { type: "show-model-answer" },
            { type: "dont-know" },
            { type: "leave-ghost" },
          ];
    case "self-check":
      return [
        { type: "self-check", answer: "yes" },
        { type: "self-check", answer: "half" },
        { type: "self-check", answer: "no" },
      ];
    case "failed":
      return [{ type: "retry" }, { type: "back-to-list" }];
    default:
      return [];
  }
}

/**
 * The engine event for a ghost action, or null when the action sends no
 * event: show-model-answer and back-to-list (local only), the list actions,
 * and an action that needs a current ghost or a reading when there is none.
 * `text` is the full Ghost_Text, used by start-ghost.
 */
export function eventFor(
  action: UserAction,
  state: SessionState,
  content: GhostContent,
  text: string,
): ExorcismEvent | null {
  const current = state.current;
  switch (action.type) {
    case "start-ghost":
      return { type: "pick-ghost", path: action.path, text };
    case "explanation-continue": {
      const reading = readingText(state, content);
      return reading === null
        ? null
        : { type: "explanation-done", text: reading.text };
    }
    case "rate":
      return current === null
        ? null
        : {
            type: "answer-rated",
            rating: action.rating,
            question: questionOf(current, content),
          };
    case "dont-know":
      return current === null
        ? null
        : { type: "dont-know", question: questionOf(current, content) };
    case "self-check":
      return { type: "self-check-answered", answer: action.answer };
    case "retry":
      return { type: "retry-ghost" };
    case "leave-ghost":
      return { type: "leave-ghost" };
    default:
      return null;
  }
}
