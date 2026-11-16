// Checks the Power manifest files against Requirements 1.1 to 1.4: plugin.json,
// mcp.json and the front matter of the Tutor_Skill. It only reads local files.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function powerFile(relativePath: string): string {
  return fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
}

async function readJson(
  relativePath: string,
): Promise<Record<string, unknown>> {
  const text = await readFile(powerFile(relativePath), "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

// Minimal front matter reader: the text between the first two `---` lines,
// one `key: value` pair per line. Enough for the two single-line fields of
// SKILL.md, so no YAML library is needed.
function readFrontMatter(text: string): Record<string, string> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") return {};
  const end = lines.indexOf("---", 1);
  if (end === -1) return {};
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return fields;
}

describe("plugin.json", () => {
  it("has the fields of kiro.dev/docs/powers/create (1.1)", async () => {
    const plugin = await readJson("plugin.json");
    expect(plugin.$schema).toBe(
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    );
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(plugin.version).toBe("0.1.0");
    expect(typeof plugin.description).toBe("string");
    expect((plugin.description as string).length).toBeGreaterThan(0);
    const author = plugin.author as { name?: unknown };
    expect(typeof author.name).toBe("string");
    expect((author.name as string).length).toBeGreaterThan(0);
  });

  it("has the beginner keywords and no spike keyword (1.2)", async () => {
    const plugin = await readJson("plugin.json");
    const keywords = plugin.keywords as string[];
    expect(Array.isArray(keywords)).toBe(true);
    for (const word of [
      "haunted",
      "ghost",
      "exorcise",
      "exorcism",
      "understand code",
    ]) {
      expect(keywords).toContain(word);
    }
    expect(keywords).not.toContain("haunted spike");
  });
});

describe("mcp.json", () => {
  it("declares one stdio server with the bundle and no env (1.3)", async () => {
    const mcp = await readJson("mcp.json");
    const servers = mcp.mcpServers as Record<string, Record<string, unknown>>;
    const entries = Object.values(servers);
    expect(entries).toHaveLength(1);
    const [server = {}] = entries;
    expect(server.type).toBe("stdio");
    expect(server.command).toBe("node");
    expect(server.args).toEqual(["${PLUGIN_ROOT}/bundle/server.mjs"]);
    expect(server).not.toHaveProperty("env");
  });
});

describe("skills/exorcise-ghosts/SKILL.md", () => {
  it("has the front matter fields name and description (1.4)", async () => {
    const text = await readFile(
      powerFile("skills/exorcise-ghosts/SKILL.md"),
      "utf8",
    );
    const fields = readFrontMatter(text);
    expect(fields.name).toBe("exorcise-ghosts");
    expect(fields.description).toBeDefined();
    expect((fields.description ?? "").length).toBeGreaterThan(0);
  });
});
