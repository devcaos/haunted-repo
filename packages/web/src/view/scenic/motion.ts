/** The system setting for less motion (Requirement 18). */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads a media query now and calls `onChange` with the new value every time
 * it changes while the page is open, so a new setting applies without a
 * reload (Requirements 18.9, 19.2). Used for `WIDE_QUERY` and
 * `REDUCED_MOTION_QUERY`. Returns whether the query matches now.
 */
export function watchMedia(
  query: string,
  onChange: (matches: boolean) => void,
): boolean {
  const list = window.matchMedia(query);
  list.addEventListener("change", (event) => {
    onChange(event.matches);
  });
  return list.matches;
}
