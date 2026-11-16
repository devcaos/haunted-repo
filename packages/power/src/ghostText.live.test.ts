import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPower } from "./createPower.js";
import type { ErrorAnswer } from "./power.js";

/** Fails the test with the same helpful text as the core live test. */
function fail(answer: ErrorAnswer): never {
  if (answer.code === "RATE_LIMITED") {
    const match = /resets at (.+?)\. Try again/.exec(answer.message);
    const reset = match?.[1] ?? answer.message;
    throw new Error(
      `GitHub rate limit reached (60 requests per hour without a token). Wait until the limit resets (${reset}) and run npm run test:live again.`,
    );
  }
  throw new Error(`${answer.code}: ${answer.message}`);
}

/** The Ghost_Text inside the fenced block of the explaining instructions. */
function ghostText(instructions: string, path: string): string | null {
  const start = instructions.indexOf(`Ghost: ${path}\n`);
  if (start === -1) return null;
  const rest = instructions.slice(start + `Ghost: ${path}\n`.length);
  const fence = /^`{3,}/.exec(rest)?.[0];
  if (fence === undefined) return null;
  const body = rest.slice(fence.length + 1);
  const end = body.indexOf(`\n${fence}`);
  return end === -1 ? null : body.slice(0, end);
}

// Calls the real GitHub API (no token), about 9 requests, through the same
// createPower (and so guardFetch) as server.ts. Run with `npm run test:live`.
describe("find_ghosts and pick_ghost against the real GitHub (lukeed/sirv)", () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "haunted-live-"));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it("reads the Ghost_Text of the first ghost", async () => {
    const power = await createPower(folder, globalThis.fetch);

    const found = await power.findGhosts({
      url: "https://github.com/lukeed/sirv",
    });
    if (!found.ok) fail(found);
    const first = found.ghosts[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    const picked = await power.pickGhost({ path: first.path });
    if (!picked.ok) fail(picked);
    expect(picked.step).toBe("explaining");
    const text = ghostText(picked.instructions, first.path);
    expect(text).not.toBeNull();
    expect(text?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
