// Feature: kiro-power, Property 4: Network allowlist
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createPower } from "./createPower.js";
import type { HauntedPower } from "./power.js";
import { createTestGitHub, type FakeRepo } from "./testGitHub.testutil.js";

const ts = (n: number): string => "const a = 1;\n".repeat(n);

// A repository the strict fake knows, with paths that need URL encoding.
const repo: FakeRepo = {
  owner: "o",
  repo: "r",
  files: {
    "src/index.ts": ts(40),
    "src/a b.ts": ts(5),
    "src/100%.ts": ts(8),
    "app.py": ts(20),
    "lib/Thing.java": ts(12),
  },
};
const GHOST_PATHS = Object.keys(repo.files);

/** One request as it reached the recorder, behind guardFetch. */
interface Seen {
  url: string;
  headers: Headers;
}

/** URLs a Student or a confused Tutor might send, many of them hostile. */
const urlArb = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom("https://github.com/o/r", "o/r") },
  fc.constantFrom(
    "github.com/o/r",
    "https://github.com/O/R.git",
    "https://github.com/o/r/tree/main/src",
    "https://api.github.com/repos/o/r",
    "https://api.github.com.evil.example/o/r",
    "https://evil.example/o/r",
    "http://github.com/o/r",
    "https://user:pass@github.com/o/r",
    "https://github.com@evil.example/o/r",
    "https://github.com/o/r?next=https://evil.example",
    "https://github.com/o/r#https://evil.example",
    "https://github.com/../../evil.example/x",
    "https://github.com/o/%2e%2e",
    "https://github.com/o/r/../../../x",
    "//evil.example/o/r",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "",
  ),
  fc.webUrl({ withQueryParameters: true, withFragments: true }),
  fc
    .tuple(fc.string({ maxLength: 12 }), fc.string({ maxLength: 12 }))
    .map(([owner, name]) => `https://github.com/${owner}/${name}`),
  fc.string({ maxLength: 40 }),
);

/** Ghost paths (which really reach GitHub) mixed with arbitrary text. */
const pathArb = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom(...GHOST_PATHS) },
  fc.constantFrom(
    "../../etc/passwd",
    "https://evil.example/x",
    "//evil.example/x",
    "%2e%2e/x",
    "src/a.ts?ref=evil",
    "src/a.ts#x",
    "src\\a.ts",
  ),
  fc.string({ maxLength: 30 }),
);

const textArb = fc.option(fc.string({ maxLength: 20 }), { nil: undefined });

const judgementArb = fc.oneof(
  fc.constantFrom(
    "Good.\nVERDICT: right",
    "Almost.\nVERDICT: half-right",
    "No.\nVERDICT: wrong",
    "VERDICT: dont-know",
    "https://evil.example\nVERDICT: right",
  ),
  fc.string({ maxLength: 30 }),
);

type Call = (power: HauntedPower) => Promise<unknown>;

const callArb: fc.Arbitrary<Call> = fc.oneof(
  fc
    .record({
      url: urlArb,
      knowsJava: fc.option(fc.boolean(), { nil: undefined }),
      replace: fc.option(fc.boolean(), { nil: undefined }),
    })
    .map(
      (input): Call =>
        (p) =>
          p.findGhosts(input),
    ),
  fc.record({ url: urlArb }).map(
    (input): Call =>
      (p) =>
        p.continueHouse(input),
  ),
  pathArb.map(
    (path): Call =>
      (p) =>
        p.pickGhost({ path }),
  ),
  fc
    .record({
      type: fc.constantFrom(
        "explanation-done",
        "self-check-answered",
        "retry-ghost",
        "leave-ghost",
      ),
      text: textArb,
      answer: fc.option(fc.constantFrom("yes", "half", "no"), {
        nil: undefined,
      }),
    })
    .map(
      (input): Call =>
        (p) =>
          p.sendEvent(input),
    ),
  fc
    .record({ question: fc.string({ maxLength: 20 }), judgement: judgementArb })
    .map(
      (input): Call =>
        (p) =>
          p.judgeAnswer(input),
    ),
  fc.constant<Call>((p) => p.houseStatus()),
);

describe("Property 4: network allowlist", () => {
  it("every request that passes guardFetch goes to https://api.github.com with no Authorization", async () => {
    // **Validates: Requirements 4.9, 7.7, 8.1, 8.2, 8.3, 8.4**
    let total = 0;
    let fileReads = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.array(callArb, { minLength: 1, maxLength: 12 }),
        fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
        async (calls, rateLimitAfter) => {
          const folder = await mkdtemp(join(tmpdir(), "haunted-allowlist-"));
          try {
            const github = createTestGitHub(
              [repo],
              rateLimitAfter === undefined ? {} : { rateLimitAfter },
            );
            const seen: Seen[] = [];
            // The recorder sits behind guardFetch: it sees only what passed.
            const recorder = ((
              input: string | URL | Request,
              init?: RequestInit,
            ) => {
              const request = input instanceof Request ? input : undefined;
              seen.push({
                url: request?.url ?? String(input),
                headers: new Headers(init?.headers ?? request?.headers),
              });
              return github.fetch(input, init);
            }) as typeof fetch;
            const power = await createPower(folder, recorder);

            for (const call of calls) await call(power);

            total += seen.length;
            fileReads += seen.filter((s) =>
              s.url.includes("/contents/"),
            ).length;
            for (const { url, headers } of seen) {
              const parsed = new URL(url);
              expect(parsed.origin).toBe("https://api.github.com");
              expect(parsed.username).toBe("");
              expect(parsed.password).toBe("");
              expect(headers.has("authorization")).toBe(false);
            }
          } finally {
            await rm(folder, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
    // The property is not empty: some calls really reached the fake GitHub.
    expect(total).toBeGreaterThan(0);
    expect(fileReads).toBeGreaterThan(0);
  });
});
