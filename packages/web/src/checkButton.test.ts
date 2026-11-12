import { detectGhosts } from "@haunted-repo/core";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeGitHub } from "../../core/src/ghost-detection/fakeGitHub.testutil.js";
import {
  SAMPLE_REPO_URL,
  createCheckHandler,
  formatResult,
} from "./checkButton.js";
import type { CheckView, DetectFn } from "./checkButton.js";

type Outcome = Awaited<ReturnType<DetectFn>>;

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network is forbidden in tests");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A view that records every call, in order. */
function recordingView() {
  const calls: string[] = [];
  const statuses: string[] = [];
  const view: CheckView = {
    setBusy: (busy) => calls.push(`busy:${busy}`),
    setStatus: (text) => {
      calls.push("status");
      statuses.push(text);
    },
  };
  return { view, calls, statuses };
}

/** The real client sends no User-Agent; Node and browsers add one. The wrapper does the same. */
function detectWithFake(repos: Parameters<typeof createFakeGitHub>[0]): {
  detect: DetectFn;
  requestCount: () => number;
} {
  const fake = createFakeGitHub(repos);
  const wrapped = ((input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "vitest");
    return fake(input, { ...init, headers });
  }) as typeof fetch;
  return {
    detect: (url) => detectGhosts(url, { fetch: wrapped }),
    requestCount: () => fake.requestCount,
  };
}

describe("check button with the strict fake GitHub", () => {
  it("shows the ghost count on success", async () => {
    const { detect, requestCount } = detectWithFake([
      {
        owner: "lukeed",
        repo: "sirv",
        files: { "src/index.ts": "export const a = 1;\n" },
      },
    ]);
    const { view, statuses } = recordingView();
    await createCheckHandler(detect, view)();
    expect(statuses.at(-1)).toBe("Ghosts found: 1");
    expect(requestCount()).toBeGreaterThan(0);
  });

  it("shows the error message when the repo is not found", async () => {
    const { detect } = detectWithFake([]);
    const direct = await detect(SAMPLE_REPO_URL);
    expect(direct.ok).toBe(false);
    if (direct.ok) return;
    expect(direct.error.code).toBe("REPO_NOT_FOUND");

    const { view, statuses } = recordingView();
    await createCheckHandler(detect, view)();
    expect(statuses.at(-1)).toBe(`Error: ${direct.error.message}`);
  });
});

describe("check button logic", () => {
  it("passes SAMPLE_REPO_URL to detect", async () => {
    const detect = vi.fn<DetectFn>(async () => ({
      ok: true,
      value: { ghosts: [] },
    }));
    await createCheckHandler(detect, recordingView().view)();
    expect(detect).toHaveBeenCalledExactlyOnceWith(SAMPLE_REPO_URL);
  });

  it("shows 0 for zero ghosts and not an error", () => {
    const text = formatResult({ ok: true, value: { ghosts: [] } });
    expect(text).toContain("0");
    expect(text).not.toContain("Error");
  });

  it("shows a generic message when detect throws", async () => {
    const { view, statuses } = recordingView();
    await createCheckHandler(() => Promise.reject(new Error("boom")), view)();
    expect(statuses.at(-1)).toBe("Unexpected error. Please try again.");
  });
});

const errorCodes = [
  "INVALID_URL",
  "REPO_NOT_FOUND",
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "EMPTY_REPO",
  "NO_SUPPORTED_FILES",
  "INVALID_REPORT",
] as const;

const outcomeArb: fc.Arbitrary<Outcome> = fc.oneof(
  fc
    .array(fc.anything())
    .map((ghosts): Outcome => ({ ok: true, value: { ghosts } })),
  fc
    .record({ code: fc.constantFrom(...errorCodes), message: fc.string() })
    .map((error): Outcome => ({ ok: false, error })),
);

describe("properties", () => {
  // Feature: pages-deploy, Property 1: Status text shows the count or the message
  // **Validates: Requirements 2.4, 2.5, 5.4**
  it("Property 1: status shows the count or the message", async () => {
    await fc.assert(
      fc.asyncProperty(outcomeArb, async (outcome) => {
        const { view, statuses } = recordingView();
        await createCheckHandler(async () => outcome, view)();
        const text = statuses.at(-1) ?? "";
        if (outcome.ok) {
          expect(text).toContain(String(outcome.value.ghosts.length));
        } else {
          expect(text).toContain(outcome.error.message);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pages-deploy, Property 2: Busy while running, idle afterwards
  // **Validates: Requirements 2.6, 2.7**
  it("Property 2: busy before detect, idle at the end", async () => {
    const detectOutcomeArb = fc.oneof(
      outcomeArb.map((o) => ({ kind: "result" as const, o })),
      fc.constant({ kind: "throw" as const }),
    );
    await fc.assert(
      fc.asyncProperty(detectOutcomeArb, async (planned) => {
        const { view, calls } = recordingView();
        const detect: DetectFn = async () => {
          calls.push("detect");
          if (planned.kind === "throw") throw new Error("boom");
          return planned.o;
        };
        await createCheckHandler(detect, view)();
        expect(calls.indexOf("busy:true")).toBeGreaterThanOrEqual(0);
        expect(calls.indexOf("busy:true")).toBeLessThan(
          calls.indexOf("detect"),
        );
        const busyCalls = calls.filter((c) => c.startsWith("busy:"));
        expect(busyCalls.at(-1)).toBe("busy:false");
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pages-deploy, Property 3: Extra clicks never start a second check
  // **Validates: Requirements 2.3, 2.6**
  it("Property 3: extra clicks never start a second check", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 20 }), async (extra) => {
        let release: () => void = () => {};
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const detect = vi.fn<DetectFn>(async () => {
          await gate;
          return { ok: true, value: { ghosts: [] } };
        });
        const handler = createCheckHandler(detect, recordingView().view);

        const first = handler();
        const more = Array.from({ length: extra }, () => handler());
        release();
        await Promise.all([first, ...more]);
        expect(detect).toHaveBeenCalledTimes(1);

        await handler();
        expect(detect).toHaveBeenCalledTimes(2);
      }),
      { numRuns: 100 },
    );
  });
});
