import fc from "fast-check";
import type { Floor, Rating, SelfCheck } from "@haunted-repo/core";
import type { AvailableAction, UserAction } from "../../../logic/actions.js";
import { buildLiveHouse, buildSampleHouse } from "../../../logic/houseView.js";
import { uniquePathReportArb } from "../../../logic/uniquePathReportArb.testutil.js";
import type { StatusKind, ViewModel } from "../../../logic/viewModel.js";

const floorArb: fc.Arbitrary<Floor> = fc.constantFrom(
  "attic",
  "middle floor",
  "basement",
);
const ratingArb: fc.Arbitrary<Rating> = fc.constantFrom(
  "right",
  "half-right",
  "wrong",
);
const selfCheckArb: fc.Arbitrary<SelfCheck> = fc.constantFrom(
  "yes",
  "half",
  "no",
);

/** The 13 UserAction types, with free paths and URLs. */
export const actionArb: fc.Arbitrary<UserAction> = fc.oneof(
  fc.string().map((url): UserAction => ({ type: "submit-live", url })),
  fc.constant<UserAction>({ type: "show-sample" }),
  fc.constant<UserAction>({ type: "go-to-house" }),
  floorArb.map((floor): UserAction => ({ type: "go-to-floor", floor })),
  fc.string().map((path): UserAction => ({ type: "start-ghost", path })),
  fc.constant<UserAction>({ type: "explanation-continue" }),
  fc.constant<UserAction>({ type: "show-model-answer" }),
  ratingArb.map((rating): UserAction => ({ type: "rate", rating })),
  fc.constant<UserAction>({ type: "dont-know" }),
  selfCheckArb.map((answer): UserAction => ({ type: "self-check", answer })),
  fc.constant<UserAction>({ type: "retry" }),
  fc.constant<UserAction>({ type: "back-to-list" }),
  fc.constant<UserAction>({ type: "leave-ghost" }),
);

/** Like actionArb, but start-ghost paths come mostly from `paths`. */
export function actionForPathsArb(
  paths: readonly string[],
): fc.Arbitrary<UserAction> {
  if (paths.length === 0) return actionArb;
  return fc.oneof(
    actionArb,
    fc
      .constantFrom(...paths)
      .map((path): UserAction => ({ type: "start-ghost", path })),
  );
}

/** An action as it is listed in Available_Actions: submit-live has no URL. */
export function toAvailable(action: UserAction): AvailableAction {
  return action.type === "submit-live" ? { type: "submit-live" } : action;
}

/** An action that `entry` allows: submit-live gets a fixed URL. */
export function fromAvailable(entry: AvailableAction): UserAction {
  return entry.type === "submit-live"
    ? { type: "submit-live", url: "https://github.com/a/b" }
    : entry;
}

const statusKindArb: fc.Arbitrary<StatusKind> = fc.constantFrom(
  "none",
  "busy",
  "done",
  "error",
  "fallback",
);

/**
 * Minimal ViewModel generator (task 1.5): enough for Properties 9 and 13.
 * Task 3.1 replaces it with the full generator under the same name.
 */
export const viewModelArb: fc.Arbitrary<ViewModel> = fc
  .record({
    report: uniquePathReportArb,
    houseKind: fc.constantFrom("live", "sample", "none"),
    statusKind: statusKindArb,
    statusText: fc.string(),
    formVisible: fc.boolean(),
    busy: fc.boolean(),
    available: fc.array(actionArb.map(toAvailable), { maxLength: 8 }),
  })
  .map(
    ({
      report,
      houseKind,
      statusKind,
      statusText,
      formVisible,
      busy,
      available,
    }): ViewModel => ({
      scene: { kind: "house" },
      transition: null,
      house:
        houseKind === "live"
          ? buildLiveHouse(report)
          : houseKind === "sample"
            ? buildSampleHouse(report, null)
            : null,
      ghost: null,
      live: { formVisible, busy },
      // The Logic_Layer uses "" as the text of a "none" status.
      status: {
        kind: statusKind,
        text: statusKind === "none" ? "" : statusText,
      },
      licence: null,
      available,
    }),
  );
