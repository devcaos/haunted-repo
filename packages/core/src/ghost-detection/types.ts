export type Language = "TypeScript" | "JavaScript" | "Java" | "Python";
export type Floor = "attic" | "middle floor" | "basement";

export type ErrorCode =
  | "INVALID_URL"
  | "REPO_NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "EMPTY_REPO"
  | "NO_SUPPORTED_FILES"
  | "INVALID_REPORT";

export interface DetectErrorInfo {
  code: ErrorCode;
  message: string; // English
}

export type Result<T, E = DetectErrorInfo> =
  { ok: true; value: T } | { ok: false; error: E };

export interface RepoReference {
  owner: string;
  repo: string;
}

export interface FileEntry {
  path: string; // as in the tree, "/" separated
  size: number; // bytes, from the tree
}

export interface Factors {
  lines: number;
  branches: number;
  maxIndent: number;
  imports: number;
}

export interface Ghost {
  path: string;
  language: Language;
  difficultyScore: number; // integer 0..100
  floor: Floor;
  factors: Factors;
  reason: string;
}

export interface SkippedFile {
  path: string;
  reason: "TOO_LARGE" | "NOT_TEXT";
}

export interface Overview {
  owner: string;
  repo: string;
  ref: string; // the ref really used (the default branch name, or the test-only SHA)
  analysed: number; // number of eligible files found
  picked: number; // ghosts.length
  truncated: boolean;
  fewFiles: boolean;
  partial: boolean;
  skipped: SkippedFile[];
  message: string | null; // English text when fewFiles is true, else null
}

export interface HauntedReport {
  overview: Overview;
  ghosts: Ghost[]; // easy to hard
}
