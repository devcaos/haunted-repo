import type { HauntedReport } from "../ghost-detection/types.js";
import type { RecordedEvent, SessionRecording } from "./types.js";

/**
 * A small committed session (3 ghosts) used by the end-to-end replay test.
 * Walk-through (steps[i] is the result of event i, steps[0] is the start):
 *  1-6   src/a.ts is passed with 3 right ratings, then a self-check
 *  7-14  src/b.ts: "dont-know" twice on question 1, then two wrong answers: failed
 *  15-17 retry of src/b.ts, then the student leaves the ghost
 * The events were produced by running the engine, so each one is valid.
 */
const report: HauntedReport = {
  overview: {
    owner: "demo",
    repo: "tiny",
    ref: "main",
    analysed: 3,
    picked: 3,
    truncated: false,
    fewFiles: true,
    partial: false,
    skipped: [],
    message: "Small project.",
  },
  ghosts: [
    {
      path: "src/a.ts",
      language: "TypeScript",
      difficultyScore: 40,
      floor: "middle floor",
      factors: { lines: 8, branches: 1, maxIndent: 1, imports: 1 },
      reason: "It has many lines.",
    },
    {
      path: "src/b.ts",
      language: "TypeScript",
      difficultyScore: 50,
      floor: "middle floor",
      factors: { lines: 10, branches: 2, maxIndent: 1, imports: 2 },
      reason: "It has many lines.",
    },
    {
      path: "src/c.ts",
      language: "TypeScript",
      difficultyScore: 60,
      floor: "middle floor",
      factors: { lines: 12, branches: 2, maxIndent: 1, imports: 3 },
      reason: "It has many lines.",
    },
  ],
};

const events: RecordedEvent[] = [
  { type: "pick-ghost", path: "src/a.ts", text: "export const a = 1;" },
  { type: "explanation-done", text: "This file stores the number one." },
  {
    type: "answer-rated",
    rating: "right",
    question: "What does this file give to the rest of the project?",
    sampleAnswer: "It gives the number one.",
  },
  { type: "answer-rated", rating: "right", question: "What is a?" },
  { type: "answer-rated", rating: "right", question: "Can a change?" },
  { type: "self-check-answered", answer: "yes" },
  { type: "pick-ghost", path: "src/b.ts", text: "export const b = a + 1;" },
  { type: "explanation-done", text: "This file adds one to a." },
  { type: "dont-know", question: "What does b hold?" },
  { type: "explanation-done", text: "Think of b as a plus one." },
  {
    type: "dont-know",
    question: "What does b hold?",
    sampleAnswer: "I do not know.",
  },
  { type: "explanation-done", text: "b holds two, because a is one." },
  {
    type: "answer-rated",
    rating: "wrong",
    question: "Where does a come from?",
  },
  { type: "answer-rated", rating: "wrong", question: "Can b be changed?" },
  { type: "retry-ghost" },
  {
    type: "explanation-done",
    text: "Think of b as a box that holds a plus one.",
  },
  { type: "leave-ghost" },
];

export const tinyRecording: SessionRecording = {
  report,
  progress: null,
  profile: { knowsJava: false },
  events,
};

export const tinyRecordingJson: string = JSON.stringify(tinyRecording);
