import type { UserAction } from "../../logic/actions.js";
import type { FocusBefore } from "../shared/focus.js";
import { el } from "./dom.js";
import type { GrimoireBlock, GrimoireView } from "./model/grimoireView.js";
import type { ScenicFocusTarget } from "./model/scenicFocus.js";

export interface Grimoire {
  /** `section.grimoire`, built once per page; its content is rebuilt on each Ghost_Scene render. */
  element: HTMLElement;
  update(view: GrimoireView): void;
  /** Where focus is now, seen from the Grimoire (the "rebuilt part" of the focus rule). */
  focusBefore(): FocusBefore | null;
  /** Moves focus without scrolling the page; a missing key falls back to the heading. */
  focus(target: ScenicFocusTarget): void;
  focusHeading(): void;
}

const ANSWER_ID = "scenic-answer-box";

function textBlock(cls: string, title: string, text: string): HTMLElement {
  return el("div", { class: `grimoire-block ${cls}` }, [
    el("h3", {}, [title]),
    el("p", {}, [text]),
  ]);
}

/**
 * The Grimoire (Requirement 10): real HTML in the Simple_Renderer order. The
 * Answer_Box element is kept while its key is unchanged, so the typed text
 * stays; its text is never read and it has no `input` or `change` listener
 * (Requirement 10.11).
 */
export function createGrimoire(
  send: (action: UserAction) => boolean,
): Grimoire {
  const element = el("section", { class: "grimoire" });
  let heading: HTMLElement | null = null;
  let answer: { key: string; box: HTMLTextAreaElement } | null = null;

  const byKey = (key: string): HTMLElement | null => {
    for (const node of element.querySelectorAll<HTMLElement>(
      "[data-focus-key]",
    )) {
      if (node.dataset.focusKey === key) return node;
    }
    return null;
  };

  const block = (b: GrimoireBlock): HTMLElement => {
    switch (b.kind) {
      case "judge-line":
        return el("p", { class: "grimoire-block judge-line" }, [b.text]);
      case "reading":
        return textBlock("reading", b.title, b.text);
      case "question":
        return textBlock("question", b.title, b.text);
      case "revealed":
        return textBlock("revealed", b.title, b.text);
      case "prompt":
        return el("p", { class: "grimoire-block prompt" }, [b.text]);
      case "answer-box": {
        if (answer === null || answer.key !== b.key) {
          answer = {
            key: b.key,
            box: el("textarea", { id: ANSWER_ID, name: "answer", rows: "4" }),
          };
        }
        return el("div", { class: "grimoire-block field answer" }, [
          el("label", { for: ANSWER_ID }, [b.label]),
          answer.box,
        ]);
      }
      case "choices":
        return el(
          "div",
          { class: "grimoire-block choices" },
          b.items.map((item) => {
            const button = el(
              "button",
              {
                type: "button",
                class: "choice",
                "data-focus-key": item.focusKey,
              },
              [item.label],
            );
            button.addEventListener("click", () => {
              send(item.action);
            });
            return button;
          }),
        );
      case "code":
        return el(
          "pre",
          { class: "grimoire-block code-block", tabindex: "0" },
          [el("code", {}, [b.text])],
        );
      case "licence":
        return el("p", { class: "grimoire-block licence" }, [
          b.licence.copyright,
          " ",
          el("a", { href: b.licence.href }, [b.licence.linkText]),
        ]);
    }
  };

  return {
    element,
    update(view: GrimoireView): void {
      heading = el("h2", { class: "grimoire-heading", tabindex: "-1" }, [
        view.heading,
      ]);
      const hasBox = view.blocks.some((b) => b.kind === "answer-box");
      const children = [heading, ...view.blocks.map(block)];
      if (!hasBox) answer = null;
      element.replaceChildren(...children);
    },
    focusBefore(): FocusBefore | null {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !element.contains(active)) {
        return null;
      }
      return { where: "main", key: active.dataset.focusKey ?? null };
    },
    focus(target: ScenicFocusTarget): void {
      if (target.kind === "keep") return;
      // A new screen starts at the top of the Grimoire's own scroll.
      if (target.kind === "scene-heading") element.scrollTop = 0;
      const node = target.kind === "key" ? byKey(target.key) : heading;
      (node ?? heading)?.focus({ preventScroll: true });
    },
    focusHeading(): void {
      heading?.focus({ preventScroll: true });
    },
  };
}
