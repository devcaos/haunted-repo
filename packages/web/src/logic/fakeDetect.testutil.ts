/** Test helper: Core's strict fake GitHub, with the User-Agent that Node and browsers add. */
import { createFakeGitHub } from "../../../core/src/ghost-detection/fakeGitHub.testutil.js";
import type {
  FakeGitHubOptions,
  FakeRepo,
} from "../../../core/src/ghost-detection/fakeGitHub.testutil.js";

export type { FakeGitHubOptions, FakeRepo };

export interface FakeFetchHandle {
  /** Pass this as the `fetch` option of Core. */
  fetch: typeof fetch;
  /** Requests the strict fake has answered. */
  requestCount: () => number;
  /** Every requested URL, in order. */
  urls: string[];
}

/**
 * Core's client sends no User-Agent; Node and browsers add one. This wrapper adds
 * `User-Agent: vitest` the same way. The strict fake itself is not changed.
 */
export function createFakeFetch(
  repos: FakeRepo[],
  options: FakeGitHubOptions = {},
): FakeFetchHandle {
  const fake = createFakeGitHub(repos, options);
  const urls: string[] = [];
  const wrapped = ((input: string | URL | Request, init?: RequestInit) => {
    urls.push(input instanceof Request ? input.url : String(input));
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "vitest");
    return fake(input, { ...init, headers });
  }) as typeof fetch;
  return { fetch: wrapped, requestCount: () => fake.requestCount, urls };
}
