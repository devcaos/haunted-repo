import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// Runs the spike server the way mcp.json does (node + the .ts file) and calls the tool once.
it("answers tools/call with its working directory", async () => {
  const file = fileURLToPath(new URL("./server.ts", import.meta.url));
  const child = spawn(process.execPath, [file], {
    stdio: ["pipe", "pipe", "ignore"],
  });
  const lines: string[] = [];
  const done = new Promise<string>((resolve) => {
    child.stdout.on("data", (chunk: Buffer) => {
      lines.push(...chunk.toString().split("\n").filter(Boolean));
      if (lines.length >= 2) resolve(lines[1] ?? "");
    });
  });
  const init = { protocolVersion: "2025-06-18", capabilities: {} };
  child.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: init,
    }) + "\n",
  );
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call" }) + "\n",
  );
  const reply = JSON.parse(await done) as {
    result: { content: { text: string }[] };
  };
  child.kill();
  const info = JSON.parse(reply.result.content[0]?.text ?? "{}") as {
    cwd: string;
  };
  expect(info.cwd).toBe(process.cwd());
});
