import { detectGhosts } from "@haunted-repo/core";
import { createCheckHandler } from "./checkButton.js";

const button = document.getElementById("check-button");
const status = document.getElementById("status");

if (!(button instanceof HTMLButtonElement) || status === null) {
  throw new Error("Page is missing #check-button or #status");
}

const handler = createCheckHandler(detectGhosts, {
  setBusy: (busy) => {
    button.disabled = busy;
  },
  setStatus: (text) => {
    status.textContent = text;
  },
});

button.addEventListener("click", () => {
  void handler();
});
