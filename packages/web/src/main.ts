import { detectGhosts } from "@haunted-repo/core";
import { parseDemoScript } from "./logic/demoScript.js";
import { createPage, type PageController } from "./logic/page.js";
import { loadSample } from "./sample/sampleData.js";
import reportJson from "./sample/report.json?raw";
import filesJson from "./sample/files.json?raw";
import demoScriptJson from "./sample/demo-script.json?raw";
import { createSimpleRenderer } from "./view/simple/renderer.js";
import "./view/simple/simple.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Page is missing #root");
}

const sample = loadSample(reportJson, filesJson);
// An invalid Demo_Script locks every sample ghost; the page still works.
const parsedScript = parseDemoScript(demoScriptJson);
const script = parsedScript.ok ? parsedScript.value : null;

// The callback runs only on user input, after `page` below exists.
const renderer = createSimpleRenderer(root, (action) => {
  void page.dispatch(action);
});
const page: PageController = createPage(
  { detect: (url) => detectGhosts(url), sample, script },
  renderer,
);
page.start();
