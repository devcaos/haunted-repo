// Entry point of the Power_Server. Kiro starts it with
// `node ${PLUGIN_ROOT}/bundle/server.mjs` and talks MCP over stdio, so this
// process must never write anything else to its standard output.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./register.js";

// The Power_Data_Folder given by Kiro. Used by the store in a later task.
const pluginData = process.env.PLUGIN_DATA;
void pluginData;

const server = new McpServer({ name: "haunted-repo", version: "0.0.0" });
registerTools(server);
await server.connect(new StdioServerTransport());
