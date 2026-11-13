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
  HouseView,
  WarningsView,
} from "./viewModel.js";

/** The exorcism state of the sample. Only null is handled in PR 1. */
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

/** Sample report. In PR 1 `exorcism` is null: every card "haunted", canStart false. */
export function buildSampleHouse(
  report: HauntedReport,
  exorcism: SampleExorcism | null,
): HouseView {
  void exorcism; // PR 2 uses it for card states and progress
  return buildHouse(report, "sample");
}
