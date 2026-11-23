---
inclusion: fileMatch
fileMatchPattern: ["packages/web/src/view/**/*", "packages/web/*.html", "packages/web/public/**/*", ".kiro/specs/scenic-web/**/*"]
---

# Visual changes and animations

These rules apply to any change that affects what the demo website looks like or how it moves: layout, CSS, SVG art, animations, transitions, the gate, the HUD panel and the scenic or simple view.

Why: on 19-20 Nov 2026 the same animation needed three rounds of fixes (PR 70) because "done" was never defined, we approved a happy-path video instead of the real page, and the director ended up being the only real test. These rules exist so a visual change is right the first time.

## 1. Layer table before any code

Before writing code, write a table in Markdown and wait for the director's explicit "yes" in words.

- Rows: every layer the change touches (for example: background, house SVG, ghosts, gate, HUD panel, footer).

- Columns: second 0 (house not loaded yet), while loading, during the animation, at the end, after reload.

- Each cell answers three questions: is it visible? does it move? does it change the page height or the scroll position?

Do not start implementation until the table is approved.

## 2. Test on the real page

Prove the idea on the real page, using `npm run dev` in `packages/web`: the scenic view is the default page, and `?view=simple` opens the simple view. A standalone mock-up or isolated HTML file is not enough.

## 3. Fixed verification matrix

Before saying a visual task is done, check every cell below with Playwright and report the result of each one. If any cell fails, the task is not done.

| Check | Required |
|---|---|
| Viewports | 1920x1080, 1366x768, 2560x1440 and 390 px wide (mobile) |
| Slow conditions | Slow network and 4x CPU slowdown (Playwright with CDP throttling) |
| Height and scroll over time | Read page height with `document.documentElement.scrollHeight` and `window.scrollY`, sampled every 100 ms from navigation to the end of the animation |
| Reload | Normal reload, and reload while scrolled down |
| Motion toggle | Turn Motion off halfway through the animation |
| Reduced motion | `prefers-reduced-motion: reduce` |
| Simple view | The simple view still works and looks unchanged |

The director's screen is 1920x1080 in Brave. If the director describes a bug, reproduce it exactly there first, then propose a cause.

## 4. Measurable "done"

Acceptance criteria for visual work are numbers, never "looks good". Examples:

- "Page height does not change by more than 0 px between second 0 and the end of the animation."

- "The gate is fully visible within 1.5 s at 1920x1080 with 4x CPU slowdown."

- "No horizontal scroll at 390 px."

## 5. One fix per block of work

One fix per task and per commit. Do not stack several visual fixes that replace each other. If a fix does not pass the matrix, say so instead of trying another variation (see `working-rules.md`: stop after two attempts).

## 6. Extras have a time limit

Decorative extras (particles, glows, extra animation steps) get at most two rounds. If they are not right after two rounds, simplify or remove them and record the decision in `docs/decisiones.md`.

## 7. Report

In the PR description, include the matrix from section 3 with a pass or fail per cell, and attach the screenshots or measurements with their full paths.
