// Entry point of the Power_Server. Kiro starts it with
// `node ${PLUGIN_ROOT}/bundle/server.mjs` and talks MCP over stdio, so this
// process must never write anything else to its standard output.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPower } from "./createPower.js";
import { registerTools } from "./register.js";

// PLUGIN_DATA is the Power_Data_Folder given by Kiro.
const power = await createPower(process.env.PLUGIN_DATA, globalThis.fetch);

const server = new McpServer({ name: "haunted-repo", version: "0.0.0" });
registerTools(server, power);
await server.connect(new StdioServerTransport());
