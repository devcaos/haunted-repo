export type ViewName = "scenic" | "simple";

/**
 * Reads only the query string. Never changes the address. Stores nothing.
 * Dark launch (decision Q14): until PR 4b the Scenic view is chosen only by
 * `?view=scenic`, and the Simple view stays the default.
 */
export function chooseView(search: string): ViewName {
  return new URLSearchParams(search).get("view") === "scenic"
    ? "scenic"
    : "simple";
}
