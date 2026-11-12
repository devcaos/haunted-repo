import type { Floor } from "./types.js";

export function floorOf(score: number): Floor {
  if (score <= 33) return "attic";
  if (score <= 66) return "middle floor";
  return "basement";
}
