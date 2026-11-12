import type { Result } from "../ghost-detection/types.js";
import { fail, ok } from "./errors.js";
import type { ExorcismErrorInfo, Verdict } from "./types.js";

const VERDICTS: readonly Verdict[] = [
  "right",
  "half-right",
  "wrong",
  "dont-know",
];
const PREFIX = "VERDICT:";

export function formatVerdict(reason: string, verdict: Verdict): string {
  const trimmed = reason.trimEnd();
  const line = `${PREFIX} ${verdict}`;
  return trimmed === "" ? line : `${trimmed}\n${line}`;
}

export function parseVerdict(text: string): Result<Verdict, ExorcismErrorInfo> {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  let last = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if ((lines[i] ?? "").trimEnd() !== "") {
      last = i;
      break;
    }
  }
  const lastLine = last === -1 ? "" : (lines[last] ?? "").trimEnd();
  const found = VERDICTS.find((v) => lastLine === `${PREFIX} ${v}`);
  if (found === undefined) {
    return fail(
      "INVALID_VERDICT",
      "The last line must be exactly one of: VERDICT: right, VERDICT: half-right, VERDICT: wrong, VERDICT: dont-know.",
    );
  }
  const others = lines.filter((l, i) => i !== last && l.startsWith(PREFIX));
  if (others.length > 0) {
    return fail(
      "INVALID_VERDICT",
      "There is more than one VERDICT line; give one verdict per question.",
    );
  }
  return ok(found);
}
