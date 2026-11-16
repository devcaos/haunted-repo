/** Strict fake GitHub for Power tests (tests only). */
import { createFakeGitHub } from "core-testutil/ghost-detection/fakeGitHub.testutil.js";
import type {
  FakeFetch,
  FakeGitHubOptions,
  FakeRepo,
} from "core-testutil/ghost-detection/fakeGitHub.testutil.js";

export type { FakeGitHubOptions, FakeRepo };

export interface TestGitHub {
  /** The fetch to inject into the Power. */
  fetch: typeof fetch;
  /** The strict fake behind it, for `requestCount`. */
  fake: FakeFetch;
}

/**
 * Wraps the strict core fake. The real client sends no User-Agent (Node adds
 * one), so the wrapper sets `User-Agent: vitest`, as detectGhosts.test.ts does.
 * Nothing else changes: every other check of the fake still applies.
 */
export function createTestGitHub(
  repos: FakeRepo[],
  options: FakeGitHubOptions = {},
): TestGitHub {
  const fake = createFakeGitHub(repos, options);
  const wrapped = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "vitest");
    return fake(input, { ...init, headers });
  }) as typeof fetch;
  return { fetch: wrapped, fake };
}
