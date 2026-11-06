---
inclusion: manual
---

# Next task

Luis Miguel wants to start the next piece of work.

1. Read `PLAN.md` and `docs/decisiones.md`.
2. If something is listed under "En curso", ask whether to continue with it. Otherwise take the first item under "Siguientes", unless he names a different one.
3. Check that you are on `main` and up to date (`git status`, then `git pull`). If there are uncommitted changes, stop and tell him.
4. Create the branch for this spec.
5. Create or continue the spec in `.kiro/specs/`. The requirements must include acceptance criteria, edge cases and what is out of scope. The design must include the testing strategy, with a real-service test if an external service is involved.
6. Estimate the size in lines and say whether it should be split into more than one pull request.
7. Stop after each spec phase (requirements, design, tasks) and wait for his approval. Do not write code yet.
