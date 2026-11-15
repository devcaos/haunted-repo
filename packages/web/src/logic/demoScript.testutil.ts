import type { HauntedReport } from "@haunted-repo/core";
import { parseDemoScript } from "./demoScript.js";
import type { DemoScript } from "./demoScript.js";

/** A valid Demo_Script with content for every ghost of the report (to reach house-clean). */
export function fullScriptFor(report: HauntedReport): DemoScript {
  const ghosts = report.ghosts.map((ghost) => ({
    path: ghost.path,
    kind: "general",
    explanation: `What ${ghost.path} does.`,
    retryExplanation: `What ${ghost.path} does, told again.`,
    questions: ["Question one?", "Question two?", "Question three?"],
    simpler: ["Simpler one.", "Simpler two.", "Simpler three."],
    modelAnswers: ["Answer one.", "Answer two.", "Answer three."],
  }));
  const parsed = parseDemoScript(JSON.stringify({ ghosts }));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}
