// Smoke test of the committed bundle (design section 10): start
// bundle/server.mjs over stdio, the same way Kiro does, and check that it
// answers. It needs the bundle built by `npm run build`, which `npm run check`
// runs before `npm test`. It makes no network call.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const bundlePath = fileURLToPath(
  new URL("../bundle/server.mjs", import.meta.url),
);

const TOOL_NAMES = [
  "continue_house",
  "find_ghosts",
  "house_status",
  "judge_answer",
  "pick_ghost",
  "send_event",
];

describe("bundle/server.mjs over stdio", () => {
  let dataFolder: string;
  let client: Client;

  beforeAll(async () => {
    dataFolder = await mkdtemp(join(tmpdir(), "haunted-power-smoke-"));
    const transport = new StdioClientTransport({
      // process.execPath is the running node, so this also works on Windows.
      command: process.execPath,
      args: [bundlePath],
      // The transport only passes a safe subset of the environment, so add
      // PLUGIN_DATA explicitly, as Kiro does.
      env: { ...getDefaultEnvironment(), PLUGIN_DATA: dataFolder },
      stderr: "pipe",
    });
    client = new Client({ name: "smoke-test", version: "0.0.0" });
    await client.connect(transport);
    // Starting a node process can be slow on a busy CI runner, so allow more
    // than the default 10 s hook timeout.
  }, 30_000);

  afterAll(async () => {
    await client?.close();
    if (dataFolder) {
      await rm(dataFolder, { recursive: true, force: true });
    }
  });

  it("lists exactly the six tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(TOOL_NAMES);
  });

  it("answers house_status with NO_SESSION when there is no session", async () => {
    const result = await client.callTool({
      name: "house_status",
      arguments: {},
    });
    expect(result.isError).toBe(true);
    const content = result.content as { type: string; text: string }[];
    const data = JSON.parse(content[1]?.text ?? "") as { code: string };
    expect(data.code).toBe("NO_SESSION");
  });

  it("contains no test files", async () => {
    const text = await readFile(bundlePath, "utf8");
    // Look for test FILE NAMES (for example `engine.test.ts` or
    // `fakeGitHub.testutil.js`), not the bare text ".test.": the bundled SDK
    // legitimately contains `RegExp.prototype.test.bind(...)`.
    expect(text).not.toMatch(/[\w-]+\.(test|testutil)\.(ts|js|mjs)\b/);
  });
});
