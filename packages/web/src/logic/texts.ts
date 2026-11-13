// Every page text except the ones in powerTexts.ts, in one object,
// so wording changes in one place. All texts are English.
export const TEXTS = {
  floorTitles: {
    attic: "Attic",
    "middle floor": "Middle floor",
    basement: "Basement",
  },
  emptyFloor: "No ghosts on this floor.",
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
  // accessible names. The ghost action labels are added in PR 2.
  actionLabels: {
    "submit-live": "Find the ghosts",
    "show-sample": "Show the sample again",
    "go-to-house": "Back to the house",
    "go-to-floor": "Go to this floor",
  },
} as const;
