import type { Floor } from "@haunted-repo/core";

// Every page text except the ones in powerTexts.ts, in one object,
// so wording changes in one place. All texts are English.
export const TEXTS = {
  pageTitle: "Haunted Repo",
  houseHeading: (repoName: string) => `Ghosts of ${repoName}`,
  scoreLine: (score: number) => `Difficulty: ${score} of 100`,
  // Shown by a renderer when the ghost picture slot is empty.
  ghostStateLabels: {
    haunted: "Haunted",
    exorcised: "Exorcised",
    locked: "Locked",
  },
  floorTitles: {
    attic: "Attic",
    "middle floor": "Middle floor",
    basement: "Basement",
  },
  emptyFloor: "No ghosts on this floor.",
  // Only the sample: it invites the visitor to meet this floor's Ghost_Type in their own repository.
  emptySampleFloor: (floor: Floor) =>
    `No ghosts on this floor of the sample. The ${TEXTS.bestiary.names[floor]} haunts files with a difficulty from ${TEXTS.bestiary.ranges[floor]}. Find the ghosts of your own repository to meet it.`,
  busy: "Looking at the repository. This can take a few seconds.",
  liveDone: (owner: string, repo: string, n: number) =>
    `Found ${n} ${n === 1 ? "ghost" : "ghosts"} in ${owner}/${repo}.`,
  fallback:
    "GitHub allows only 60 requests per hour without an account, and it did not answer this time. Here is the sample again. Please try again later.",
  partial:
    "The analysis is incomplete: GitHub stopped answering before every file was read.",
  truncated:
    "This repository is very big, so only part of its files was looked at.",
  skippedTitle: "Files that were skipped:",
  skippedReason: { TOO_LARGE: "too large", NOT_TEXT: "not text" },
  sampleBroken: "The sample could not be loaded. Please reload the page.",
  formLabel: "Public GitHub repository URL",
  // Labels of user actions. Any renderer may use them as button text or
  // accessible names.
  actionLabels: {
    "submit-live": "Find the ghosts",
    "show-sample": "Show the sample again",
    "go-to-house": "Back to the house",
    "go-to-floor": "Go to this floor",
    "start-ghost": "Start the exorcism",
    "explanation-continue": "Continue",
    "show-model-answer": "Show the model answer",
    "dont-know": "I don't know",
    rate: { right: "Got it", "half-right": "Partly", wrong: "Missed it" },
    "self-check": { yes: "Yes", half: "Partly", no: "Not yet" },
    retry: "Try again",
    "back-to-list": "Back to the list",
    "leave-ghost": "Leave this ghost",
  },
  // PR 2: the Exorcism_Panel.
  ghostHeading: (path: string) => `Exorcising ${path}`,
  readingTitles: {
    explanation: "What this file does",
    "retry-explanation": "Another way to see it",
    simpler: "A simpler explanation",
    "model-answer": "Model answer",
  },
  questionTitle: (n: number) => `Question ${n} of 3`,
  answerLabel: "Your answer (it is never sent or saved)",
  revealedTitle: "Model answer",
  // PR 2: the sample exorcism.
  judgeLine:
    "In the real tool, your own Kiro reads your answer and judges it. Here you judge it yourself.",
  selfCheck: "Do you feel you understand this file now?",
  stillHaunted: "This ghost is still here. You can try again.",
  houseClean: "Every ghost is exorcised. The house is clean.",
  progress: (haunted: number, total: number) =>
    `${haunted} of ${total} ghosts still haunting`,
  engineError: "Something went wrong in the demo. You are back at the list.",
  // Scenic view (scenic-web spec): shell texts.
  tagline: "Your repo is haunted. Let's fix that.",
  viewLinks: { simple: "Simple view", scenic: "Scenic view" },
  motion: { on: "Motion: on", off: "Motion: off" },
  phone: {
    answer: "Answer the phone",
    answerWaiting: "Answer the phone, a call is waiting",
    quiet: "The line is quiet.",
    ring: "RING!",
  },
  lightning: {
    on: "Lightning: on",
    off: "Lightning: off",
    reducedReason: "Off because your system asks for less motion",
  },
  finaleDone: "The demo is complete.",
  viewLoadFailed: "The page could not be loaded. Please reload it.",
  floorButtonName: (title: string, action: string) => `${title}. ${action}`,
  nameplateName: (
    path: string,
    floor: string,
    score: number,
    state: string,
    lockedLine: string | null,
  ) =>
    `${path}, ${floor}, difficulty ${score} of 100, ${state}${lockedLine === null ? "" : `, ${lockedLine}`}`,
  // The Bestiary: one entry per Ghost_Type, in floor order. The ranges are
  // literal texts, checked against floorOf in scenicTexts.test.ts.
  bestiary: {
    title: "Bestiary",
    names: {
      attic: "Wisp",
      "middle floor": "Lantern Wraith",
      basement: "Chained Brute",
    },
    ranges: {
      attic: "0 to 33",
      "middle floor": "34 to 66",
      basement: "67 to 100",
    },
    rangeLine: (range: string) => `Difficulty ${range}`,
  },
} as const;
