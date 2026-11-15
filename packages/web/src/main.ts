import { detectGhosts } from "@haunted-repo/core";
import { createPage, type PageController } from "./logic/page.js";
import { loadSample } from "./sample/sampleData.js";
import reportJson from "./sample/report.json?raw";
import filesJson from "./sample/files.json?raw";
import { createSimpleRenderer } from "./view/simple/renderer.js";
import "./view/simple/simple.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Page is missing #root");
}

const sample = loadSample(reportJson, filesJson);

// The callback runs only on user input, after `page` below exists.
const renderer = createSimpleRenderer(root, (action) => {
  void page.dispatch(action);
});
const page: PageController = createPage(
  { detect: (url) => detectGhosts(url), sample },
  renderer,
);
page.start();
