import fc from "fast-check";
import type { Ghost } from "../ghost-detection/types.js";
import type {
  ExorcismProgress,
  GhostProgress,
  Rating,
  SelfCheck,
} from "./types.js";

/** Ratings of one attempt: length 0 or 3. */
export const ratingsArb: fc.Arbitrary<Rating[]> = fc.oneof(
  fc.constant<Rating[]>([]),
  fc.array(fc.constantFrom<Rating>("right", "half-right", "wrong"), {
    minLength: 3,
    maxLength: 3,
  }),
);

const entryArb = (path: string): fc.Arbitrary<GhostProgress> =>
  fc.record({
    path: fc.constant(path),
    state: fc.constantFrom<"haunted" | "exorcised">("haunted", "exorcised"),
    ratings: ratingsArb,
    selfCheck: fc.option(fc.constantFrom<SelfCheck>("yes", "half", "no"), {
      nil: null,
    }),
  });

/**
 * A progress with one entry per ghost (given order). With `withUnknown`,
 * it also adds entries for paths that are not in `ghosts`.
 */
export function progressArb(
  ghosts: readonly Ghost[],
  options?: { withUnknown?: boolean },
): fc.Arbitrary<ExorcismProgress> {
  const known = ghosts.map((g) => entryArb(g.path));
  const unknown = options?.withUnknown
    ? fc.array(entryArb("unknown-path"), { maxLength: 1 })
    : fc.constant<GhostProgress[]>([]);
  return fc
    .tuple(fc.tuple(...known), unknown)
    .map(([entries, extra]) => ({ ghosts: [...entries, ...extra] }));
}
