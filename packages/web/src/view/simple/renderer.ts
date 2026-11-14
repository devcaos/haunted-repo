import type {
  ActionSink,
  AvailableAction,
  UserAction,
} from "../../logic/actions.js";
import { TEXTS } from "../../logic/texts.js";
import type { Renderer, ViewModel } from "../../logic/viewModel.js";
import { el } from "./dom.js";
import { renderHouse } from "./house.js";
import { renderLicence } from "./licence.js";

/** Actions this renderer shows as buttons above the Ghost_List, with their label. */
function actionButton(
  action: AvailableAction,
): { label: string; action: UserAction } | null {
  switch (action.type) {
    case "show-sample":
      return { label: TEXTS.actionLabels["show-sample"], action };
    default:
      // submit-live is the form button; go-to-floor and go-to-house are
      // not shown by this renderer; ghost actions arrive in PR 2.
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
    el("header", {}, [el("h1", {}, [TEXTS.pageTitle]), form, status]),
    main,
    footer,
  );

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
        const button = el("button", { type: "button" }, [shown.label]);
        button.addEventListener("click", () => onAction(shown.action));
        return [button];
      });
      const content: HTMLElement[] = [];
      if (buttons.length > 0) {
        content.push(el("div", { class: "actions" }, buttons));
      }
      if (model.ghost === null && model.house !== null) {
        content.push(renderHouse(model, onAction));
      }
      main.replaceChildren(...content);

      footer.replaceChildren(
        ...(model.licence === null ? [] : [renderLicence(model.licence)]),
      );
    },
  };
}
