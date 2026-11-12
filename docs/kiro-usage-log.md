# Kiro usage log

Raw notes for the Devpost write-up "How Kiro was used". One line per use, added as we go.

| Date | Kiro feature | What we used it for | Why it helped / friction found |
|---|---|---|---|
| 2026-11-05 | Steering (always) | Working rules, git workflow and testing rules ported from my own project template | Rules load in every interaction, so the agent always asks before changing code |
| 2026-11-05 | Steering (manual) | `#next-task` and `#close-task` as slash commands for the task cycle | Same cycle every time, no rules pasted by hand |
| 2026-11-05 | Custom agent | `reviewer`: read-only reviewer restricted to git diff/log/show | Isolated context, so it reviews the code without the history of how it was written |
| 2026-11-06 | Steering (always) | `product.md` and `tech.md` generated from `docs/idea.md`, with `inclusion: always` | Product and stack constraints (free demo until 29 Jan 2027, Windows-compatible commands) load in every interaction. Friction: the exact Kiro Power format and hook trigger could not be confirmed from the docs, so both are left to their specs (see `docs/frictions.md`) |
| 2026-11-06 | Steering (always) | `testing.md` updated with the user-Kiro exception to the real-service test rule | Keeps the rule and the documented exception in sync, instead of the agent hitting a rule it cannot satisfy |
| 2026-11-12 | Specs | `pages-deploy`: Vite demo site, GitHub Pages deploy and CI workflows, written by Kiro and approved by Luis Miguel | Requirements, design and tasks were approved before any code, and each task ended in its own commit after `npm run check` |