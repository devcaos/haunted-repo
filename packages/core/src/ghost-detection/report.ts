import { difficultyScore, reasonFor } from "./factors.js";
import { floorOf } from "./floor.js";
import type {
  Factors,
  Ghost,
  HauntedReport,
  Language,
  SkippedFile,
} from "./types.js";

export { floorOf } from "./floor.js";

export interface ScoredFile {
  path: string;
  language: Language;
  factors: Factors;
}

export interface BuildInput {
  owner: string;
  repo: string;
  ref: string;
  analysed: number;
  truncated: boolean;
  partial: boolean;
  skipped: SkippedFile[];
  ghosts: ScoredFile[];
}

export function buildReport(input: BuildInput): HauntedReport {
  const ghosts: Ghost[] = input.ghosts.map((file) => {
    const score = difficultyScore(file.factors);
    return {
      path: file.path,
      language: file.language,
      difficultyScore: score,
      floor: floorOf(score),
      factors: { ...file.factors },
      reason: reasonFor(file.factors),
    };
  });

  ghosts.sort((a, b) => {
    if (a.difficultyScore !== b.difficultyScore) {
      return a.difficultyScore - b.difficultyScore;
    }
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });

  const picked = ghosts.length;
  const fewFiles = picked === 1 || picked === 2;

  return {
    overview: {
      owner: input.owner,
      repo: input.repo,
      ref: input.ref,
      analysed: input.analysed,
      picked,
      truncated: input.truncated,
      fewFiles,
      partial: input.partial,
      skipped: input.skipped.map((s) => ({ ...s })),
      message: fewFiles
        ? `This looks like a small project, so only ${picked} file(s) were picked.`
        : null,
    },
    ghosts,
  };
}
