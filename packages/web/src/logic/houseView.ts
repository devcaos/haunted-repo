import { hauntedShare, normaliseProgress } from "@haunted-repo/core";
import type {
  ExorcismProgress,
  ExorcismStep,
  Floor,
  HauntedReport,
  Overview,
} from "@haunted-repo/core";
import { POWER_TEXTS } from "./powerTexts.js";
import { TEXTS } from "./texts.js";
import type {
  FloorView,
  GhostCardView,
  GhostState,
  HouseView,
  ProgressView,
  WarningsView,
} from "./viewModel.js";

/** The exorcism state of the sample, used for card states and progress. */
export interface SampleExorcism {
  progress: ExorcismProgress;
  step: ExorcismStep;
  scripted: ReadonlySet<string>; // paths with Ghost_Content
  startAllowed: boolean; // not busy and scene is not "ghost"
}

/** Report warnings in the order partial, message, truncated (Requirement 17). */
export function buildWarnings(overview: Overview): WarningsView {
  const lines: string[] = [];
  if (overview.partial) lines.push(TEXTS.partial);
  if (overview.message !== null) lines.push(overview.message);
  if (overview.truncated) lines.push(TEXTS.truncated);
  const skipped = overview.skipped.map((file) => ({
    path: file.path,
    reason: TEXTS.skippedReason[file.reason],
  }));
  return {
    lines,
    skippedTitle: skipped.length > 0 ? TEXTS.skippedTitle : null,
    skipped,
  };
}

function hauntedCards(report: HauntedReport): GhostCardView[] {
  return report.ghosts.map((ghost) => ({
    path: ghost.path,
    floor: ghost.floor,
    score: ghost.difficultyScore,
    reason: ghost.reason,
    state: "haunted",
    canStart: false,
    lockedLine: null,
  }));
}

/** Steps that accept pick-ghost, so a haunted card can be started. */
const START_STEPS: readonly ExorcismStep[] = ["choosing", "failed"];

/**
 * Card state rule: exorcised if its progress is exorcised; else locked if the
 * path has no Ghost_Content; else haunted. The busy flag never changes it.
 */
function sampleCards(
  report: HauntedReport,
  exorcism: SampleExorcism,
  exorcised: ReadonlySet<string>,
): GhostCardView[] {
  const stepAllowsStart =
    exorcism.startAllowed && START_STEPS.includes(exorcism.step);
  return hauntedCards(report).map((card): GhostCardView => {
    const state: GhostState = exorcised.has(card.path)
      ? "exorcised"
      : exorcism.scripted.has(card.path)
        ? "haunted"
        : "locked";
    return {
      ...card,
      state,
      canStart: state === "haunted" && stepAllowsStart,
      lockedLine: state === "locked" ? POWER_TEXTS.lockedGhost : null,
    };
  });
}

function buildProgress(
  report: HauntedReport,
  progress: ExorcismProgress,
  exorcised: ReadonlySet<string>,
): ProgressView {
  const paths = new Set(report.ghosts.map((ghost) => ghost.path));
  const total = paths.size;
  const haunted = [...paths].filter((path) => !exorcised.has(path)).length;
  return {
    line: TEXTS.progress(haunted, total),
    haunted,
    total,
    share: hauntedShare(report, progress),
  };
}

function buildFloors(
  cards: GhostCardView[],
): [FloorView, FloorView, FloorView] {
  const floorView = (floor: Floor): FloorView => {
    const ghosts = cards.filter((card) => card.floor === floor);
    return {
      floor,
      title: TEXTS.floorTitles[floor],
      ghosts,
      emptyLine: ghosts.length === 0 ? TEXTS.emptyFloor : null,
    };
  };
  return [floorView("attic"), floorView("middle floor"), floorView("basement")];
}

function buildHouse(
  report: HauntedReport,
  source: "sample" | "live",
): HouseView {
  const { owner, repo } = report.overview;
  return {
    source,
    repoName: `${owner}/${repo}`,
    floors: buildFloors(hauntedCards(report)),
    warnings: buildWarnings(report.overview),
    powerLine: source === "live" ? POWER_TEXTS.liveReport : null,
    progress: null,
    houseClean: null,
  };
}

/** Live report: every card "haunted", canStart false, no progress. */
export function buildLiveHouse(report: HauntedReport): HouseView {
  return buildHouse(report, "live");
}

/**
 * Sample report. With `exorcism` null every card is "haunted" with canStart
 * false and there is no progress. Otherwise the cards follow the progress and
 * the Demo_Script, and the house carries the progress and the house-clean line.
 */
export function buildSampleHouse(
  report: HauntedReport,
  exorcism: SampleExorcism | null,
): HouseView {
  const house = buildHouse(report, "sample");
  if (exorcism === null) return house;
  const normalised = normaliseProgress(report.ghosts, exorcism.progress);
  const exorcised = new Set(
    normalised.ghosts
      .filter((entry) => entry.state === "exorcised")
      .map((entry) => entry.path),
  );
  return {
    ...house,
    floors: buildFloors(sampleCards(report, exorcism, exorcised)),
    progress: buildProgress(report, exorcism.progress, exorcised),
    houseClean: exorcism.step === "house-clean" ? TEXTS.houseClean : null,
  };
}
