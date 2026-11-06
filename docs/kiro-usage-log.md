# Kiro usage log

Raw notes for the Devpost write-up "How Kiro was used". One line per use, added as we go.

| Date | Kiro feature | What we used it for | Why it helped / friction found |
|---|---|---|---|
| 2026-11-05 | Steering (always) | Working rules, git workflow and testing rules ported from my own project template | Rules load in every interaction, so the agent always asks before changing code |
| 2026-11-05 | Steering (manual) | `#next-task` and `#close-task` as slash commands for the task cycle | Same cycle every time, no rules pasted by hand |
| 2026-11-05 | Custom agent | `reviewer`: read-only reviewer restricted to git diff/log/show | Isolated context, so it reviews the code without the history of how it was written |
