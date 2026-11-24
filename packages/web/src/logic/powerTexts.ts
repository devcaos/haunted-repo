// The ONLY place that mentions the Kiro Power (Requirement 4.13).
// If the Power is not ready by the code freeze, these lines change here only.
export const POWER_TEXTS = {
  liveReport:
    "To exorcise the ghosts of this repository, use your own Kiro with the Haunted Repo Power.",
  lockedGhost: "Exorcise it in your own Kiro with the Power", // used in PR 2
  finaleOtherGhosts:
    "The other ghosts are waiting for your own Kiro with the Haunted Repo Power.",
  getPower: "Get the Power",
} as const;

// The one address that leaves the site (decision of 24 Nov): the link of the
// Finale banner opens the README, which says how to install the Power.
export const POWER_LINK = "https://github.com/devcaos/haunted-repo#readme";
