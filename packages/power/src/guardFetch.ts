// Network allowlist: the Power_Server may only talk to the GitHub REST API.
// Pure module: no SDK, no disk. The inner fetch is injected.

export const ALLOWED_ORIGIN = "https://api.github.com";

export class ForbiddenUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenUrlError";
  }
}

// Reads the URL of any fetch input form: string, URL or Request.
function inputUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

// Returns a fetch that refuses, without calling the inner fetch, any URL that
// does not parse or whose origin is not exactly https://api.github.com.
// The input and init are passed on unchanged: no header is ever added.
export function guardFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    let origin: string;
    try {
      origin = new URL(inputUrl(input)).origin;
    } catch {
      throw new ForbiddenUrlError("Request refused: the URL does not parse.");
    }
    if (origin !== ALLOWED_ORIGIN) {
      throw new ForbiddenUrlError(
        `Request refused: only ${ALLOWED_ORIGIN} is allowed.`,
      );
    }
    return inner(input, init);
  };
}
