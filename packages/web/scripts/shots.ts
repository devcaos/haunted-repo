// Run with: npm run shots   (root script)
// Hand-run only: npm run check, npm test and CI never run this file.
// Needs Chromium for Playwright, installed once with:
//   npx playwright@1.65.1 install chromium
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Floor } from "@haunted-repo/core";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Route,
} from "playwright";
import {
  createServer,
  preview,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import {
  SHOT_SIZES,
  shotFileName,
  type ShotSize,
  type ShotState,
} from "../src/tooling/shotList.ts";
import { TEXTS } from "../src/logic/texts.ts";
import { createFakeGitHub } from "../../core/src/ghost-detection/fakeGitHub.testutil.ts";

const webDir = fileURLToPath(new URL("..", import.meta.url));
const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
const shotsDir = fileURLToPath(new URL("../shots", import.meta.url));
const PREVIEW_PORT = 4179;
const DEV_PORT = 5179;
export const PREVIEW_ORIGIN = `http://localhost:${PREVIEW_PORT}`;
export const DEV_ORIGIN = `http://localhost:${DEV_PORT}`;
const MISSING_CHROMIUM =
  "Chromium for Playwright is not installed. Run: npx playwright install chromium";

const CORS_PREFLIGHT = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "accept, x-github-api-version",
};
const CORS_ANSWER = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers":
    "x-ratelimit-remaining, x-ratelimit-reset, retry-after",
};

interface Cleanup {
  browser: Browser | null;
  devServer: ViteDevServer | null;
  previewServer: PreviewServer["httpServer"] | null;
}
const cleanup: Cleanup = {
  browser: null,
  devServer: null,
  previewServer: null,
};

async function closeAll(): Promise<void> {
  const { browser, devServer, previewServer } = cleanup;
  cleanup.browser = null;
  cleanup.devServer = null;
  cleanup.previewServer = null;
  await browser?.close().catch(() => undefined);
  await devServer?.close().catch(() => undefined);
  if (previewServer !== null) {
    if ("closeAllConnections" in previewServer) {
      previewServer.closeAllConnections();
    }
    await new Promise<void>((resolve) => previewServer.close(() => resolve()));
  }
}

/** Runs one named step; a failure prints its name, cleans up and exits 1. */
async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Shots failed at step "${name}": ${message}`);
    await closeAll();
    process.exit(1);
  }
}

// The busy shot holds the fake GitHub's answers until `release()` is called.
let hold: Promise<void> | null = null;
/** Holds every answer of the fake GitHub. Call the result to let them go. */
export function holdGitHub(): () => void {
  let release: () => void = () => undefined;
  hold = new Promise<void>((resolve) => {
    release = () => {
      hold = null;
      resolve();
    };
  });
  return release;
}

/** The committed sample files of lukeed/sirv, the only repository the fake knows. */
function loadSirvFiles(): Promise<Record<string, string>> {
  const text = readFileSync(
    fileURLToPath(new URL("../src/sample/files.json", import.meta.url)),
    "utf8",
  );
  const data = JSON.parse(text) as { texts: Record<string, string> };
  return Promise.resolve(data.texts);
}
async function routeNonLocal(
  context: BrowserContext,
  fake: ReturnType<typeof createFakeGitHub>,
): Promise<void> {
  await context.route("**/*", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === PREVIEW_ORIGIN || url.origin === DEV_ORIGIN) {
      await route.continue();
      return;
    }
    if (url.origin !== "https://api.github.com") {
      await route.abort();
      return;
    }
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_PREFLIGHT });
      return;
    }
    const headers = new Headers(request.headers());
    if (!headers.has("user-agent"))
      headers.set("User-Agent", "playwright-shots");
    if (hold !== null) await hold;
    const answer = await fake(request.url(), {
      method: request.method(),
      headers,
    });
    await route.fulfill({
      status: answer.status,
      headers: { ...Object.fromEntries(answer.headers), ...CORS_ANSWER },
      body: Buffer.from(await answer.arrayBuffer()),
    });
  });
}

/** True when no finite animation or transition is still running. */
function noFiniteMotion(): boolean {
  return document
    .getAnimations()
    .every(
      (a) =>
        a.playState !== "running" ||
        !Number.isFinite(a.effect?.getComputedTiming().endTime as number),
    );
}

interface CheckResult {
  problems: string[];
  warnings: string[];
}

/** Runs inside the page: the required checks and the warnings of the design. */
function runChecks(): CheckResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  const running = document
    .getAnimations()
    .filter((a) => a.playState === "running").length;
  if (running > 15)
    problems.push(`${running} animations are running (max 15).`);
  for (const node of document.querySelectorAll("*")) {
    const filtered =
      node.hasAttribute("filter") || getComputedStyle(node).filter !== "none";
    if (filtered && node.getAnimations({ subtree: true }).length > 0) {
      problems.push(`A filtered element has animations: <${node.localName}>.`);
    }
  }
  for (const svg of document.querySelectorAll("svg")) {
    if (svg.getAttribute("aria-hidden") !== "true") {
      warnings.push("An svg has no aria-hidden.");
    }
    if (svg.querySelector("a[href], button, input, [tabindex]") !== null) {
      warnings.push("A focusable element is inside an svg.");
    }
  }
  for (const node of document.querySelectorAll("button, a[href]")) {
    const box = node.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    if (
      getComputedStyle(node).display !== "inline" &&
      (box.width < 44 || box.height < 44)
    ) {
      warnings.push(
        `Small target (${Math.round(box.width)}x${Math.round(box.height)}): ${node.textContent?.trim().slice(0, 30) ?? ""}`,
      );
    }
  }
  const root = document.documentElement;
  if (window.innerWidth <= 390 && root.scrollWidth > root.clientWidth) {
    warnings.push("The page scrolls horizontally.");
  }
  return { problems, warnings };
}
async function main(): Promise<void> {
  if (!existsSync(fileURLToPath(new URL("../dist", import.meta.url)))) {
    console.error("packages/web/dist was not found. Run npm run build first.");
    process.exit(1);
  }
  process.once("SIGINT", () => {
    void closeAll().then(() => process.exit(130));
  });
  await step("start the preview server", async () => {
    const server = await preview({
      root: webDir,
      configFile,
      preview: { port: PREVIEW_PORT, strictPort: true },
    });
    cleanup.previewServer = server.httpServer;
  });
  await step("start the dev server", async () => {
    const server = await createServer({
      root: webDir,
      configFile,
      server: { port: DEV_PORT, strictPort: true },
    });
    await server.listen();
    cleanup.devServer = server;
  });
  const browser = await step("launch Chromium", async () => {
    try {
      return await chromium.launch();
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      throw new Error(
        /Executable doesn't exist/.test(text) ? MISSING_CHROMIUM : text,
        { cause: error },
      );
    }
  });
  cleanup.browser = browser;
  const files = await step("read the sample files", loadSirvFiles);
  const fake = createFakeGitHub([{ owner: "lukeed", repo: "sirv", files }]);
  mkdirSync(shotsDir, { recursive: true });
  let written = 0;
  let failedChecks = 0;
  const shoot = async (
    context: BrowserContext,
    state: ShotState,
    size: ShotSize,
    url: string,
    ready: string,
    fullPage = false,
    act?: (page: Page) => Promise<void>,
  ): Promise<void> => {
    const fileName = shotFileName(state, size);
    await step(fileName, async () => {
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      await page.goto(url);
      await page.waitForSelector(ready);
      if (act !== undefined) await act(page);
      await page.waitForFunction(noFiniteMotion);
      const result = await page.evaluate(runChecks);
      for (const warning of result.warnings) {
        console.warn(`Warning in ${fileName}: ${warning}`);
      }
      for (const problem of result.problems) {
        console.error(`Check failed in ${fileName}: ${problem}`);
        failedChecks++;
      }
      await page.screenshot({
        path: join(shotsDir, fileName),
        animations: "disabled",
        fullPage,
      });
      written++;
      await page.close();
    });
  };
  for (const size of SHOT_SIZES) {
    const viewport = { width: size.width, height: size.height };
    const normal = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
    });
    const reduced = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    for (const context of [normal, reduced]) {
      context.setDefaultTimeout(10_000);
      await routeNonLocal(context, fake);
    }
    const house = `${PREVIEW_ORIGIN}/haunted-repo/?view=scenic`;
    await shoot(normal, "01-house", size, house, "svg.house");
    // Floors are reached the way a visitor does: a click on the floor button of the House.
    const goTo = (floor: Floor, title: string) => async (page: Page) => {
      await page.click(`nav.floor-stair button:has-text("${title}")`);
      await page.waitForSelector(
        `main.stage[data-scene="floor"][data-floor="${floor}"]`,
      );
      await page.waitForSelector("ul.nameplates:not([hidden])");
    };
    // The Nameplates sit under the stage on narrow screens, so those shots are full page.
    const tall = size.width < 1024;
    const floors: [ShotState, Floor, string][] = [
      ["02-floor-attic", "attic", TEXTS.floorTitles.attic],
      ["03-floor-middle", "middle floor", TEXTS.floorTitles["middle floor"]],
      ["04-floor-basement", "basement", TEXTS.floorTitles.basement],
    ];
    for (const [state, floor, title] of floors) {
      await shoot(
        normal,
        state,
        size,
        house,
        "nav.floor-stair button",
        tall,
        goTo(floor, title),
      );
    }
    await shoot(reduced, "16-reduced-house", size, house, "svg.house");
    await shoot(
      reduced,
      "17-reduced-floor-attic",
      size,
      house,
      "nav.floor-stair button",
      tall,
      goTo("attic", TEXTS.floorTitles.attic),
    );
    await shoot(
      normal,
      "19-gallery",
      size,
      `${DEV_ORIGIN}/haunted-repo/gallery.html`,
      "svg.gallery-art",
      true,
    );
    await normal.close();
    await reduced.close();
  }
  await closeAll();
  console.log(`Wrote ${written} PNG files to packages/web/shots/`);
  if (failedChecks > 0) process.exit(1);
}
await main();
