export type ViewName = "scenic" | "simple";

/**
 * Reads only the query string. Never changes the address. Stores nothing.
 * The Scenic view is the default; only an exact first `view=simple` gives
 * the Simple view (Requirement 1, task 16.8).
 */
export function chooseView(search: string): ViewName {
  return new URLSearchParams(search).get("view") === "simple"
    ? "simple"
    : "scenic";
}
