import type { UserAction } from "../../../logic/actions.js";
import { TEXTS } from "../../../logic/texts.js";
import type {
  GhostView,
  LicenceView,
  ViewModel,
} from "../../../logic/viewModel.js";
import { focusKeyOf } from "../../shared/focus.js";

export type GrimoireBlock =
  | { kind: "judge-line"; text: string }
  | { kind: "reading"; title: string; text: string }
  | { kind: "question"; title: string; text: string }
  | { kind: "answer-box"; key: string; label: string } // key = `${path}\n${questionNumber}`
  | { kind: "revealed"; title: string; text: string }
  | { kind: "prompt"; text: string }
  | {
      kind: "choices";
      items: { action: UserAction; label: string; focusKey: string }[];
    }
  | { kind: "code"; text: string }
  | { kind: "licence"; licence: LicenceView };

export interface GrimoireView {
  heading: string;
  blocks: GrimoireBlock[];
  litCandles: 0 | 1 | 2 | 3;
}

/** The label of a ghost action, or null for an action the Grimoire does not show. */
function ghostLabel(action: UserAction): string | null {
  switch (action.type) {
    case "explanation-continue":
    case "show-model-answer":
    case "dont-know":
    case "retry":
    case "back-to-list":
    case "leave-ghost":
      return TEXTS.actionLabels[action.type];
    case "rate":
      return TEXTS.actionLabels.rate[action.rating];
    case "self-check":
      return TEXTS.actionLabels["self-check"][action.answer];
    default:
      return null;
  }
}

/** Requirement 10.9. A missing question number counts as 0 finished questions. */
function litCandlesOf(ghost: GhostView): 0 | 1 | 2 | 3 {
  const n = ghost.questionNumber ?? 0;
  switch (ghost.step) {
    case "asking":
    case "simplifying":
      return Math.max(0, n - 1) as 0 | 1 | 2;
    case "model-answer":
      return n as 0 | 1 | 2 | 3;
    case "self-check":
      return 3;
    default:
      return 0;
  }
}

/**
 * Pure mapping from the ViewModel to the Grimoire, or null outside the
 * Ghost_Scene. The blocks follow the Simple_Renderer order (Requirement 10.12).
 */
export function grimoireView(model: ViewModel): GrimoireView | null {
  const ghost = model.ghost;
  if (model.scene.kind !== "ghost" || ghost === null) return null;
  const blocks: GrimoireBlock[] = [
    { kind: "judge-line", text: ghost.judgeLine },
  ];
  if (ghost.reading !== null) {
    blocks.push({
      kind: "reading",
      title: TEXTS.readingTitles[ghost.reading.kind],
      text: ghost.reading.text,
    });
  }
  if (ghost.question !== null && ghost.questionNumber !== null) {
    blocks.push({
      kind: "question",
      title: TEXTS.questionTitle(ghost.questionNumber),
      text: ghost.question,
    });
  }
  if (ghost.showAnswerBox) {
    blocks.push({
      kind: "answer-box",
      key: `${ghost.path}\n${String(ghost.questionNumber)}`,
      label: TEXTS.answerLabel,
    });
  }
  if (ghost.revealedAnswer !== null) {
    blocks.push({
      kind: "revealed",
      title: TEXTS.revealedTitle,
      text: ghost.revealedAnswer,
    });
  }
  if (ghost.prompt !== null) {
    blocks.push({ kind: "prompt", text: ghost.prompt });
  }
  const items: { action: UserAction; label: string; focusKey: string }[] = [];
  for (const entry of model.available) {
    // submit-live is the only entry that is not a full UserAction (no URL).
    if (entry.type === "submit-live") continue;
    const label = ghostLabel(entry);
    if (label === null) continue;
    items.push({ action: entry, label, focusKey: focusKeyOf(entry) });
  }
  if (items.length > 0) blocks.push({ kind: "choices", items });
  if (ghost.code !== null) {
    blocks.push({ kind: "code", text: ghost.code });
    if (ghost.licenceNextToCode && model.licence !== null) {
      blocks.push({ kind: "licence", licence: model.licence });
    }
  }
  return {
    heading: TEXTS.ghostHeading(ghost.path),
    blocks,
    litCandles: litCandlesOf(ghost),
  };
}
