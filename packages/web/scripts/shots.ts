// Run with: npm run shots   (root script)
// Hand-run only: npm run check, npm test and CI never run this file.
// Needs Chromium for Playwright, installed once with:
//   npx playwright@1.65.1 install chromium
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Route,
} from "playwright";
import {
  createServer,
  preview,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import { createFakeGitHub } from "../../core/src/ghost-detection/fakeGitHub.testutil.ts";

const webDir = fileURLToPath(new URL("..", import.meta.url));
const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
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
  const context = await step("open a browser context", async () => {
    const created = await browser.newContext();
    created.setDefaultTimeout(10_000);
    await routeNonLocal(created, fake);
    return created;
  });
  await context.close();
  await closeAll();
}

await main();
