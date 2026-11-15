// Tracer spike server (kiro-power, Requirement 0). It has no dependencies and
// uses only erasable TypeScript, so Node 24 runs this file straight from the
// GitHub checkout of the Power, with no `npm ci` and no build.
// MCP over stdio: one JSON-RPC message per line.
import { createInterface } from "node:readline";

type Message = {
  id?: number | string;
  method?: string;
  params?: { protocolVersion?: string; capabilities?: { roots?: unknown } };
  result?: unknown;
  error?: unknown;
};

const TOOL = "spike_where_am_i";
let clientHasRoots = false;
let nextId = 1;
const waiting = new Map<number | string, (m: Message) => void>();

function send(m: object): void {
  process.stdout.write(JSON.stringify(m) + "\n");
}

// Ask the client for its workspace folders (MCP "roots"), if it offers them.
function askRoots(): Promise<unknown> {
  if (!clientHasRoots) {
    return Promise.resolve("the client did not declare the roots capability");
  }
  const id = `roots-${nextId++}`;
  send({ jsonrpc: "2.0", id, method: "roots/list" });
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiting.delete(id);
      resolve("no answer to roots/list within 3 s");
    }, 3000);
    waiting.set(id, (m) => {
      clearTimeout(timer);
      resolve(m.result ?? m.error);
    });
  });
}

async function whereAmI(): Promise<object> {
  return {
    cwd: process.cwd(),
    roots: await askRoots(),
    argv: process.argv,
    node: process.version,
    platform: process.platform,
    env: {
      PLUGIN_ROOT: process.env.PLUGIN_ROOT ?? null,
      PLUGIN_DATA: process.env.PLUGIN_DATA ?? null,
      PWD: process.env.PWD ?? null,
      INIT_CWD: process.env.INIT_CWD ?? null,
    },
  };
}

async function handle(m: Message): Promise<void> {
  if (m.method === undefined) {
    if (m.id !== undefined) waiting.get(m.id)?.(m);
    return;
  }
  if (m.id === undefined) return; // a notification, such as notifications/initialized
  const reply = (result: unknown) => send({ jsonrpc: "2.0", id: m.id, result });
  switch (m.method) {
    case "initialize":
      clientHasRoots = m.params?.capabilities?.roots !== undefined;
      reply({
        protocolVersion: m.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "haunted-repo-spike", version: "0.0.1" },
      });
      return;
    case "ping":
      reply({});
      return;
    case "tools/list":
      reply({
        tools: [
          {
            name: TOOL,
            description:
              "Returns the working directory of the Haunted Repo server and the workspace folders it can see.",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      });
      return;
    case "tools/call": {
      const text = JSON.stringify(await whereAmI(), null, 2);
      reply({ content: [{ type: "text", text }] });
      return;
    }
    default:
      send({
        jsonrpc: "2.0",
        id: m.id,
        error: { code: -32601, message: `Method not found: ${m.method}` },
      });
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (line.trim() === "") return;
  try {
    void handle(JSON.parse(line) as Message);
  } catch {
    send({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    });
  }
});
