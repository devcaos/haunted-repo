import { describe, expect, it } from "vitest";
import { createTestGitHub } from "./testGitHub.testutil.js";

const repo = { owner: "o", repo: "r", files: { "src/a.ts": "export {};\n" } };
const ACCEPT = { Accept: "application/vnd.github.raw+json" };

describe("createTestGitHub", () => {
  it("adds a User-Agent so a valid request succeeds", async () => {
    const { fetch, fake } = createTestGitHub([repo]);
    const response = await fetch(
      "https://api.github.com/repos/o/r/contents/src/a.ts",
      { headers: ACCEPT },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("export {};\n");
    expect(fake.requestCount).toBe(1);
  });

  it("still rejects an unknown path", async () => {
    const { fetch } = createTestGitHub([repo]);
    const response = await fetch(
      "https://api.github.com/repos/o/r/contents/src/missing.ts",
      { headers: ACCEPT },
    );
    expect(response.status).toBe(404);
  });

  it("still rejects a request without an Accept header", async () => {
    const { fetch } = createTestGitHub([repo]);
    const response = await fetch("https://api.github.com/repos/o/r");
    expect(response.status).toBe(400);
  });

  it("still rejects a method other than GET", async () => {
    const { fetch } = createTestGitHub([repo]);
    const response = await fetch("https://api.github.com/repos/o/r", {
      method: "POST",
      headers: ACCEPT,
    });
    expect(response.status).toBe(405);
  });
});
