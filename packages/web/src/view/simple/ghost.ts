import type { ActionSink, UserAction } from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import type { GhostView, ViewModel } from "../../logic/viewModel.js";
import { el } from "./dom.js";
import { focusKeyOf } from "./focus.js";
import { renderLicence } from "./licence.js";

/** The label of a ghost action, or null for an action the panel does not show. */
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

/**
 * The Answer_Box. It has a label and no event listener: its text is never
 * read, so it exists only in this DOM field (Requirement 6.23).
 */
export function createAnswerBox(): HTMLTextAreaElement {
  return el("textarea", { id: "answer-box", name: "answer", rows: "4" });
}

function section(className: string, title: string, text: string): HTMLElement {
  return el("div", { class: className }, [
    el("h3", {}, [title]),
    el("p", {}, [text]),
  ]);
}

/**
 * The Exorcism_Panel. `heading` gets `tabindex="-1"` so the renderer can move
 * focus to it. `answerBox` is owned by the renderer, so the typed text stays
 * while the same question is shown.
 */
export function renderGhost(
  model: ViewModel,
  ghost: GhostView,
  answerBox: HTMLTextAreaElement | null,
  onAction: ActionSink,
): { panel: HTMLElement; heading: HTMLElement } {
  const heading = el("h2", { tabindex: "-1" }, [
    TEXTS.ghostHeading(ghost.path),
  ]);
  const children: HTMLElement[] = [
    heading,
    el("p", { class: "judge-line" }, [ghost.judgeLine]),
  ];

  if (ghost.reading !== null) {
    children.push(
      section(
        "reading",
        TEXTS.readingTitles[ghost.reading.kind],
        ghost.reading.text,
      ),
    );
  }
  if (ghost.question !== null && ghost.questionNumber !== null) {
    children.push(
      section(
        "question",
        TEXTS.questionTitle(ghost.questionNumber),
        ghost.question,
      ),
    );
  }
  if (ghost.showAnswerBox && answerBox !== null) {
    children.push(
      el("div", { class: "field answer" }, [
        el("label", { for: answerBox.id }, [TEXTS.answerLabel]),
        answerBox,
      ]),
    );
  }
  if (ghost.revealedAnswer !== null) {
    children.push(
      section("revealed", TEXTS.revealedTitle, ghost.revealedAnswer),
    );
  }
  if (ghost.prompt !== null) {
    children.push(el("p", { class: "prompt" }, [ghost.prompt]));
  }

  // One button per available ghost action, in the order of model.available.
  const buttons = model.available.flatMap((entry) => {
    // submit-live is the only entry that is not a full UserAction (no URL).
    if (entry.type === "submit-live") return [];
    const label = ghostLabel(entry);
    if (label === null) return [];
    const action: UserAction = entry;
    const button = el(
      "button",
      { type: "button", "data-focus-key": focusKeyOf(entry) },
      [label],
    );
    button.addEventListener("click", () => onAction(action));
    return [button];
  });
  if (buttons.length > 0) {
    children.push(el("div", { class: "actions" }, buttons));
  }

  if (ghost.code !== null) {
    children.push(
      el("pre", { class: "code-block", tabindex: "0" }, [
        el("code", {}, [ghost.code]),
      ]),
    );
    if (ghost.licenceNextToCode && model.licence !== null) {
      children.push(renderLicence(model.licence));
    }
  }

  const panel = el(
    "section",
    { class: "panel", "data-step": ghost.step },
    children,
  );
  return { panel, heading };
}
