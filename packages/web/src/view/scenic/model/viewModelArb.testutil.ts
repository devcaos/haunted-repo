import fc from "fast-check";
import type {
  ErrorCode,
  ExorcismStep,
  Floor,
  HauntedReport,
  Rating,
  Result,
  SelfCheck,
} from "@haunted-repo/core";
import { progressArb } from "../../../../../core/src/exorcism/progressArb.testutil.js";
import { choicesArb } from "../../../../../core/src/exorcism/sessionArb.testutil.js";
import { reportArb } from "../../../../../core/src/ghost-detection/reportArb.testutil.js";
import type { AvailableAction, UserAction } from "../../../logic/actions.js";
import { parseDemoScript } from "../../../logic/demoScript.js";
import type { DemoScript } from "../../../logic/demoScript.js";
import { fullScriptFor } from "../../../logic/demoScript.testutil.js";
import { ghostActions } from "../../../logic/exorcism.js";
import { buildLiveHouse, buildSampleHouse } from "../../../logic/houseView.js";
import { createPage } from "../../../logic/page.js";
import { createRecordingRenderer } from "../../../logic/recordingRenderer.testutil.js";
import { TEXTS } from "../../../logic/texts.js";
import { uniquePathReportArb } from "../../../logic/uniquePathReportArb.testutil.js";
import type {
  GhostView,
  HouseView,
  Scene,
  StatusKind,
  ViewModel,
} from "../../../logic/viewModel.js";
import { loadSample } from "../../../sample/sampleData.js";

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

const FLOORS: readonly Floor[] = ["attic", "middle floor", "basement"];
const ALL_STEPS: readonly ExorcismStep[] = [
  "choosing",
  "explaining",
  "asking",
  "simplifying",
  "model-answer",
  "self-check",
  "failed",
  "house-clean",
];
const GHOST_STEPS = ALL_STEPS.filter(
  (step) => step !== "choosing" && step !== "house-clean",
) as readonly Exclude<ExorcismStep, "choosing" | "house-clean">[];

export interface ViewModelArbOptions {
  /** At most this many Cards per floor (the real report never has more than 5). */
  maxPerFloor?: number;
  /** "any" lets a path repeat, "unique" does not, "mixed" (default) uses both. */
  paths?: "any" | "unique" | "mixed";
  /** About a third of the sample houses have only Locked or Exorcised Cards (P6). */
  finaleBias?: boolean;
}

/** Keeps the first `max` ghosts of each floor, in order. */
function limitPerFloor(report: HauntedReport, max: number): HauntedReport {
  const used = new Map<Floor, number>();
  const ghosts = report.ghosts.filter((ghost) => {
    const n = used.get(ghost.floor) ?? 0;
    used.set(ghost.floor, n + 1);
    return n < max;
  });
  return { overview: report.overview, ghosts };
}

function reportFor(options: ViewModelArbOptions): fc.Arbitrary<HauntedReport> {
  const paths = options.paths ?? "mixed";
  const base =
    paths === "any"
      ? reportArb
      : paths === "unique"
        ? uniquePathReportArb
        : fc.oneof(reportArb, uniquePathReportArb);
  const max = options.maxPerFloor;
  return max === undefined
    ? base
    : base.map((report) => limitPerFloor(report, max));
}

/** The Available_Actions with the rules of `page.ts`. */
function availableFor(
  scene: Scene,
  house: HouseView | null,
  busy: boolean,
  step: ExorcismStep,
  revealed: boolean,
): AvailableAction[] {
  if (house === null) return [];
  if (scene.kind === "ghost") return ghostActions(step, revealed);
  const list: AvailableAction[] = [];
  if (!busy) list.push({ type: "submit-live" });
  const focus = scene.kind === "floor" ? scene.floor : null;
  for (const floor of FLOORS) {
    if (floor !== focus) list.push({ type: "go-to-floor", floor });
  }
  if (scene.kind === "floor") list.push({ type: "go-to-house" });
  if (!busy && house.source === "live") list.push({ type: "show-sample" });
  for (const view of house.floors) {
    for (const card of view.ghosts) {
      if (card.canStart) list.push({ type: "start-ghost", path: card.path });
    }
  }
  return list;
}

function ghostViewFor(
  floor: Floor,
  path: string,
  step: Exclude<ExorcismStep, "choosing" | "house-clean">,
  revealed: boolean,
): GhostView {
  const asking = step === "asking";
  return {
    path,
    floor,
    step,
    code: "const a = 1;",
    licenceNextToCode: true,
    judgeLine: TEXTS.judgeLine,
    reading: null,
    questionNumber: asking ? 1 : null,
    question: asking ? "What does it do?" : null,
    revealedAnswer: asking && revealed ? "It does a thing." : null,
    showAnswerBox: asking,
    prompt: null,
  };
}

interface Draft {
  report: HauntedReport;
  houseKind: "live" | "sample" | "none";
  progressSeed: number;
  scriptedMask: boolean[];
  noScripted: boolean;
  step: ExorcismStep;
  startAllowed: boolean;
  busy: boolean;
  sceneKind: "house" | "floor" | "ghost";
  floorIndex: number;
  cardIndex: number;
  revealed: boolean;
  statusKind: StatusKind;
  statusText: string;
  ghostStep: (typeof GHOST_STEPS)[number];
}

/**
 * The full ViewModel generator (design "Generators"). The house is live,
 * sample or null (about 1 run in 20); the Scene, the Available_Actions and the
 * ghost follow the rules of `page.ts`.
 */
export function viewModelArbWith(
  options: ViewModelArbOptions = {},
): fc.Arbitrary<ViewModel> {
  const draft: fc.Arbitrary<Draft> = reportFor(options).chain((report) =>
    fc
      .record({
        report: fc.constant(report),
        houseKind: fc.oneof(
          { weight: 1, arbitrary: fc.constant<"none">("none") },
          { weight: 9, arbitrary: fc.constant<"live">("live") },
          { weight: 10, arbitrary: fc.constant<"sample">("sample") },
        ),
        progressSeed: fc.nat(),
        scriptedMask: fc.array(fc.boolean(), {
          minLength: report.ghosts.length,
          maxLength: report.ghosts.length,
        }),
        noScripted: options.finaleBias
          ? fc.integer({ min: 0, max: 2 }).map((n) => n === 0)
          : fc.constant(false),
        step: fc.constantFrom(...ALL_STEPS),
        startAllowed: fc.boolean(),
        busy: fc.boolean(),
        sceneKind: fc.constantFrom<"house" | "floor" | "ghost">(
          "house",
          "floor",
          "ghost",
        ),
        floorIndex: fc.integer({ min: 0, max: 2 }),
        cardIndex: fc.nat(),
        revealed: fc.boolean(),
        statusKind: statusKindArb,
        statusText: fc.string(),
        ghostStep: fc.constantFrom(...GHOST_STEPS),
      })
      .map((d): Draft => d),
  );
  return draft.chain((d) =>
    progressArb(d.report.ghosts).map((progress): ViewModel => {
      const scripted = new Set(
        d.noScripted
          ? []
          : d.report.ghosts
              .filter((_ghost, i) => d.scriptedMask[i] === true)
              .map((ghost) => ghost.path),
      );
      let scene: Scene = { kind: "house" };
      let ghost: GhostView | null = null;
      const startAllowedHere = d.startAllowed && !d.busy;
      const sampleHouse = (allowed: boolean): HouseView =>
        buildSampleHouse(d.report, {
          progress,
          step: d.step,
          scripted,
          startAllowed: allowed,
        });
      let house: HouseView | null =
        d.houseKind === "none"
          ? null
          : d.houseKind === "live"
            ? buildLiveHouse(d.report)
            : sampleHouse(startAllowedHere);
      let step: ExorcismStep = d.step;
      if (house !== null && d.sceneKind === "floor") {
        scene = { kind: "floor", floor: FLOORS[d.floorIndex] ?? "attic" };
      } else if (
        house !== null &&
        house.source === "sample" &&
        d.sceneKind === "ghost" &&
        d.report.ghosts.length > 0
      ) {
        const card = d.report.ghosts[d.cardIndex % d.report.ghosts.length];
        if (card !== undefined) {
          scene = { kind: "ghost", floor: card.floor, path: card.path };
          step = d.ghostStep;
          house = sampleHouse(false);
          ghost = ghostViewFor(card.floor, card.path, d.ghostStep, d.revealed);
        }
      }
      return {
        scene,
        transition: null,
        house,
        ghost,
        live: { formVisible: scene.kind !== "ghost", busy: d.busy },
        // The Logic_Layer uses "" as the text of a "none" status.
        status: {
          kind: d.statusKind,
          text: d.statusKind === "none" ? "" : d.statusText,
        },
        licence:
          house === null
            ? null
            : {
                copyright: "Copyright (c) test",
                href: "sirv-license.txt",
                linkText: "Read the MIT licence of lukeed/sirv",
              },
        available: availableFor(scene, house, d.busy, step, d.revealed),
      };
    }),
  );
}

/** The default full generator: live, sample and null houses, repeated paths allowed. */
export const viewModelArb: fc.Arbitrary<ViewModel> = viewModelArbWith();

const SAMPLE_DIR = "../../../sample/";

/** What one `detect` call of a page run does. */
export type DetectPlan =
  | { kind: "report"; report: HauntedReport }
  | { kind: "error"; code: ErrorCode; message: string }
  | { kind: "throw" };

/** A plan for one run of the real `createPage`. */
export interface PageRun {
  script: "committed" | "full";
  detects: DetectPlan[];
  choices: number[];
}

const errorCodeArb: fc.Arbitrary<ErrorCode> = fc.constantFrom(
  "INVALID_URL",
  "REPO_NOT_FOUND",
  "EMPTY_REPO",
  "NO_SUPPORTED_FILES",
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "INVALID_REPORT",
);

const detectPlanArb: fc.Arbitrary<DetectPlan> = fc.oneof(
  uniquePathReportArb.map((report): DetectPlan => ({ kind: "report", report })),
  fc
    .record({ code: errorCodeArb, message: fc.string() })
    .map(({ code, message }): DetectPlan => ({ kind: "error", code, message })),
  fc.constant<DetectPlan>({ kind: "throw" }),
);

/** Plans for `playPageRun`: the page itself is async, so the plan is played apart. */
export const pageRunArb: fc.Arbitrary<PageRun> = fc.record({
  script: fc.constantFrom<"committed" | "full">("committed", "full"),
  detects: fc.array(detectPlanArb, { minLength: 1, maxLength: 3 }),
  choices: choicesArb,
});

/**
 * Runs the real `createPage` with the committed sample and a recording
 * renderer. Each number of `choices` picks one entry of `model.available`
 * (submit-live gets a fixed URL). Returns every model, in order.
 */
export async function playPageRun(
  run: PageRun,
  read: (relative: string) => string,
): Promise<ViewModel[]> {
  const sample = loadSample(
    read(`${SAMPLE_DIR}report.json`),
    read(`${SAMPLE_DIR}files.json`),
  );
  if (!sample.ok) throw new Error(sample.error);
  let script: DemoScript;
  if (run.script === "full") {
    script = fullScriptFor(sample.value.report);
  } else {
    const parsed = parseDemoScript(read(`${SAMPLE_DIR}demo-script.json`));
    if (!parsed.ok) throw new Error(parsed.error);
    script = parsed.value;
  }
  let calls = 0;
  const detect = (): Promise<Result<HauntedReport>> => {
    const plan = run.detects[calls % run.detects.length];
    calls += 1;
    if (plan === undefined || plan.kind === "throw") {
      return Promise.reject(new Error("detect failed"));
    }
    if (plan.kind === "error") {
      return Promise.resolve({
        ok: false,
        error: { code: plan.code, message: plan.message },
      });
    }
    return Promise.resolve({ ok: true, value: plan.report });
  };
  const renderer = createRecordingRenderer();
  const page = createPage({ detect, sample, script }, renderer);
  page.start();
  for (const choice of run.choices) {
    const available = page.current().available;
    const entry = available[choice % Math.max(available.length, 1)];
    if (entry === undefined) break;
    await page.dispatch(fromAvailable(entry));
  }
  return renderer.models;
}
