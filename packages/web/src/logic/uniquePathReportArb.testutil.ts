import type fc from "fast-check";
import type { HauntedReport } from "@haunted-repo/core";
import { reportArb } from "../../../core/src/ghost-detection/reportArb.testutil.js";

/**
 * `reportArb` with unique ghost paths. `reportArb` can repeat a path (each one
 * is a free string), so this keeps the first ghost of each path, in order.
 */
export const uniquePathReportArb: fc.Arbitrary<HauntedReport> = reportArb.map(
  (report) => {
    const seen = new Set<string>();
    const ghosts = report.ghosts.filter((ghost) => {
      if (seen.has(ghost.path)) return false;
      seen.add(ghost.path);
      return true;
    });
    return { overview: report.overview, ghosts };
  },
);
