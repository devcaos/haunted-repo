// PROTOTYPE (proto/scenic-demo): an immersive view with one room. Not merged.
// It only reads the committed Demo_Script; it never calls the exorcism engine.
import type { DemoScript } from "../../logic/demoScript.js";
import { el } from "../simple/dom.js";
import darkUrl from "./img/corte-oscuro.jpg";
import litUrl from "./img/corte-encendido.jpg";
import "./scenic.css";

const FALLBACK = {
  path: "a file nobody has read",
  explanation:
    "I am a piece of code an AI wrote. It works, but nobody has read me yet.",
  question: "What do you think I do when someone runs me?",
  modelAnswer: "Read me slowly, line by line, and you will find out.",
};

/** Replaces everything inside root with the scenic house. */
export function mountScenic(
  root: HTMLElement,
  script: DemoScript | null,
): void {
  const ghost = script?.ghosts[0];
  const path = ghost?.path ?? FALLBACK.path;
  const explanation = ghost?.explanation ?? FALLBACK.explanation;
  const question = ghost?.questions[0] ?? FALLBACK.question;
  const modelAnswer = ghost?.modelAnswers[0] ?? FALLBACK.modelAnswer;

  document.body.classList.add("scenic-body");

  const room = el(
    "button",
    {
      type: "button",
      class: "scenic-room",
      "aria-label": `Attic: the ghost of ${path} is waiting. Enter the room.`,
      "aria-haspopup": "dialog",
    },
    [],
  );

  const stage = el("div", { class: "scenic-stage" }, [
    el("img", { class: "scenic-img", src: darkUrl, alt: "" }),
    el("img", { class: "scenic-img scenic-lit", src: litUrl, alt: "" }),
    el("div", { class: "scenic-fog", "aria-hidden": "true" }),
    el("div", { class: "scenic-rain", "aria-hidden": "true" }),
    room,
  ]);

  // The scroll: a native <dialog> gives focus trapping and Escape for free.
  const reply = el("p", { class: "scroll-reply", "aria-live": "polite" });
  const answer = el("textarea", {
    id: "scroll-answer",
    class: "scroll-answer",
    rows: "3",
    placeholder: "Write your answer in the ink…",
  });
  const form = el("form", { class: "scroll-form" }, [
    el("label", { for: "scroll-answer", class: "scroll-label" }, [question]),
    answer,
    el("button", { type: "submit", class: "scroll-ink" }, ["Answer the ghost"]),
  ]);
  const leave = el("button", { type: "button", class: "scroll-leave" }, [
    "Leave the attic",
  ]);
  const dialog = el(
    "dialog",
    { class: "scroll", "aria-labelledby": "scroll-title" },
    [
      el("div", { class: "scroll-paper" }, [
        el("h2", { id: "scroll-title", class: "scroll-title" }, [
          `The ghost of ${path} whispers`,
        ]),
        el("p", { class: "scroll-speech" }, [explanation]),
        form,
        reply,
        leave,
      ]),
    ],
  );

  room.addEventListener("click", () => {
    dialog.showModal();
    answer.focus();
  });
  leave.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => room.focus());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = answer.value.trim();
    reply.textContent =
      text === ""
        ? "The ghost waits. Write something, even “I don't know”."
        : `The candle flickers. In this demo nobody judges your words. This is what I would have said: ${modelAnswer}`;
  });

  root.replaceChildren(
    el("main", { class: "scenic" }, [
      el("h1", { class: "scenic-hidden" }, ["Haunted Repo: the haunted house"]),
      stage,
    ]),
    dialog,
  );
}
