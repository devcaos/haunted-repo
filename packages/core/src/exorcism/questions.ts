import type { FileKind } from "./types.js";

/**
 * Three question objectives per file kind. Index 0 is the Core_Question
 * objective. The Tutor writes the real question from the objective.
 */
export const QUESTION_SETS: Readonly<
  Record<FileKind, readonly [string, string, string]>
> = {
  "data-shape": [
    "what the file is for",
    "what data one record carries",
    "what happens when one piece of data is missing",
  ],
  logic: [
    "what the file does",
    "what goes in and what comes out",
    "when it fails or what can go wrong",
  ],
  "entry-point": [
    "what the file starts or connects",
    "which other parts it uses and in what order",
    "what happens if one of those parts fails",
  ],
  general: [
    "what the file is for",
    "what you would notice in the project if the file did not exist",
    "what could go wrong in it",
  ],
};

export function objectiveOf(kind: FileKind, index: 0 | 1 | 2): string {
  return QUESTION_SETS[kind][index];
}
