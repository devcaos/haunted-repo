import type { ExorcismStep, Floor } from "@haunted-repo/core";
import type { AvailableAction } from "./actions.js";

// Plain data only: strings, numbers, booleans, null, plain objects and arrays.
// No undefined, no functions, no Date, no DOM nodes (Requirement 18.1).

export type Scene =
  | { kind: "house" }
  | { kind: "floor"; floor: Floor }
  | { kind: "ghost"; floor: Floor; path: string }; // PR 2

/** Set only in the render where the scene changed; null otherwise and on the first render. */
export interface SceneTransition {
  from: Scene;
  to: Scene;
}

export type GhostState = "haunted" | "exorcised" | "locked";

export interface GhostCardView {
  path: string;
  floor: Floor;
  score: number; // difficultyScore
  reason: string;
  state: GhostState;
  canStart: boolean; // true exactly when { type: "start-ghost", path } is in `available`
  lockedLine: string | null; // PR 2: POWER_TEXTS.lockedGhost when state is "locked"
}

export interface FloorView {
  floor: Floor;
  title: string; // "Attic" | "Middle floor" | "Basement"
  ghosts: GhostCardView[]; // report order
  emptyLine: string | null; // TEXTS.emptyFloor when ghosts is empty, else null
}

export interface WarningsView {
  lines: string[]; // partial, message, truncated, in this order; only those that apply
  skippedTitle: string | null; // TEXTS.skippedTitle when skipped is not empty
  skipped: { path: string; reason: "too large" | "not text" }[];
}

export interface ProgressView {
  line: string; // "N of M ghosts still haunting"
  haunted: number;
  total: number;
  share: number; // hauntedShare(report, progress), 0..1
}

export interface HouseView {
  source: "sample" | "live";
  repoName: string; // "owner/repo"
  floors: [FloorView, FloorView, FloorView]; // attic, middle floor, basement
  warnings: WarningsView;
  powerLine: string | null; // POWER_TEXTS.liveReport only for live
  progress: ProgressView | null; // PR 2: only for sample
  houseClean: string | null; // PR 2: TEXTS.houseClean when the step is house-clean
}

export type ReadingKind =
  "explanation" | "retry-explanation" | "simpler" | "model-answer";

/** PR 2. Non-null exactly when scene.kind is "ghost". */
export interface GhostView {
  path: string;
  floor: Floor;
  step: Exclude<ExorcismStep, "choosing" | "house-clean">;
  code: string | null; // full Ghost_Text in explaining, asking, simplifying, model-answer; else null
  licenceNextToCode: boolean; // true whenever code is not null (Requirement 10.2)
  judgeLine: string; // TEXTS.judgeLine (Requirement 6.22)
  reading: { kind: ReadingKind; text: string } | null;
  questionNumber: 1 | 2 | 3 | null;
  question: string | null; // in asking
  revealedAnswer: string | null; // in asking, after show-model-answer
  showAnswerBox: boolean; // in asking
  prompt: string | null; // TEXTS.selfCheck in self-check, TEXTS.stillHaunted in failed
}

export interface LicenceView {
  copyright: string; // from files.json, taken from the Licence_Text
  href: "sirv-license.txt"; // relative: works under the Vite base path
  linkText: "Read the MIT licence of lukeed/sirv";
}

export type StatusKind = "none" | "busy" | "done" | "error" | "fallback";

export interface ViewModel {
  scene: Scene;
  transition: SceneTransition | null;
  house: HouseView | null; // null only when the sample failed to load
  ghost: GhostView | null;
  live: { formVisible: boolean; busy: boolean };
  status: { kind: StatusKind; text: string }; // text "" when kind is "none"
  licence: LicenceView | null; // null only when the sample failed to load
  available: AvailableAction[];
}

/** What every renderer implements. */
export interface Renderer {
  render(model: ViewModel): void;
}
