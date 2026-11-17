import { detectGhosts } from "@haunted-repo/core";
import { parseDemoScript } from "./logic/demoScript.js";
import { createPage, type PageController } from "./logic/page.js";
import { TEXTS } from "./logic/texts.js";
import { loadSample } from "./sample/sampleData.js";
import reportJson from "./sample/report.json?raw";
import filesJson from "./sample/files.json?raw";
import demoScriptJson from "./sample/demo-script.json?raw";
import { chooseView } from "./viewChoice.js";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Page is missing #root");
}
const pageRoot = root;

const sample = loadSample(reportJson, filesJson);
// An invalid Demo_Script locks every sample ghost; the page still works.
const parsedScript = parseDemoScript(demoScriptJson);
const script = parsedScript.ok ? parsedScript.value : null;

// One renderer per page load. This file imports no CSS: each entry brings its
// own, so the other renderer never receives it (Requirements 1.9, 1.10).
const entry =
  chooseView(window.location.search) === "scenic"
    ? import("./view/scenic/entry.js")
    : import("./view/simpleEntry.js");

entry.then(
  ({ createRenderer }) => {
    // The callback runs only on user input, after `page` below exists.
    const renderer = createRenderer(pageRoot, (action) => {
      void page.dispatch(action);
    });
    const page: PageController = createPage(
      { detect: (url) => detectGhosts(url), sample, script },
      renderer,
    );
    page.start();
  },
  () => {
    pageRoot.textContent = TEXTS.viewLoadFailed;
  },
);
