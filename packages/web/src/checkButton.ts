import type { Result } from "@haunted-repo/core";

/** Narrow on purpose: the real `detectGhosts` is assignable to it. */
export type DetectFn = (
  url: string,
) => Promise<Result<{ ghosts: readonly unknown[] }>>;

export interface CheckView {
  /** Disables (true) or enables (false) the button. */
  setBusy(busy: boolean): void;
  setStatus(text: string): void;
}

export const SAMPLE_REPO_URL = "https://github.com/lukeed/sirv";

export function formatResult(
  result: Result<{ ghosts: readonly unknown[] }>,
): string {
  if (result.ok) return `Ghosts found: ${result.value.ghosts.length}`;
  return `Error: ${result.error.message}`;
}

export function createCheckHandler(
  detect: DetectFn,
  view: CheckView,
): () => Promise<void> {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    view.setBusy(true);
    view.setStatus("Checking...");
    try {
      const result = await detect(SAMPLE_REPO_URL);
      view.setStatus(formatResult(result));
    } catch {
      view.setStatus("Unexpected error. Please try again.");
    } finally {
      view.setBusy(false);
      running = false;
    }
  };
}
