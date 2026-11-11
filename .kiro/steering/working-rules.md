---
inclusion: always
---

# Working rules

## Roles
- Luis Miguel (the user) is the project director. He is a first-year student of Multiplatform Application Development (DAM) and a beginner programmer. He decides what gets built, in what order, and whether a change is accepted.
- Kiro writes all the code of this project.
- **Ask for permission before modifying code.** Propose first, wait for an explicit "yes", then change files.
- Luis Miguel does all merges on GitHub. Never merge.

## Language
- Talk to Luis Miguel in **Spanish**, with simple words. The first time you use a technical term, define it in one sentence.
- Code, comments, commit messages, PR titles and descriptions, branch names, specs and README are written in **English**.
- All user-visible text of the app (the demo website, Power messages, questions and explanations shown to users) is written in **English**.
- Internal documents (`PLAN.md`, `docs/*.md`, internal specs) may stay in Spanish.

## Source of truth
- `.kiro/steering/product.md` and `.kiro/steering/tech.md`: what the product is and which stack it uses.
- `.kiro/specs/`: one spec per feature (requirements, design, tasks).
- `PLAN.md`: order of the specs, pending items and handoff notes ("Para retomar").
- `docs/decisiones.md`: decisions and rejected proposals. Do not reopen a rejected proposal without new evidence.
- If a request contradicts product.md or an approved spec, say so before writing code.

## How to work
- Every non-trivial change goes through a spec. Do not start implementation tasks until requirements, design and tasks are approved.
- Every set of requirements includes testable **acceptance criteria**, **edge cases** and what is **out of scope**.
- If two rules in a spec contradict each other, flag it before implementing.
- Small steps: make one thing work, test it, then continue. Do not build anything that is not in an approved spec.
- Before using a library, check its current documentation.
- If something blocks you after two attempts, stop and explain the problem instead of trying more variations.

## After each task
Explain to Luis Miguel, in Spanish and briefly:
1. What you did, in one sentence.
2. Which files changed.
3. How to check it works (exact commands or steps).

When finishing each task of a spec, include `tasks.md` (its status marker) in the commit of that task.

## Reviews
- Classify findings as Critical / High / Medium / Low.
- Critical and High are fixed in the same branch. Medium depends on cost.
- **Low goes to the "Pendientes" section of `PLAN.md`**, unless it takes under two minutes.
- If a proposal is discarded, record it in `docs/decisiones.md` under "Rechazado" with the reason.
