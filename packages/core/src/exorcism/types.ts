import type { Ghost, HauntedReport } from "../ghost-detection/types.js";
import type { RuleId } from "./rules.js";

export type ExorcismStep =
  | "choosing"
  | "explaining"
  | "asking"
  | "simplifying"
  | "model-answer"
  | "self-check"
  | "failed"
  | "house-clean";

export type Rating = "right" | "half-right" | "wrong";
export type Verdict = Rating | "dont-know";
export type FileKind = "data-shape" | "logic" | "entry-point" | "general";
export type SelfCheck = "yes" | "half" | "no";

export interface StudentProfile {
  knowsJava: boolean;
}

export type ExorcismErrorCode =
  "INVALID_EVENT" | "INVALID_VERDICT" | "INVALID_PROGRESS" | "INVALID_SESSION";

export interface ExorcismErrorInfo {
  code: ExorcismErrorCode;
  message: string; // English
}

export interface GhostProgress {
  path: string;
  state: "haunted" | "exorcised";
  ratings: Rating[]; // length 0 or 3: the ratings of the last attempt
  selfCheck: SelfCheck | null;
}

export interface ExorcismProgress {
  ghosts: GhostProgress[];
}

export type ExorcismEvent =
  | { type: "pick-ghost"; path: string; text: string } // text may be "" (file with no code)
  | { type: "explanation-done"; text: string } // not blank
  | { type: "answer-rated"; rating: Rating; question: string } // question not blank
  | { type: "dont-know"; question: string } // question not blank
  | { type: "self-check-answered"; answer: SelfCheck }
  | { type: "retry-ghost" }
  | { type: "leave-ghost" };

export interface CurrentGhost {
  path: string;
  text: string; // the Ghost_Text given by the caller
  kind: FileKind;
  explanation: string; // "" until the first explanation is done; kept across retry-ghost
  simpler: string[]; // Simpler_Explanations of this attempt
  attemptStart: number; // asked[path].length when the attempt started
  questionIndex: 0 | 1 | 2;
  dontKnowCount: 0 | 1;
  pendingQuestion: string | null; // the question being re-asked after a simplification
  ratings: Rating[]; // length 0..3
}

export interface SessionState {
  step: ExorcismStep;
  profile: StudentProfile;
  ghosts: Ghost[]; // copied from the report at start
  progress: ExorcismProgress; // normalised: one entry per ghost, report order
  asked: Record<string, string[]>; // every question text ever asked per ghost path
  current: CurrentGhost | null;
}

export interface TutorInstructions {
  step: ExorcismStep;
  text: string;
  rules: RuleId[]; // ordered, as rendered
}

export type RecordedEvent =
  | Exclude<ExorcismEvent, { type: "answer-rated" } | { type: "dont-know" }>
  | (Extract<ExorcismEvent, { type: "answer-rated" | "dont-know" }> & {
      sampleAnswer?: string;
    });

export interface SessionRecording {
  report: HauntedReport;
  progress: ExorcismProgress | null;
  profile: StudentProfile | null;
  events: RecordedEvent[];
}
