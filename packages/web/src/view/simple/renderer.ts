import type {
  ActionSink,
  AvailableAction,
  UserAction,
} from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import type { Renderer, ViewModel } from "../../logic/viewModel.js";
import { el } from "./dom.js";
import { createAnswerBox, renderGhost } from "./ghost.js";
import { renderHouse } from "./house.js";
import { renderLicence } from "./licence.js";
import { type FocusBefore, focusAfterRender, focusKeyOf } from "./focus.js";

// Dark launch (decision Q14): task 16.8 changes this to "./".
const SCENIC_HREF = "?view=scenic";
/** Where focus is now, seen from the rebuilt `main` element. */
function focusBefore(main: HTMLElement): FocusBefore {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !main.contains(active)) {
    return { where: "outside" };
  }
  return { where: "main", key: active.dataset.focusKey ?? null };
}

/** The element of `main` with this focus key, compared as plain text (no selector escaping). */
function byFocusKey(main: HTMLElement, key: string): HTMLElement | null {
  for (const node of main.querySelectorAll<HTMLElement>("[data-focus-key]")) {
    if (node.dataset.focusKey === key) return node;
  }
  return null;
}

/** Actions this renderer shows as buttons above the Ghost_List, with their label. */
function actionButton(
  action: AvailableAction,
): { label: string; action: UserAction } | null {
  switch (action.type) {
    case "show-sample":
      return { label: TEXTS.actionLabels["show-sample"], action };
    default:
      // submit-live is the form button; go-to-floor and go-to-house are
      // not shown by this renderer; start-ghost is on each card; the other
      // ghost actions are in the Exorcism_Panel.
      return null;
  }
}

/** Builds the static shell once (header, Live_Form, Status_Region, main, footer) inside `root`. */
export function createSimpleRenderer(
  root: HTMLElement,
  onAction: ActionSink,
): Renderer {
  const input = el("input", {
    id: "live-url",
    name: "url",
    type: "text",
    inputmode: "url",
    autocomplete: "url",
    spellcheck: "false",
  });
  const submit = el("button", { type: "submit" }, [
    TEXTS.actionLabels["submit-live"],
  ]);
  // The form is built once and never replaced, so the URL text stays (Requirement 5.4).
  // noValidate: a blank or odd URL goes to Core, which answers with its own message.
  const form = el("form", { novalidate: "" }, [
    el("div", { class: "field" }, [
      el("label", { for: "live-url" }, [TEXTS.formLabel]),
      input,
    ]),
    submit,
  ]);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onAction({ type: "submit-live", url: input.value });
  });

  const status = el("p", {
    class: "status",
    role: "status",
    "aria-live": "polite",
  });
  const main = el("main");
  const footer = el("footer");

  root.replaceChildren(
    el("header", {}, [
      el("h1", {}, [TEXTS.pageTitle]),
      el("a", { class: "view-link", href: SCENIC_HREF }, [
        TEXTS.viewLinks.scenic,
      ]),
      form,
      status,
    ]),
    main,
    footer,
  );

  // Purely visual state: the Answer_Box of the question on screen (kept so the
  // typed text survives a re-render of the same question) and the last model
  // drawn (to decide where focus goes, see focus.ts).
  let answerBox: HTMLTextAreaElement | null = null;
  let answerKey: string | null = null;
  let lastModel: ViewModel | null = null;

  return {
    render(model: ViewModel): void {
      // `transition` is ignored: this renderer has no animation.
      form.hidden = !model.live.formVisible;
      submit.disabled = !model.available.some((a) => a.type === "submit-live");

      status.dataset.status = model.status.kind;
      if (status.textContent !== model.status.text) {
        status.textContent = model.status.text;
      }

      // One button per shown action, in the order of model.available.
      const buttons = model.available.flatMap((entry) => {
        const shown = actionButton(entry);
        if (shown === null) return [];
        const button = el(
          "button",
          { type: "button", "data-focus-key": focusKeyOf(entry) },
          [shown.label],
        );
        button.addEventListener("click", () => onAction(shown.action));
        return [button];
      });
      const content: HTMLElement[] = [];
      if (buttons.length > 0) {
        content.push(el("div", { class: "actions" }, buttons));
      }
      const ghost = model.ghost;
      let heading: HTMLElement | null = null;
      if (ghost !== null) {
        // A new question (or a new ghost) gets a new, empty Answer_Box.
        const key = ghost.showAnswerBox
          ? `${ghost.path}\n${String(ghost.questionNumber)}`
          : null;
        if (key !== answerKey) {
          answerBox = key === null ? null : createAnswerBox();
          answerKey = key;
        }
        const drawn = renderGhost(model, ghost, answerBox, onAction);
        content.push(drawn.panel);
        heading = drawn.heading;
      } else {
        answerBox = null;
        answerKey = null;
        if (model.house !== null) content.push(renderHouse(model, onAction));
      }
      const before = focusBefore(main);
      main.replaceChildren(...content);

      // Rebuilding `main` drops the focus of any element inside it, so focus
      // is put back on a stable element and never falls to <body>
      // (Requirements 6.7, 12.1).
      const target = focusAfterRender(lastModel, model, before);
      lastModel = model;
      let focusEl: HTMLElement | null = null;
      if (target.kind === "ghost-heading") focusEl = heading;
      if (target.kind === "list-heading") {
        focusEl = main.querySelector<HTMLElement>(".list-heading");
      }
      if (target.kind === "key") focusEl = byFocusKey(main, target.key);
      focusEl?.focus();

      footer.replaceChildren(
        ...(model.licence === null ? [] : [renderLicence(model.licence)]),
      );
    },
  };
}
