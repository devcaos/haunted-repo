// Network allowlist: the Power_Server may only talk to the GitHub REST API.
// Pure module: no SDK, no disk. The inner fetch is injected.

export const ALLOWED_ORIGIN = "https://api.github.com";

export class ForbiddenUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenUrlError";
  }
}

/** Thrown when GitHub answers with a redirect (3xx), which is never followed. */
export class RedirectRefusedError extends Error {
  constructor() {
    super(
      "Request refused: GitHub answered with a redirect, and the Power does not follow redirects. If the repository was renamed or moved, use its new URL.",
    );
    this.name = "RedirectRefusedError";
  }
}

// Reads the URL of any fetch input form: string, URL or Request.
function inputUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

// Node's fetch with redirect "error" rejects a 3xx with
// TypeError("fetch failed") whose cause message is "unexpected redirect".
function isRedirectError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const cause: unknown = error.cause;
  return cause instanceof Error && cause.message === "unexpected redirect";
}

// Returns a fetch that refuses, without calling the inner fetch, any URL that
// does not parse or whose origin is not exactly https://api.github.com.
// The input is passed on unchanged and the init only gets redirect "error",
// so a 3xx never takes a request off api.github.com. No header is ever added.
export function guardFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    let url: URL;
    try {
      url = new URL(inputUrl(input));
    } catch {
      throw new ForbiddenUrlError("Request refused: the URL does not parse.");
    }
    if (url.origin !== ALLOWED_ORIGIN) {
      throw new ForbiddenUrlError(
        `Request refused: only ${ALLOWED_ORIGIN} is allowed.`,
      );
    }
    try {
      return await inner(input, { ...init, redirect: "error" });
    } catch (error) {
      if (isRedirectError(error)) throw new RedirectRefusedError();
      throw error;
    }
  };
}
