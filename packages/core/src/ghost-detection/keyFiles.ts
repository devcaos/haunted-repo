import { isEligible } from "./eligibility.js";
import type { FileEntry } from "./types.js";

const KEY_NAMES = new Set([
  "main",
  "index",
  "app",
  "server",
  "program",
  "__main__",
]);
const KEY_FOLDERS = new Set(["src", "app", "lib"]);
const MIN_SIZE = 200;
const MAX_SIZE = 20000;

function nameScore(fileName: string): number {
  const dot = fileName.lastIndexOf(".");
  const base = (dot === -1 ? fileName : fileName.slice(0, dot)).toLowerCase();
  return KEY_NAMES.has(base) ? 40 : 0;
}

function locationScore(folders: string[]): number {
  const first = folders[0]?.toLowerCase() ?? "";
  if (folders.length === 0) return 30;
  if (folders.length === 1) return KEY_FOLDERS.has(first) ? 20 : 0;
  if (folders.length === 2) return KEY_FOLDERS.has(first) ? 10 : 0;
  return 0;
}

function sizeScore(size: number): number {
  const ratio = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  return 30 * Math.min(1, Math.max(0, ratio));
}

/** How likely a file is to be a main file of the project (0 to 100). */
export function keyScore(entry: FileEntry): number {
  const parts = entry.path.split("/");
  const fileName = parts.pop() ?? "";
  return nameScore(fileName) + locationScore(parts) + sizeScore(entry.size);
}

/** Eligible files, best candidates first. Ties are broken by path. */
export function rankKeyFiles(entries: FileEntry[]): FileEntry[] {
  return entries
    .filter((entry) => isEligible(entry.path))
    .map((entry) => ({ entry, score: keyScore(entry) }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.entry.path < b.entry.path) return -1;
      if (a.entry.path > b.entry.path) return 1;
      return 0;
    })
    .map((item) => item.entry);
}

/** The best `max` eligible files (default 5), best candidates first. */
export function pickKeyFiles(entries: FileEntry[], max = 5): FileEntry[] {
  return rankKeyFiles(entries).slice(0, max);
}
