# Implementation Plan: Scenic web

## Overview

`packages/web` gets a second Renderer, the Scenic_Renderer, in `packages/web/src/view/scenic/`, built in the order of the design's "PR Split": 13 stacked pull requests in four stages. Stage 1 (PRs 1a to 1f) builds the renderer choice, the HUD shell, the tokens, the fonts, the Source_Scan rules, the Scene_Layout, the Camera, the scene illustration, the first Wisp and the tooling (Size_Check, Shots_Script, Gallery), and ends with the Vertical Slice Gate. Stage 2 (2a to 2c) adds the three Ghost_Types, the Floor_Scene and the Telephone. Stage 3 (3a, 3b) adds the exorcism room, the Grimoire, the Reactions and the Exorcised_Moment. Stage 4 (4a, 4b) adds the Finale, the live Search_Beam, Lightning, the Reduced_Motion audit, the responsive polish and the switch to the scenic view as the default.

Pure rules live in `src/view/scenic/model/` and are tested in Vitest's Node environment. DOM modules are covered by `npm run build`, the Source_Scan, the hand-run Shots_Script and the manual checks in each PR body. No file under `packages/core/`, `packages/web/src/sample/` or `packages/web/public/sirv-license.txt` changes; under `packages/web/src/logic/` only `texts.ts` and `powerTexts.ts` change, by additions only (Requirement 2).

**`tasks.meta.json`:** if Kiro creates `.kiro/specs/scenic-web/tasks.meta.json`, it is committed together with `tasks.md` and is never added to `.gitignore`.

## Pull requests

- 13 stacked pull requests, one per group below, in this order: 1a, 1b, 1c, 1d, 1e, 1f, 2a, 2b, 2c, 3a, 3b, 4a, 4b (decision Q1). Each branch is created from the tip of the previous one: `git checkout <previous branch>` then `git checkout -b <new branch>`. PR 1a is created from an up-to-date `main`. PRs 1a to 1f are merged, so PR 2a is also created from an up-to-date `main` (`git checkout main`, `git pull`, `git checkout -b feat/scenic-web-2a`); PRs 2b onward are stacked as described.
- PRs 1a to 1f and PR 2a target `main`; every PR from 2b on targets the previous PR's branch until that one is merged. After each merge, retarget the next pull request with `gh pr edit <number> --base main`.
- The director (Luis Miguel) merges, in order, each with "Create a merge commit" (no squash, no rebase merge). Kiro never merges.
- Reviews happen per stage, not per PR (decision Q1).
- Each PR body fills `.github/pull_request_template.md` and carries the size warning: the whole spec is about 10,000 changed lines, split into 13 stacked PRs of at most about 900 lines each (decision Q1), plus this PR's line count measured with `git diff --shortstat`. Tests are never cut to fit the size.
- Each PR body lists the shots it adds (decision Q2; design section "Shots").
- Each PR body includes the Requirement 2 check: `git diff --stat <base branch> -- packages/web/src/logic packages/web/src/sample packages/core packages/web/public/sirv-license.txt` shows only `texts.ts` and `powerTexts.ts` (or nothing).

## Working rules for every task

- Kiro runs a task only when the director says so, and asks permission before modifying code.
- Run every command from the repository root, in PowerShell. Before the first commit of a session, check the branch with `git branch --show-current` (the branch of the group in progress; never `main`).
- One task = one commit. Exceptions: task 1.1 and tasks done by the director by hand have no commit of their own. The commit message is in English, conventional style like the repo history (`feat(web):`, `test(web):`, `chore:`, `refactor(web):`, `docs:`). If a message needs an "and", it is two commits.
- Before each commit run `npm run check` (lint, format check, build, `npm run size` from PR 1f on, tests) and fix what fails. A task is done only when it exits `0`.
- Before each commit, mark the task `[x]` in this file and include `tasks.md` (and `tasks.meta.json` when it exists) in that same commit. Tasks done by the director by hand are marked `[x]` in the next Kiro commit.
- If a task gets stuck, add an entry to `docs/frictions.md` the same day, in its own `docs:` commit. If something fails after two attempts, stop and explain the problem.
- If a task goes over about 200 changed lines, stop and ask the director how to split it.
- Never run `npm audit fix`. The only new dependencies are the three of the design: `@fontsource/creepster` 5.3.0, `@fontsource/im-fell-english` 5.3.0 and `playwright` 1.65.1, exact versions only (no `^` or `~`), with `package-lock.json` in the same commit.
- Scripts must work on Windows PowerShell: only Node tools, no `rm -rf` or shell-only syntax.
- Do not touch `requirements.md` or `design.md` of this spec, nor any file under `packages/core/`, `packages/web/src/sample/` or `packages/web/public/sirv-license.txt`. Under `packages/web/src/logic/` change only `texts.ts` and `powerTexts.ts`, and only by adding keys (Requirements 2.1 to 2.3). Under `src/view/simple/` change only what tasks 1.12, 10.1 and 16.8 say (Requirement 2.10).
- New texts are additions only: no existing key of `TEXTS` or `POWER_TEXTS` changes value or disappears (Requirement 2.2). Every text that names the Kiro Power goes in `powerTexts.ts`.
- Dark launch (decision Q14): until task 16.8, `chooseView` returns `"scenic"` only for `?view=scenic`, the Simple_Renderer stays the default, the Scenic_View_Link points to `?view=scenic`, and the Shots_Script opens `/haunted-repo/?view=scenic`.
- Relative imports use the `.js` extension, except in `packages/web/scripts/*.ts`, which import `.ts` files (Node runs them directly).
- Tests sit next to the code as `*.test.ts`; helpers are `*.testutil.ts`. No snapshot files. Tests that build a controller stub the global `fetch` to throw in `beforeEach`. Tests that read files start with `/// <reference types="node" />`.
- Every property test is one `it` with `fc.assert(fc.property(...), { numRuns: 100 })` or more, with the comments `// Feature: scenic-web, Property N: <title>` and `// **Validates: Requirements ...**`.
- Scenic TypeScript uses `window.setTimeout` and stores a `number`; no `requestAnimationFrame`, no `setInterval` (Requirement 20.3).
- Before using an API of Vite, Vitest, fast-check, Playwright, Fontsource or the `FontFace` API that the repo does not use yet, check its current documentation.

## Decisions taken from the design

These are settled by the approved design and are not reopened in these tasks:

- 13 stacked PRs, reviews per stage (Q1); partial shot lists until stage 4 (Q2).
- Telephone_Target in floor order, then report order inside each floor (Q3). Variant = index modulo 5 (Q4).
- No SVG or CSS filters anywhere; the rim light is a stroke path (Q5).
- The 20 s Rings stop after the first `start-ghost` of the page load, whatever control sent it (Q17).
- Dark launch until PR 4b (Q14). Temporary art in stage 1 is only visible behind `?view=scenic` (Q15).
- The HUD footer's Licence_Notice link is the last Tab stop in every Scene (Q16).
- `npm ci` never downloads a browser; Chromium is installed by hand once (Q27).
- D1 to D14 as written in the design section "Decisions Left to the Design".

## Tasks

### Stage 1

- [x] 1. PR 1a — Renderer choice and HUD shell
  - Branch: `feat/scenic-web-1a`. Stacks on: `main` (created from an up-to-date `main`).
  - Estimate: ~850 changed lines. Model: Auto.
  - _Design: "PR Split" row 1a_

  - [x] 1.1 Create the branch from an up-to-date main
    - Check that the pull request "docs(scenic-web): tasks" (branch `feat/scenic-web-tasks`, which commits `tasks.md` and `tasks.meta.json` if it exists) is merged into `main`.
    - Run `git switch main`, then `git pull --ff-only`, then check that `git status --short` prints nothing.
    - Run `git switch -c feat/scenic-web-1a`.
    - This task makes no commit of its own. It is marked `[x]` in the commit of task 1.2.
    - _Requirements: none (git workflow)_

  - [x] 1.2 Add the View_Choice with the dark-launch rule
    - Create `packages/web/src/viewChoice.ts`: `ViewName` and `chooseView(search)`. During the dark launch it returns `"scenic"` only when `new URLSearchParams(search).get("view") === "scenic"`, and `"simple"` otherwise. It reads only the query string, never changes the address and stores nothing.
    - Create `packages/web/src/viewChoice.test.ts` with examples of the interim rule: no `view` gives `"simple"`; `?view=scenic` gives `"scenic"`; `?view=SCENIC` and `?view=` give `"simple"`; `?view=scenic&view=simple` gives `"scenic"`; `?view=simple&view=scenic` gives `"simple"`; a hash and other parameters do not change the choice.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the view choice behind a dark launch`
    - _Requirements: 1.7, 1.8_
    - _Design: "Renderer choice and CSS loading", "Dark launch (director decision Q14)"_

  - [x] 1.3 Property test for the View_Choice
    - **Property 12: The view is simple only for an exact first value**
    - **Validates: Requirements 1.1, 1.2, 1.3** (in its final form after task 16.8; until then it checks the dark-launch rule of decision Q14)
    - Generator of the design: query strings from random parameters (names `view`, `View`, `x`; values `simple`, `SIMPLE`, `simple `, ``, `scenic` and `fc.string()`; repeated `view` parameters in any order; optional leading `?`), at least 100 runs.
    - During the dark launch the expected value is `"scenic"` exactly when `new URLSearchParams(search).get("view") === "scenic"`. Task 16.8 changes the expectation to the design's: `"simple"` exactly when the first value is `"simple"`.
    - Tag: `// Feature: scenic-web, Property 12: The view is simple only for an exact first value`.
    - Test file: `packages/web/src/viewChoice.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the view choice reads only the first value`
    - _Requirements: 1.1, 1.2, 1.3_
    - _Design: "Correctness Properties", Property 12_

  - [x] 1.4 Add the first scenic texts
    - In `packages/web/src/logic/texts.ts` add, as new keys only: `tagline`, `viewLinks` (`simple`, `scenic`), `viewLoadFailed`, `floorButtonName(title, action)` and `nameplateName(path, floor, score, state, lockedLine)`, with the English values of the design section "New texts".
    - No existing key changes. Check with `git diff --numstat -- packages/web/src/logic/texts.ts`: 0 deleted lines.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add texts for the scenic shell`
    - _Requirements: 2.2, 4.2, 1.11, 3.6, 17.3_
    - _Design: "New texts"_

  - [x] 1.5 Add the action guard and the first generators
    - Create `packages/web/src/view/scenic/model/actionGuard.ts`: `ActionGuard` and `createActionGuard(onAction)` with `setModel`, `current` and `send` (forwards only when a model exists and `isAvailable(model, action)` is true; returns whether it sent).
    - Create `packages/web/src/view/scenic/model/viewModelArb.testutil.ts` with:
      - `actionArb`, complete as in the design "Generators" (13 `UserAction` types, model paths and free strings, the 3 floors, ratings, self-check answers, free URLs).
      - A **minimal** `viewModelArb`, needed now by P13 and P9: report from `uniquePathReportArb`; `house` from `buildLiveHouse(report)`, `buildSampleHouse(report, null)` or `null`; `status` from the 5 kinds with `fc.string()` text; `live` flags from `fc.boolean()`; `available` a random list built from `actionArb`; scene `house`; `ghost` and `transition` `null`. Task 3.1 replaces it with the full generator under the same export name, so P13 and P9 then run on the full generator without editing them.
    - Create `packages/web/src/view/scenic/model/actionGuard.test.ts` with examples: nothing is sent before the first model; an available action is sent once; an unavailable one is dropped; `submit-live` matches with any URL; the newest model is used after a second `setModel`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the scenic action guard`
    - _Requirements: 2.7, 2.8_
    - _Design: "scenic/model/actionGuard.ts", "Generators"_

  - [x] 1.6 Property test for the action guard
    - **Property 13: The renderer sends only available actions**
    - **Validates: Requirements 2.7, 2.8, 11.1**
    - Generator: sequences of `setModel` calls (from `viewModelArb`, minimal until task 3.1) and `send(action)` calls (from `actionArb`), at least 100 runs. Checks: an action is forwarded exactly when a model was set and `isAvailable(lastModel, action)` is true; nothing is forwarded before the first model.
    - Tag: `// Feature: scenic-web, Property 13: The renderer sends only available actions`.
    - Test file: `packages/web/src/view/scenic/model/actionGuard.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the scenic view sends only available actions`
    - _Requirements: 2.7, 2.8, 11.1_
    - _Design: "Correctness Properties", Property 13_

  - [x] 1.7 Add the HUD view
    - Create `packages/web/src/view/scenic/model/renderMemory.ts` with only `MeterView` and `meterScale(share)` (share clamped to 0..1, 4 decimals). Task 14.3 adds the rest of the module.
    - Create `packages/web/src/view/scenic/model/hudView.ts`: `HudView` without the Lightning_Toggle fields (task 15.5 adds them) and `hudView(model)`, which takes the meter from `house.progress` with `from` always `null`. Task 14.6 changes it to `hudView(model, effects)`.
    - Create `packages/web/src/view/scenic/model/hudView.test.ts` with examples: logo `TEXTS.pageTitle` and the tagline (4.2); licence (4.11); meter line and `meterScale` within 0.01 of `share` for the sample (4.3); no meter and no icons when `house` or `house.progress` is `null` (4.17); `total` icons with `total - haunted` exorcised icons first (4.4); `plaque.visible` follows `live.formVisible` (4.5, 4.6).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): map the view model to the scenic HUD`
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.11, 4.17_
    - _Design: "scenic/model/hudView.ts and scenic/model/grimoireView.ts", "scenic/model/renderMemory.ts"_

  - [x] 1.8 Property test for the HUD view
    - **Property 9: The HUD view follows the ViewModel**
    - **Validates: Requirements 4.8, 4.10, 4.13, 4.14, 4.15, 4.16, 14.4**
    - Generator: `viewModelArb` (minimal until task 3.1), at least 100 runs. Checks `statusText`, `plaque.visible`, `plaque.submitEnabled`, `showSample`, `powerLine` and `warnings` exactly as in the design.
    - Tag: `// Feature: scenic-web, Property 9: The HUD view follows the ViewModel`.
    - Test file: `packages/web/src/view/scenic/model/hudView.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the scenic HUD follows the view model`
    - _Requirements: 4.8, 4.10, 4.13, 4.14, 4.15, 4.16, 14.4_
    - _Design: "Correctness Properties", Property 9_

  - [x] 1.9 Build the HUD DOM
    - Create `packages/web/src/view/scenic/dom.ts`: `el(tag, attrs, children)`, text only through `textContent`.
    - Create `packages/web/src/view/scenic/hud.ts`, built once, with `update(hudView)` that changes only text, `hidden` and `disabled`: header (`h1.hud-logo`, `p.hud-tagline`, Haunt_Meter, Ghost_Icons as empty `aria-hidden` `span` elements with a `data-icon-state` attribute until task 9.7, Simple_View_Link `?view=simple`); aside (Live_Plaque form with the labelled field and submit button, `p.status` with `role="status"` and `aria-live="polite"`, `show-sample` button, Power line, report warnings); `footer` with the Licence_Notice; the Scenic_Announcer `p` with `aria-live="polite"`. The URL field is never replaced.
    - Imports from Core are `import type` only. No `innerHTML`. No test file: covered by the build, the Source_Scan and the PR manual checks.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): build the scenic HUD`
    - _Requirements: 1.6, 4.1, 4.2, 4.5, 4.6, 4.9, 4.10, 4.11, 4.13, 4.14, 4.15, 4.16, 25.9_
    - _Design: "DOM modules (scenic/*.ts)", shell layout, "Accessibility Design" (Structure)_

  - [x] 1.10 Add the scenic renderer shell and entry
    - Create `packages/web/src/view/scenic/renderer.ts`: `createScenicRenderer(root, onAction)` builds the shell once in the design's document order (`div.scenic` > header, aside, announcer, empty `main.stage`, `footer` last), owns the guard, and on `render(model)` calls `guard.setModel(model)` and `hud.update(hudView(model))`; it returns `void` and never awaits. Submitting the Live_Plaque (button or Enter) sends one `{ type: "submit-live", url }` with the field text as typed, through the guard; the button is disabled when `submit-live` is not available. The `show-sample` button sends through the guard.
    - Create `packages/web/src/view/scenic/entry.ts`: exports `createRenderer = createScenicRenderer` (CSS and fonts come in PR 1b).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the scenic renderer shell`
    - _Requirements: 1.5, 2.7, 2.8, 4.1, 4.7, 4.8, 4.9, 4.12, 4.15_
    - _Design: "One render, step by step", "Purely visual state of the Scenic_Renderer"_

  - [x] 1.11 Wire the renderer choice in `main.ts`
    - Create `packages/web/src/view/simpleEntry.ts`: imports `./simple/simple.css` and re-exports `createSimpleRenderer` as `createRenderer`.
    - Rewrite `packages/web/src/main.ts`: `chooseView(window.location.search)`, one dynamic `import()` of `./view/simpleEntry.js` or `./view/scenic/entry.js`, then one `createPage` with the same `PageDeps` for both, then `page.start()`; on import failure write `TEXTS.viewLoadFailed` into `#root` with `textContent`. `main.ts` imports no CSS.
    - In `packages/web/index.html` add `<meta name="color-scheme" content="dark">`.
    - Verify: `npm run check` exits `0`; `packages/web/dist/index.html` links no stylesheet; `npm run build` emits separate chunks for the two entries.
    - Commit message: `feat(web): load one renderer from the view choice`
    - _Requirements: 1.4, 1.5, 1.9, 1.10, 25.6_
    - _Design: "Renderer choice and CSS loading"_

  - [x] 1.12 Add the Scenic_View_Link to the Simple_Renderer
    - In `packages/web/src/view/simple/renderer.ts` add after the `h1` the link `a.view-link` with text `TEXTS.viewLinks.scenic` and `href` `?view=scenic` (dark launch; task 16.8 changes it to `./`). No other change to the Simple_Renderer.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): link the simple view to the scenic view`
    - _Requirements: 1.11, 2.10, 25.11_
    - _Design: "Simple_Renderer change (Scenic_View_Link)"_

  - [x] 1.13 Checkpoint and PR 1a
    - Update `PLAN.md` ("En curso": scenic-web PR 1a open; "Pendientes"; "Para retomar": next is PR 1b, task 2.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 1a`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat main -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-1a`. Write the body to `$env:TEMP\pr-scenic-web-1a-body.md` filling `.github/pull_request_template.md`, with the size warning and the measured count, the Requirement 2 check, and "Shots added: none". Manual check for the reviewer: `?view=scenic` shows the HUD shell; the default page is still the Simple_Renderer with a "Scenic view" link.
    - Run `gh pr create --base main --head feat/scenic-web-1a --title "feat: add the scenic view choice and HUD shell" --body-file $env:TEMP\pr-scenic-web-1a-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [x] 2. PR 1b — Tokens, base and HUD CSS, fonts, Source_Scan rules
  - Branch: `feat/scenic-web-1b`. Stacks on: `feat/scenic-web-1a`.
  - Estimate: ~880 changed lines. Model: Auto.
  - _Design: "PR Split" row 1b_

  - [x] 2.1 Add the Scenic_Tokens and the contrast test
    - Create `packages/web/src/view/scenic/styles/scenic-tokens.css` with every token of the design "Style Guide": the nine palette colours with exact hex values, `--sc-cold-blue`, `--sc-warm-orange`, `--sc-dawn`, the role tokens, the opacity tokens, the typography tokens (`--font-logo`, `--font-title`, `--font-body`, `--font-code`, sizes, leading), spacing, `--sc-touch`, the focus tokens, and the durations and easings of the "Animation Catalogue". Import it from `entry.ts`.
    - Create `packages/web/src/view/scenic/model/contrast.test.ts` (reads the tokens file with `node:fs`): the nine palette values are exact (letter case ignored); the named cold-blue, warm-orange and dawn tokens exist; every text pair of the design's contrast table is at least 4.5:1 and every UI pair at least 3:1 (WCAG formula); every font token ends with a generic family; the duration tokens match the catalogue (room-warm 1200 ms, Intro 1500 ms, every reduced fade 200 ms or less).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the scenic design tokens`
    - _Requirements: 22.4, 22.5, 17.11, 17.12, 21.6, 12.4, 16.1, 18.6_
    - _Design: "Style Guide" (Palette, Typography), "Contrast pairs"_

  - [x] 2.2 Source_Scan items 1 to 3
    - In `packages/web/src/source.test.ts` (additions only): item 1, `src/view/scenic/` has at least one `.ts` and one `.css` file and every scenic file is in `viewFiles`, so the existing rule "src/view imports Core only with import type" covers them; item 2, the raw-HTML pattern adds `DOMParser`, `createContextualFragment` and `setHTMLUnsafe` for every scanned file, with negative self-checks; item 3, no `.svg` file under `src/view/scenic/`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): scan the scenic files for raw HTML and svg files`
    - _Requirements: 2.6, 2.9, 22.3, 22.8, 22.9, 22.11, 25.9_
    - _Design: "Source_Scan additions" items 1 to 3_

  - [x] 2.3 Source_Scan items 4 and 5
    - Item 4: the Simple_Renderer CSS rules (no literal colour, no literal size, no `font-family` without `var(`, same exemptions) run on every CSS file under `src/view/scenic/` except `styles/scenic-tokens.css`; the test names each failing file; it checks that the tokens file exists, is skipped, and would break the colour rule if scanned.
    - Item 5: no non-test scenic TypeScript string literal holds a hex colour or a colour function, or is exactly a CSS named colour; `transparent`, `currentColor`, `none`, `inherit` and names like `"ghost--red-eyes"` pass. Self-checks for a hex value, a colour function and a named colour.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check scenic styles and strings use tokens only`
    - _Requirements: 22.5, 22.6, 22.7, 22.9_
    - _Design: "Source_Scan additions" items 4 and 5_

  - [x] 2.4 Source_Scan items 6, 7, 8 (placement) and 9
    - Item 6: every `@keyframes` block in scenic CSS sets only `transform` and `opacity`; every `transition` and `transition-property` names only `transform` or `opacity`, never `all`.
    - Item 7: no `requestAnimationFrame` and no `setInterval` in non-test scenic TypeScript.
    - Item 8, placement part: `animation` and `transition` declarations appear only inside `@media (prefers-reduced-motion: no-preference)` or `@media (prefers-reduced-motion: reduce)` blocks. The rule on the content of `reduce` blocks comes in task 16.4.
    - Item 9: no `filter`, `backdrop-filter` or `mix-blend-mode` other than `none` in scenic CSS.
    - Negative self-checks for each item.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check scenic motion rules`
    - _Requirements: 20.1, 20.2, 20.3, 18.4_
    - _Design: "Source_Scan additions" items 6 to 9, "Animation Catalogue"_

  - [x] 2.5 Source_Scan items 15, 16 and 17
    - Item 15: no scenic file imports `view/assets/` or `view/simple/`, and no simple file imports `view/scenic/`.
    - Item 16: no `fetch(` in scenic files.
    - Item 17: `packages/web/gallery.html` joins the presentation files (storage, raw HTML, external address, inline style, "Power"), read only if it exists; task 7.5 turns its existence into an assertion.
    - Negative self-checks for items 15 and 16.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check scenic imports and network use`
    - _Requirements: 22.10, 25.2, 25.3, 25.4, 25.8_
    - _Design: "Source_Scan additions" items 15 to 17, "Layers" (dependency rules)_

  - [x] 2.6 Add `base.css`
    - Create `packages/web/src/view/scenic/styles/base.css` (tokens only): page styles for `.scenic`, grid areas so the `footer` (last in the DOM) is drawn bottom left on wide screens and under the stage on narrow ones, body font `--font-body`, paths in `--font-code` with `overflow-wrap: anywhere`, the focus ring (2 px Pumpkin outline, offset and Night halo), touch targets of `--sc-touch` for buttons and non-inline links, the visually hidden Scenic_Announcer. Import it from `entry.ts`.
    - Verify: `npm run check` exits `0` (items 4 and 5 now scan this file).
    - Commit message: `feat(web): add the scenic base styles`
    - _Requirements: 17.6, 17.11, 17.13, 19.4, 21.3_
    - _Design: "Style Guide" (Typography), "Accessibility Design" (Focus, Touch targets)_

  - [x] 2.7 Add `hud.css`, the press transition and the wide breakpoint rule
    - Create `packages/web/src/view/scenic/styles/hud.css` (tokens only): solid Night HUD panels with a Brass line (never translucent), `.hud-logo` and `.hud-tagline` in `--font-logo`, `h1` to `h3` in `--font-title`, Haunt_Meter (Night track, Brass frame, cold-blue fill with `transform-origin` left), Ghost_Icons, Live_Plaque, Status_Region, warnings, Power line, `show-sample` button, Simple_View_Link; the HUD overlays the stage edges at `(min-width: 64rem)` and stacks above and below it under that width (Q9); the HUD column scrolls inside itself (Q22).
    - Create `packages/web/src/view/scenic/styles/motion.css` with the `press` transition (`button:active`) inside `@media (prefers-reduced-motion: no-preference)`.
    - Create `packages/web/src/view/scenic/model/camera.ts` with only `ViewportClass` and `WIDE_QUERY = "(min-width: 64rem)"`; task 3.13 adds the Camera functions.
    - Source_Scan item 12 (`var(--font-logo)` only in rules for `.hud-logo` and `.hud-tagline`; `h1, h2, h3` and `.finale-banner .line-1` use `var(--font-title)`, the latter checked once it exists) and item 18 (the CSS wide media query equals `WIDE_QUERY`).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): style the scenic HUD`
    - _Requirements: 4.18, 17.12, 17.13, 21.1, 21.2, 21.3, 19.1_
    - _Design: "Props and panels" (HUD panels, Haunt_Meter, Live_Plaque), "Source_Scan additions" items 12 and 18_

  - [x] 2.8 Bundle the display fonts
    - Check the current Fontsource docs. Add `@fontsource/creepster` 5.3.0 and `@fontsource/im-fell-english` 5.3.0 to `packages/web/package.json` with exact versions; commit `package-lock.json` in the same commit.
    - Create `packages/web/src/view/scenic/fonts.ts`: `loadScenicFonts()` imports only `files/creepster-latin-400-normal.woff2?url` and `files/im-fell-english-latin-400-normal.woff2?url`, creates each `FontFace` with weight 400, style normal and `display: "swap"`, adds it to `document.fonts` and ignores load errors. `entry.ts` calls it.
    - Source_Scan item 13: every `@fontsource/` specifier in `src/` is one of those two paths.
    - Verify: `npm run check` exits `0`; `packages/web/dist/` holds exactly two `.woff2` files and no `.woff` file.
    - Commit message: `feat(web): bundle the scenic display fonts`
    - _Requirements: 21.1, 21.2, 21.4, 21.5, 21.7_
    - _Design: "scenic/fonts.ts" row of "DOM modules", "Facts checked for this design" (Fontsource)_

  - [x] 2.9 Add the font credits and licence texts
    - Create `packages/web/public/fonts/CREDITS.txt` (Creepster: Copyright (c) 2011, Font Diner, Inc; IM Fell English: Copyright (c) 2010, Igino Marini; both SIL Open Font Licence), `OFL-creepster.txt` and `OFL-im-fell-english.txt` (the upstream OFL texts, decision Q11).
    - Create `packages/web/src/view/scenic/fonts.test.ts` (`node:fs`): the three files exist; the credits name both fonts, both holders and the SIL Open Font Licence.
    - Verify: `npm run check` exits `0`; `npm run build` copies the three files into `packages/web/dist/fonts/`.
    - Commit message: `docs(web): credit the scenic fonts`
    - _Requirements: 21.8_
    - _Design: "Folder layout" (public/fonts), "Facts checked for this design" (IM Fell English licence)_

  - [x] 2.10 Checkpoint and PR 1b
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 1c, task 3.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 1b`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-1a -- . ':(exclude)package-lock.json' ':(exclude)packages/web/public/fonts/OFL-*.txt'`.
    - Push with `git push -u origin feat/scenic-web-1b`. Body in `$env:TEMP\pr-scenic-web-1b-body.md` from the template, with the size warning and measured count, the Requirement 2 check, and "Shots added: none". Manual check: DevTools Network on `?view=scenic` shows the two woff2 files from the site itself; blocking them keeps the text visible.
    - Run `gh pr create --base feat/scenic-web-1a --head feat/scenic-web-1b --title "feat: add scenic tokens, base styles, fonts and source rules" --body-file $env:TEMP\pr-scenic-web-1b-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [x] 3. PR 1c — Scene_Layout and Camera with properties
  - Branch: `feat/scenic-web-1c`. Stacks on: `feat/scenic-web-1b`.
  - Estimate: ~860 changed lines. Model: Auto.
  - _Design: "PR Split" row 1c_

  - [x] 3.1 Complete the generators
    - In `packages/web/src/view/scenic/model/viewModelArb.testutil.ts` replace the minimal `viewModelArb` of task 1.5 with the full one of the design (same export name): report from `reportArb` or `uniquePathReportArb` with option `maxPerFloor`; `house` from `buildLiveHouse(report)` or `buildSampleHouse(report, { progress, step, scripted, startAllowed })` with `progressArb(report.ghosts)`, `fc.subarray` of the paths, `fc.constantFrom` of the 8 steps and `fc.boolean()`; `house: null` in about 1 run in 20; `scene` from house, floor and ghost; `available` built with the rules of `page.ts` (and `ghostActions` for the ghost scene); `status.kind` from the 5 kinds; an option that biases about a third of the sample houses to have every Card Locked or Exorcised (for P6).
    - Add `pageRunArb`: runs the real `createPage` with the committed `report.json`, `files.json` and either the committed `demo-script.json` or `fullScriptFor(report)`, a recording renderer, and a `detect` that returns a live report from `uniquePathReportArb`, an error or a throw; each number from `choicesArb` picks one action of `model.available` (a fixed URL for `submit-live`); it yields the list of consecutive models.
    - Create `packages/web/src/view/scenic/model/viewModelArb.test.ts`: one test with `fc.statistics` that logs the share of each `house.source`, Scene kind and GhostState, and asserts that each value appears.
    - Verify: `npm run check` exits `0` (P13 and P9 now run on the full generator).
    - Commit message: `test(web): add the scenic view model generators`
    - _Requirements: 23.8_
    - _Design: "Generators"_

  - [x] 3.2 Source_Scan item 10
    - In `source.test.ts`: `src/view/scenic/model/**` and `src/view/scenic/art/**` use no DOM name (`document`, `window`, `HTMLElement`) and import no CSS and no `?url` asset. Negative self-check.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): keep the scenic model free of the DOM`
    - _Requirements: 23.1_
    - _Design: "Source_Scan additions" item 10, "Layers"_

  - [x] 3.3 Add the floor geometry and `slotRects`
    - Create `packages/web/src/view/scenic/model/sceneLayout.ts` with the types (`GhostType`, `VariantNumber`, `Rect`, `SlotPlacement`, `FloorButtonView`, `NameplateView`, `Frame`, `SceneLayout`), `GHOST_TYPE_OF`, the floor rectangles and slot bands of the design "World geometry", the ghost boxes of the "Ghost types" table, and `slotRects(floor, count)` by the "Slot layout rule" (gap 8).
    - Create `packages/web/src/view/scenic/model/sceneLayout.test.ts` with examples: with 5 Cards the slots are 88 × 97 (attic), 72 × 207 (middle floor) and 100 × 142 (basement); `GHOST_TYPE_OF` maps attic, middle floor and basement to Wisp, Lantern_Wraith and Chained_Brute.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): place ghost slots inside each floor`
    - _Requirements: 23.3, 5.5_
    - _Design: "scenic/model/sceneLayout.ts (Scene_Layout)", "World geometry", "Slot layout rule"_

  - [x] 3.4 Add `sceneLayout`
    - In `sceneLayout.ts` add `sceneLayout(model)` with every rule of the design: slots by position, Variant `index % 5`, one `ghostScale` per floor, empty and dimmed floors, floor buttons, back button, Nameplates and empty line (Floor_Scene only), start controls (first Card of a repeated path), Telephone_Target in floor order then report order, Finale, heading, frame, close-up.
    - Extend `sceneLayout.test.ts` with examples: headings for house, `house` null (`TEXTS.pageTitle`), floor and ghost (3.8, 8.12, D1); a repeated path gives the first Card the start control and the Telephone_Target (23.9); the close-up falls back to Variant 0 when no Card matches; the close-up Ghost_Type follows `ghost.floor` (5.5).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): lay out the scenic scene from the view model`
    - _Requirements: 3.5, 3.6, 3.8, 3.9, 3.10, 5.5, 5.8, 5.11, 8.3, 8.4, 8.5, 8.6, 8.7, 8.12, 9.9, 13.1, 23.2, 23.4, 23.5, 23.6, 23.7, 23.9_
    - _Design: "scenic/model/sceneLayout.ts (Scene_Layout)"_

  - [x] 3.5 Property test for the Ghost_Slots
    - **Property 1: Every Card gets exactly one Ghost_Slot on its own floor**
    - **Validates: Requirements 3.5, 10.13, 12.5, 23.2**
    - Generator: `viewModelArb` with `reportArb` (repeated paths allowed), at least 100 runs. Checks one slot per Card position with the Card's floor, path and state; window lit exactly when the state is `"exorcised"`; no slot in the Ghost_Scene or when `house` is `null`.
    - Tag: `// Feature: scenic-web, Property 1: Every Card gets exactly one Ghost_Slot on its own floor`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check every card gets one ghost slot`
    - _Requirements: 3.5, 10.13, 12.5, 23.2_
    - _Design: "Correctness Properties", Property 1_

  - [x] 3.6 Property test for slot fit
    - **Property 2: Ghost_Slots fit their floor and never overlap**
    - **Validates: Requirements 23.3**
    - Generator: `fc.constantFrom` of the 3 floors and `fc.integer({ min: 1, max: 5 })`, plus `viewModelArb` with `maxPerFloor: 5` through `sceneLayout`, at least 100 runs. Checks every rectangle lies inside its floor rectangle and any two share an area of 0.
    - Tag: `// Feature: scenic-web, Property 2: Ghost_Slots fit their floor and never overlap`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check ghost slots fit and never overlap`
    - _Requirements: 23.3_
    - _Design: "Correctness Properties", Property 2_

  - [x] 3.7 Property test for start controls
    - **Property 3: Start controls exist only for startable Cards of the focused floor**
    - **Validates: Requirements 3.10, 6.6, 8.4, 8.5, 23.4**
    - Generator: `viewModelArb` with `uniquePathReportArb`, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 3: Start controls exist only for startable Cards of the focused floor`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check start controls follow the focused floor`
    - _Requirements: 3.10, 6.6, 8.4, 8.5, 23.4_
    - _Design: "Correctness Properties", Property 3_

  - [x] 3.8 Property test for Variants
    - **Property 4: The Variant depends only on the floor position**
    - **Validates: Requirements 5.8, 5.10, 5.11, 23.5**
    - Generator: `viewModelArb` with `maxPerFloor: 5`, and a mapper that rewrites the Cards' `path`, `score`, `reason`, `state` and `canStart` while keeping floors and order, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 4: The Variant depends only on the floor position`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check variants depend only on floor position`
    - _Requirements: 5.8, 5.10, 5.11, 23.5_
    - _Design: "Correctness Properties", Property 4_

  - [x] 3.9 Property test for the Telephone_Target
    - **Property 5: The Telephone_Target is the first startable Card**
    - **Validates: Requirements 9.9, 23.6**
    - Generator: `viewModelArb` with `uniquePathReportArb`, at least 100 runs. Checks floor order then report order, `null` when none or `house` null, and that `start-ghost` for the target is in `available`.
    - Tag: `// Feature: scenic-web, Property 5: The Telephone_Target is the first startable Card`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the telephone target is the first startable card`
    - _Requirements: 9.9, 23.6_
    - _Design: "Correctness Properties", Property 5_

  - [x] 3.10 Property test for the Finale decision
    - **Property 6: The Finale depends only on the current ViewModel**
    - **Validates: Requirements 13.1, 13.2, 13.6, 23.7**
    - Generator: `viewModelArb` with the Finale bias of task 3.1, at least 100 runs. Checks the exact condition and that two deep-equal ViewModels give the same value.
    - Tag: `// Feature: scenic-web, Property 6: The Finale depends only on the current ViewModel`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the finale depends only on the view model`
    - _Requirements: 13.1, 13.2, 13.6, 23.7_
    - _Design: "Correctness Properties", Property 6_

  - [x] 3.11 Property test for navigation controls
    - **Property 7: Navigation controls follow Available_Actions**
    - **Validates: Requirements 3.6, 8.2, 8.7, 8.13, 14.3**
    - Generator: `viewModelArb` restricted to House and Floor Scenes, `live.busy` true and false, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 7: Navigation controls follow Available_Actions`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check navigation controls follow available actions`
    - _Requirements: 3.6, 8.2, 8.7, 8.13, 14.3_
    - _Design: "Correctness Properties", Property 7_

  - [x] 3.12 Property test for Nameplates
    - **Property 8: Nameplates show every Card of the focused floor**
    - **Validates: Requirements 6.4, 6.5, 6.9, 8.3, 8.6, 17.3**
    - Generator: `viewModelArb` restricted to Floor_Scenes, at least 100 runs. Checks the fields, the accessible name with the locked line for Locked Cards, `emptyLine` and `emptyFloors`.
    - Tag: `// Feature: scenic-web, Property 8: Nameplates show every Card of the focused floor`.
    - Test file: `sceneLayout.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check nameplates show every card of the floor`
    - _Requirements: 6.4, 6.5, 6.9, 8.3, 8.6, 17.3_
    - _Design: "Correctness Properties", Property 8_

  - [x] 3.13 Add the Camera
    - In `packages/web/src/view/scenic/model/camera.ts` add `CameraTransform`, `frameRect`, `sceneArea`, `cameraFor` and `cssTransform` with the formulas and the "Camera frames" table of the design.
    - Create `packages/web/src/view/scenic/model/camera.test.ts`: every frame of the table, for both viewport classes, maps its floor (or the whole house) inside the scene area; the wide house frame is the identity; the scales match the design within 0.01; the camera duration token in `scenic-tokens.css` is 700 ms.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): frame the house and floors with the camera`
    - _Requirements: 3.1, 8.1, 8.8, 19.2_
    - _Design: "scenic/model/camera.ts", "Camera frames"_

  - [x] 3.14 Checkpoint and PR 1c
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 1d, task 4.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 1c`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-1b -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-1c`. Body in `$env:TEMP\pr-scenic-web-1c-body.md` from the template, with the size warning and measured count, the Requirement 2 check, and "Shots added: none".
    - Run `gh pr create --base feat/scenic-web-1b --head feat/scenic-web-1c --title "feat: add the scenic scene layout and camera" --body-file $env:TEMP\pr-scenic-web-1c-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [x] 4. PR 1d — Art system and the house
  - Branch: `feat/scenic-web-1d`. Stacks on: `feat/scenic-web-1c`.
  - Estimate: ~900 changed lines. Model: Opus.
  - _Design: "PR Split" row 1d_

  - [x] 4.1 Add Shape_Data and its rules test
    - Create `packages/web/src/view/scenic/art/shapes.ts`: `SVG_NS`, `ShapeKind`, `Keyword`, `ShapeNode` (as in "Data Models") and the builders `g`, `path`, `rect`, `circle`, `ellipse`, `poly`.
    - Create `packages/web/src/view/scenic/art/art.test.ts` with a tree walker that checks the Shape_Data rules: allowed kinds; class names and path data match the design regexes; `fill` and `stroke` only the four keywords; ids unique per tree; every `paint` and `clip` points to an id in the same tree. Example trees from the builders pass; a bad class and a bad path fail.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): describe scenic art as plain shape data`
    - _Requirements: 22.1, 17.1_
    - _Design: "Shape_Data (ShapeNode)", "Art modules (scenic/art/)"_

  - [x] 4.2 Mount Shape_Data as SVG
    - Create `packages/web/src/view/scenic/svg.ts`: `createSvgRoot(viewBox, className)` (the only place that creates an `svg`; sets `aria-hidden="true"`, `focusable="false"`, `viewBox`, `class`) and `mountShape(node, idPrefix)` (`document.createElementNS(SVG_NS, kind)` for every node; ids and `url(#...)` references prefixed; `part` written as `data-part`; no markup parsing).
    - No test file (DOM): covered by the build and the Source_Scan.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): mount shape data with createElementNS`
    - _Requirements: 17.2, 22.2, 22.3_
    - _Design: "svg.ts (DOM)", "Accessibility Design" (Structure)_

  - [x] 4.3 Draw the sky, weather and foreground
    - Create `packages/web/src/view/scenic/art/sky.ts`: `skyLayers()` (L0 sky gradient, moon and halo, cloud bands in `clouds-left` and `clouds-right` groups, far and near hills), `weatherLayer()` (`rain-wrap` > `rain`, two fog bands) and `foregroundLayer()` (fence and 3 gravestones on the left, dead tree on the right, rim paths), following "Depth layers" and "World geometry".
    - Extend `art.test.ts`: the three trees pass the Shape_Data rules.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the scenic sky and foreground`
    - _Requirements: 3.3, 22.1_
    - _Design: "Depth layers (back to front)", "World geometry"_

  - [x] 4.4 Draw the house shell
    - Create `packages/web/src/view/scenic/art/house.ts` with `houseLayer()`: walls, roof with the off-centre ridge, chimney, crooked tower, attic oculus, cut ground line, rim paths, with one group per floor whose rectangle matches the Scene_Layout floor rectangles.
    - Extend `art.test.ts`: the tree passes the rules; the house layers are not a mirror image about the vertical centre line (3.4); each floor group's rectangle equals the Scene_Layout floor rectangle.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the haunted house shell`
    - _Requirements: 3.1, 3.4, 22.1_
    - _Design: "House composition", "World geometry"_

  - [x] 4.5 Draw the rooms
    - In `house.ts` add the room contents: attic (rafters, cobwebs, trunk), Entrance_Hall (front door, transom window, telephone table), Parlour (fireplace, shelves, portrait), basement (stone walls, boiler, pipes, chains).
    - Extend `art.test.ts`: the tree still passes the rules; the Entrance_Hall is left of the Parlour (3.2).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): furnish the rooms of the haunted house`
    - _Requirements: 3.1, 3.2, 22.1_
    - _Design: "House composition"_

  - [x] 4.6 Checkpoint and PR 1d
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 1e, task 5.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 1d`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-1c -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-1d`. Body in `$env:TEMP\pr-scenic-web-1d-body.md` from the template, with the size warning and measured count, the Requirement 2 check, and "Shots added: none".
    - Run `gh pr create --base feat/scenic-web-1c --head feat/scenic-web-1d --title "feat: draw the scenic sky and haunted house" --body-file $env:TEMP\pr-scenic-web-1d-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [x] 5. PR 1e — Stage, slots and the finished Wisp
  - Branch: `feat/scenic-web-1e`. Stacks on: `feat/scenic-web-1d`.
  - Estimate: ~820 changed lines. Model: Opus.
  - _Design: "PR Split" row 1e_

  - [x] 5.1 Draw the Wisp, Variant 0
    - Create `packages/web/src/view/scenic/art/ghosts.ts` with the Wisp entry of `GHOST_TYPES` and `ghostArt("wisp", 0, "haunted")`, exactly as in "The Wisp, Variant 0": outline (parts `outline`, `hem-round`), inner shade, eyes, glints, mouth, cobweb (part `cobweb`), rim, glow (part `glow`), floor shadow, inside a `g.ghost-idle` wrapper.
    - Extend `art.test.ts`: the tree passes the rules; it has the parts `outline`, `hem-round`, `cobweb` and `glow`, and no `tail-spiral`, `hood` or `horns`; eye height over body height is 11/64; its box equals the Wisp box of the Scene_Layout.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the wisp ghost`
    - _Requirements: 5.1, 5.4, 6.1, 22.1_
    - _Design: "The Wisp, Variant 0 (the vertical-slice ghost)", "Ghost types"_

  - [x] 5.2 Draw slots, windows and chained doors
    - Create `packages/web/src/view/scenic/art/props.ts` with `slotArt(slot)` and `chainedDoorArt(floor)`: every slot has its back-wall window (sizes of the "Slot layout rule"), lit for Exorcised Cards and unlit otherwise; a Haunted attic slot draws the Wisp scaled by its `ghostScale`; until task 9.3, middle-floor and basement slots draw only their window, and attic Cards always use Variant 0 (Q15); a floor with no Card gets the chained door (no padlock).
    - Extend `art.test.ts`: window lit exactly for Exorcised slots; a Haunted attic slot has a `glow` part; the chained door has no padlock part; all trees pass the rules.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw ghost slots, windows and chained doors`
    - _Requirements: 3.5, 6.1, 8.6, 12.5, 22.1_
    - _Design: "Slot layout rule", "Ghost states", "Props and panels" (Chained door)_

  - [x] 5.3 Watch the media queries
    - Create `packages/web/src/view/scenic/motion.ts`: `watchMedia(query, onChange)` with `matchMedia(...).addEventListener("change", ...)`, used for `WIDE_QUERY` and `(prefers-reduced-motion: reduce)`. Task 16.3 completes the Reduced_Motion handling.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): watch the viewport and motion settings`
    - _Requirements: 18.9, 19.2_
    - _Design: "motion.ts" row of "DOM modules"_

  - [x] 5.4 Build the stage
    - Create `packages/web/src/view/scenic/stage.ts`: `.stage` > `.world` > `svg.house` (layers in the "Art System" order: sky, moon-clouds, hills, house, slots, dims, telephone placeholder group, weather, foreground, effects) plus `.world-overlay`; the slot layer is rebuilt only when `slotSignature` changes; one `rect.dim` per floor; sets `data-scene`, `data-floor`, `data-finale` and `data-busy` on `.stage`; sets `style.transform` (from `cssTransform(cameraFor(...))`) and `--cam-counter` on `.world`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): build the scenic stage and camera wrapper`
    - _Requirements: 3.1, 3.5, 3.9, 8.9, 17.2_
    - _Design: "Art System", "stage.ts" row of "DOM modules", "Camera frames"_

  - [x] 5.5 Style the stage
    - Create `packages/web/src/view/scenic/styles/stage.css` (tokens only): wide stage `width: min(100vw, 160dvh)` at 16:10, narrow square stage, `.world` with `transform-origin: 0 0`, `.world-overlay`, layer classes (sky, moon, clouds, hills, walls, rooms, rim with its opacity token, foreground), dims with `--sc-dim`, `.scene-bar` heading.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): style the scenic stage and house`
    - _Requirements: 3.1, 19.1, 19.2, 19.4_
    - _Design: "Camera frames", "Depth layers", "House composition"_

  - [x] 5.6 Style the Wisp
    - Create `packages/web/src/view/scenic/styles/ghosts.css` (tokens only) with the Wisp classes (body Spectral, shade, eyes, glints, cobweb, rim), the cold-blue glow gradient stops, the lit and unlit window classes and the chained door.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): colour the wisp from the tokens`
    - _Requirements: 5.4, 6.1, 12.5_
    - _Design: "Palette", "Ghost states", "Glows"_

  - [x] 5.7 Add the first ambient motion
    - In `motion.css`, inside `@media (prefers-reduced-motion: no-preference)`: `rain-fall`, `fog-drift`, `window-flicker` (oculus) and `wisp-bob`, with the durations of the "Animation Catalogue". Under `@media (prefers-reduced-motion: reduce)`: rain still at `--sc-rain-still`, fog at `--sc-fog-still`, oculus still (no animation).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): animate rain, fog and the wisp`
    - _Requirements: 5.7, 6.2, 18.4_
    - _Design: "Animation Catalogue", D9_

  - [x] 5.8 Wire the stage into the renderer
    - In `renderer.ts`: every render computes `sceneLayout(model)`, updates the stage (slots, dims, empty floors, camera frame for the current viewport class from `watchMedia(WIDE_QUERY)`, no animation on the first render), and shows the Scene_Heading (`h2.scene-heading`, `tabindex="-1"`) with `layout.heading` in `.scene-bar`. Import `stage.css` and `ghosts.css` from `entry.ts`.
    - Verify: `npm run check` exits `0`; `?view=scenic` in `npm run dev -w @haunted-repo/web` (run by the director) shows the house with Wisps in the attic.
    - Commit message: `feat(web): draw the house scene in the scenic view`
    - _Requirements: 3.1, 3.5, 3.8, 3.9, 8.10_
    - _Design: "One render, step by step", "Vertical Slice Gate"_

  - [x] 5.9 Checkpoint and PR 1e
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is task 6.1 for the director, then PR 1f, task 7.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 1e`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-1d -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-1e`. Body in `$env:TEMP\pr-scenic-web-1e-body.md` from the template, with the size warning and measured count, the Requirement 2 check, and "Shots added: none".
    - Run `gh pr create --base feat/scenic-web-1d --head feat/scenic-web-1e --title "feat: add the scenic stage and the first wisp" --body-file $env:TEMP\pr-scenic-web-1e-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [x] 6. Setup before PR 1f (Kiro, once, with the director's permission)
  - [x] 6.1 Install Chromium for Playwright
    - **Kiro runs this itself, and asks the director's permission once, before the screenshot tasks of PR 1f (7.7, 7.8).** Command, from the repository root: `npx playwright@1.65.1 install chromium`. It downloads about 150 MB, once per machine. The version is pinned so the browser matches the `playwright` package that task 7.6 adds.
    - `npm ci` never downloads a browser, neither in CI nor in the deploy job nor on this machine (decision Q27). Without this step, `npm run shots` stops with `Chromium for Playwright is not installed. Run: npx playwright install chromium`.
    - No commit of its own; Kiro marks it `[x]` in the next commit after the install succeeds.
    - _Requirements: 24.2, 24.3_
    - _Design: "Shots_Script (npm run shots)", decision Q27_

- [x] 7. PR 1f — Size_Check, Shots_Script, Gallery
  - Branch: `feat/scenic-web-1f`. Stacks on: `feat/scenic-web-1e`.
  - Estimate: ~800 changed lines. Model: Auto.
  - _Design: "PR Split" row 1f, "Tooling"_

  - [x] 7.1 Add the pure Size_Check rules
    - Create `packages/web/src/tooling/distRules.ts` (no relative import, no Node import): move `hasExternalAddress` and `SVG_NAMESPACES` here from `source.test.ts`, which now imports them with its self-check cases unchanged; add `checkDist(files)` returning `{ total, limit: 307200, counted, problems }` and the report and missing-dist messages, by the rules of the design "Size_Check".
    - Create `packages/web/src/tooling/distRules.test.ts` with examples: the missing-dist message names `npm run build` (20.6); the report line prints the total and the 307,200-byte limit (20.8); exactly 307,200 bytes fails; a `gallery` file name or the `data-scenic-gallery` marker is a problem (24.9); `index.html` with `rel="stylesheet"` is a problem (1.9).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the dist size and address rules`
    - _Requirements: 1.9, 1.10, 20.6, 20.7, 20.8, 20.9, 24.9_
    - _Design: "Size_Check (npm run size)"_

  - [x] 7.2 Property test for the Size_Check
    - **Property 18: The Size_Check fails exactly on budget or address problems**
    - **Validates: Requirements 20.7, 20.9**
    - Generator: lists of generated dist files (random names with extensions from the counted list, `.html`, `.txt` and `.map`; random gzipped sizes; texts that may contain `https://`, a protocol-relative `//` in `url(...)`, or the SVG namespace), at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 18: The Size_Check fails exactly on budget or address problems`.
    - Test file: `packages/web/src/tooling/distRules.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the size check fails only on real problems`
    - _Requirements: 20.7, 20.9_
    - _Design: "Correctness Properties", Property 18_

  - [x] 7.3 Add the `npm run size` script
    - Create `packages/web/scripts/size.ts` (I/O only, Node built-ins `node:fs`, `node:path`, `node:url`, `node:zlib`): resolves `packages/web/dist` from its own URL, walks it, gzips each counted file at the default level, reads HTML, CSS and SVG as text, calls `checkDist`, prints the report and exits `0` or `1`. It imports `../src/tooling/distRules.ts`.
    - Root `package.json`: add `"size": "node packages/web/scripts/size.ts"`; `check` becomes `npm run lint && npm run format:check && npm run build && npm run size && npm test`.
    - Verify: `npm run check` exits `0` and prints the measured total.
    - Commit message: `chore: add the gzip size check to npm run check`
    - _Requirements: 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 25.10_
    - _Design: "Size_Check (npm run size)"_

  - [x] 7.4 Add the shot list
    - Create `packages/web/src/tooling/shotList.ts` (pure): state ids, the two sizes `1440x900` and `390x844`, and `<state>-<width>x<height>.png` file names. In this PR it lists only the stage-1 states `01-house`, `16-reduced-house` and `19-gallery` (decision Q2).
    - Create `packages/web/src/tooling/shotList.test.ts`: the names are unique and each contains its state id and its size; the current list has 3 states × 2 sizes. Task 16.7 changes the expectation to 19 × 2 = 38.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): list the screenshots to take`
    - _Requirements: 24.4, 24.5, 24.10_
    - _Design: "Shots (Requirement 24.4, 24.5, 24.10)"_

  - [x] 7.5 Add the dev-only Gallery
    - Create `packages/web/gallery.html` (head, `<div id="gallery" data-scenic-gallery></div>`, module script `/src/view/scenic/gallery/gallery.ts`) and `packages/web/src/view/scenic/gallery/gallery.ts`: imports the scenic CSS and fonts, sets `data-motion="still"`, and draws the art that exists now (the Wisp, Variant 0, Haunted) with HTML labels as plain strings. Task 9.8 fills the full grid.
    - In `source.test.ts` make the existence of `gallery.html` an assertion of item 17.
    - Verify: `npm run check` exits `0`; `npm run size` reports no Gallery problem (the build input stays `index.html`).
    - Commit message: `feat(web): add a dev-only ghost gallery`
    - _Requirements: 24.8, 24.9, 25.2, 25.3, 25.4_
    - _Design: "Gallery (dev only)"_

  - [x] 7.6 Add Playwright and the `shots` script entry
    - Check the current Playwright docs. Add `playwright` 1.65.1 (exact) to the root `devDependencies`; commit `package-lock.json` in the same commit. No `@playwright/browser-chromium`.
    - Root `package.json`: `"shots": "npm run build -w @haunted-repo/core && npm run build -w @haunted-repo/web && node packages/web/scripts/shots.ts"` (D12). `check`, `test` and `.github/workflows/*` do not run it.
    - Add `packages/web/shots/` to `.gitignore` and `.prettierignore`.
    - Create a first `packages/web/scripts/shots.ts` that only checks `dist/` exists (message naming `npm run build`) and exits.
    - Verify: `npm run check` exits `0`.
    - Commit message: `chore: add playwright for hand-run screenshots`
    - _Requirements: 24.1, 24.2, 24.3, 24.7, 24.11_
    - _Design: "Shots_Script (npm run shots)", D12, decision Q27_

  - [x] 7.7 Run the servers and fake GitHub in the Shots_Script
    - In `shots.ts`: start `preview()` on port 4179 and `createServer()` plus `listen()` on port 5179 in the script's own process; a `try/finally` and a `SIGINT` handler close the browser, the dev server and the preview `httpServer`; `step(name, fn)` prints `Shots failed at step "<name>": <message>`, cleans up and exits `1`; `page.setDefaultTimeout(10_000)`; a missing Chromium prints the install command.
    - `context.route` for every non-local request: `https://api.github.com/...` `OPTIONS` gets 204 with the CORS headers of the design; other GitHub requests go to Core's strict `createFakeGitHub` with the committed `files.json`, adding `User-Agent: playwright-shots` only when missing, plus the CORS and expose headers; anything else is aborted; a hold hook for the busy shot.
    - Verify: `npm run check` exits `0` (type check through `tsc -p scripts`).
    - Commit message: `feat(web): serve the page and fake GitHub for screenshots`
    - _Requirements: 24.11, 24.13, 24.14, 24.15_
    - _Design: "Shots_Script (npm run shots)" (Servers, No real GitHub, Timeouts and errors)_

  - [x] 7.8 Take the stage-1 screenshots
    - In `shots.ts`: for each size, open `/haunted-repo/?view=scenic` (dark launch) and take `01-house`; a second context with `reducedMotion: "reduce"` takes `16-reduced-house`; the Gallery page on the dev server takes `19-gallery`. Before each shot wait until no finite animation or transition runs, run the required checks (at most 15 running animations; no filtered element with animations in its subtree) and the warnings (svg without `aria-hidden`, focusable element in an svg, small targets, horizontal scroll at 390 px), then `page.screenshot({ path, animations: "disabled" })` into `packages/web/shots/`. At the end print the number of PNG files written; exit `1` after writing every file if a required check failed.
    - Verify: `npm run check` exits `0`; `npm run shots` (needs task 6.1) writes 6 PNG files and exits `0`.
    - Commit message: `feat(web): take the first scenic screenshots`
    - _Requirements: 20.2, 20.4, 24.4, 24.5, 24.6, 24.10, 24.12_
    - _Design: "Shots_Script (npm run shots)" (Flow per viewport, Stable frames, Checks, End)_

  - [x] 7.9 Checkpoint and PR 1f
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is the Vertical Slice Gate, task 8.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 1f`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-1e -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-1f`. Body in `$env:TEMP\pr-scenic-web-1f-body.md` from the template, with the size warning and measured count, the Requirement 2 check, and "Shots added: `01-house`, `16-reduced-house`, `19-gallery` (Wisp only), each at 1440x900 and 390x844". The body tells the director to run `npx playwright install chromium` once before `npm run shots` (decision Q27).
    - Run `gh pr create --base feat/scenic-web-1e --head feat/scenic-web-1f --title "chore: add the size check, screenshots and gallery" --body-file $env:TEMP\pr-scenic-web-1f-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [x] 8. Vertical Slice Gate (STOP)
  - [x] 8.1 Director review of the vertical slice
    - **STOP.** Kiro runs `npm run shots`. The director (Luis Miguel) reviews the screenshots in `packages/web/shots/`: `01-house` and `16-reduced-house` at 1440x900 and 390x844, and the Gallery with the Wisp (`19-gallery`).
    - Approved on 18 Nov 2026: the director merged PR #59 (the scene illustration), after PR 1f. Group 9 may start.
    - No commit of its own; marked `[x]` in the docs PR of 19 Nov.
    - _Requirements: 24.4, 24.8_
    - _Design: "Vertical Slice Gate"_

### Stage 2

- [x] 9. PR 2a — Ghost_Types, Variants, states, Bestiary
  - Branch: `feat/scenic-web-2a`. Stacks on: an up-to-date `main` (PR 1f is merged and task 8.1 is approved); the PR targets `main`.
  - Estimate: ~700 changed lines (task 9.1 is withdrawn). Model: Auto (Opus only with the director's yes).
  - Split on 19 Nov (director): part 1 = PR #62 (9.2, 9.3, 9.4, 9.8 and the visual fixes); part 2 = 9.5, 9.6, 9.7, 9.9 on branch `feat/scenic-web-2a-2` from main.
  - _Design: "PR Split" row 2a_

  - [x] 9.1 (Withdrawn 19 Nov: the three Ghost_Types already exist at Variant 0 with their tests since PR #59)

  - [x] 9.2 Add Variants 1 to 4
    - In `art/ghosts.ts` add `VARIANTS` with the scale, tilt and eye style of the "Variants" table, the same five for all three types, and let `ghostArt` take Variant 0 to 4 (today it accepts only 0). Variants differ by scale, tilt and eye style only, with no accessories (Requirement 5.9 asks for at least one of size, tilt, eyes and accessory). `EYE_STYLES` holds five eye styles shared by the three types, built from the existing eye shapes (the `ghost-eye` ellipse with its `ghost-eye-glow` circle): the pair of the reference at Variant 0 and four more that change only the size, tilt or spacing of those shapes. The Lantern_Wraith keeps its `lantern` and the Chained_Brute its `shackles` and `chain` at every Variant.
    - Extend `art.test.ts`: any two Variants of one type differ; at every Variant the size order of 5.6 (Wisp smallest outline, Chained_Brute widest) and the small-eye rule (eye height under 5 % of the box height) hold; each type keeps its own part at every Variant (`lantern`; `shackles` and `chain`; the Wisp has none of them); every tree passes the Shape_Data rules.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add five variants per ghost type`
    - _Requirements: 5.6, 5.9_
    - _Design: "Variants (Requirement 5.9)"_

  - [x] 9.3 Draw Locked and Exorcised slots on every floor
    - In `art/props.ts`: `slotArt` draws each Card with its own Variant (`slot.variant`; the Variant 0 limit of decision Q15 ends here), and `ghostArt` takes the `locked` look. A Locked Card is its ghost in `look-locked` inside the Cloche (bell jar with parts `cloche` and `padlock`, Brass base), as in "Ghost states", the same Cloche for every Locked Card up to scale. An Exorcised Card (director's decision, 19 Nov) draws no ghost (6.7), in one slot-exorcised group (the target of slot-return, task 14.9) a small lit candle standing at the slot bottom (`candle`, with a `flame` part) and a warm-orange radial pool of light around it (`candle-light`, 6.8), sized so it reads at house scale over the dark illustration. No window is drawn anywhere.
    - Extend `art.test.ts` (updating the two stage-1 tests that say Locked and Exorcised slots draw nothing; the no-window check stays): each slot draws the Variant of its Card; Haunted slots have a `glow` part; the Cloche subtree is the same for every Locked slot up to its scale and lies inside the slot; Exorcised slots have no ghost part and have a `candle` and a `candle-light` part; all 3 types × 5 Variants × 3 states pass the Shape_Data rules.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw locked and exorcised ghosts`
    - _Requirements: 6.1, 6.3, 6.7, 6.8, 6.10, 22.1_
    - _Design: "Ghost states", "Props and panels"_

  - [x] 9.4 Style the Locked and Exorcised states
    - In `styles/ghosts.css` (tokens only) add only the styles still missing: `look-locked` with `--sc-locked`, the Cloche glass and padlock, the candle wax and flame, and the warm-orange light stops. The Lantern_Wraith and Chained_Brute parts are already styled.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): colour the locked and exorcised states`
    - _Requirements: 6.1, 6.3, 6.8_
    - _Design: "Palette", "Ghost states"_

  - [x] 9.5 Finish the idle motion rules
    - Source_Scan item 11 first: the `@keyframes` `wisp-float`, `wraith-sway` and `brute-heave` already exist in `motion.css` with their `.ghost--<type> .ghost-idle` rules; the test asserts that they exist and that their bodies differ.
    - In `motion.css` (no-preference block): `flame-flicker` for the `.flame` of the Exorcised candle (`--sc-dur-flame-flicker`), and no idle animation on Locked ghosts (`.look-locked .ghost-idle`). Remove the unused tokens `--sc-dur-bats-fly` and `--sc-dur-window-flicker` from `scenic-tokens.css`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): flicker the exorcised candle`
    - _Requirements: 5.7, 6.2, 18.4_
    - _Design: "Animation Catalogue", "Source_Scan additions" item 11_

  - [x] 9.6 Add the Bestiary texts and the texts test
    - In `texts.ts` add `bestiary` (`title`, `names`, `ranges`, `rangeLine`) with the design values (additions only).
    - Create `packages/web/src/view/scenic/model/scenicTexts.test.ts`: three Bestiary entries in the order Wisp, Lantern_Wraith, Chained_Brute with names, floor titles from `TEXTS.floorTitles` and ranges; for each range `floorOf(low)` and `floorOf(high)` return its floor; every new `TEXTS` key added so far exists; every `POWER_TEXTS` addition contains "Power".
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the bestiary texts`
    - _Requirements: 2.2, 7.1, 7.2, 7.3, 7.5_
    - _Design: "New texts", "Test files" (scenicTexts.test.ts)_

  - [x] 9.7 Add the Bestiary and the ghost icons to the HUD
    - Create `packages/web/src/view/scenic/bestiary.ts`: `section.bestiary` with `h2` "Bestiary" and three list entries (small `aria-hidden` SVG of Variant 0 in the Haunted look, still; name in `strong`, floor title and range line as HTML text); below 64rem a `button` with `aria-expanded` and `aria-controls` folds the list (closed at load, D2).
    - In `hud.ts` add the Bestiary in every render, and replace the Ghost_Icon spans of task 1.9 with tiny `aria-hidden` SVGs (Candle flame for exorcised, Spectral Wisp head for haunted), exorcised first. Bestiary and icon styles in `hud.css`.
    - Extend `art.test.ts`: the Bestiary art is Variant 0 in the Haunted look for any input.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the bestiary and ghost icons to the HUD`
    - _Requirements: 4.4, 4.12, 5.12, 7.1, 7.4, 7.5, 7.6_
    - _Design: "Props and panels" (Bestiary, Ghost_Icons), D2, decision Q31_

  - [x] 9.8 Fill the Gallery grid
    - In `gallery/gallery.ts` (today: the three types at Variant 0, Haunted) draw 3 Ghost_Types × 5 Variants × 3 states (Haunted, Locked in its Cloche, Exorcised candle) with HTML labels, using `ghostArt` and the slot drawings of `art/props.ts`.
    - Verify: `npm run check` exits `0`; `npm run shots` writes the full `19-gallery`.
    - Commit message: `feat(web): show every ghost variant in the gallery`
    - _Requirements: 24.8_
    - _Design: "Gallery (dev only)"_

  - [x] 9.9 Checkpoint and PR 2a
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 2b, task 10.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 2a`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat main -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-2a`. Body in `$env:TEMP\pr-scenic-web-2a-body.md` from the template, with the size warning and measured count, the Requirement 2 check, and "Shots added: none new; `19-gallery` now shows the full 3 × 5 × 3 grid and `01-house` shows every ghost type".
    - Run `gh pr create --base main --head feat/scenic-web-2a --title "feat: add the three ghost types, variants and bestiary" --body-file $env:TEMP\pr-scenic-web-2a-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [ ] 10. PR 2b — Floor_Scene, Camera moves, Nameplates, focus
  - Branch: `feat/scenic-web-2b`. Stacks on: `feat/scenic-web-2a`.
  - Estimate: ~700 changed lines. Model: Auto.
  - _Design: "PR Split" row 2b_

  - [x] 10.1 Move the focus rule to `view/shared`
    - Move `packages/web/src/view/simple/focus.ts` and `focus.test.ts` to `packages/web/src/view/shared/` with no code change; update the imports in `simple/renderer.ts`, `simple/house.ts` and `simple/ghost.ts` (`../shared/focus.js`) and the test's relative paths.
    - Verify: `npm run check` exits `0`; the moved test has the same assertions.
    - Commit message: `refactor(web): move the focus rule to view/shared`
    - _Requirements: 2.10, 17.10, 25.11_
    - _Design: "view/shared/focus.ts (moved)"_

  - [ ] 10.2 Add the scenic focus rule
    - Create `packages/web/src/view/scenic/model/scenicFocus.ts`: `ScenicFocusTarget` and `scenicFocusAfterRender(prev, next, before, layout)` with the three rules of the design (from the Ghost_Scene to the start button key when it is in `layout.startControls`; any other transition to the Scene_Heading; no transition delegates to `focusAfterRender`).
    - Create `packages/web/src/view/scenic/model/scenicFocus.test.ts` with the real controller: house to floor gives the Scene_Heading; ghost to floor after `leave-ghost` gives `start-ghost:<path>`; after an exorcism gives the Scene_Heading; transition `null` follows `focusAfterRender`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the scenic focus rule`
    - _Requirements: 17.7, 17.8_
    - _Design: "scenic/model/scenicFocus.ts"_

  - [x] 10.3 Build the scene controls
    - Create `packages/web/src/view/scenic/sceneControls.ts`, rebuilt every render from `sceneLayout`: `.scene-bar` (Scene_Heading `h2` with `tabindex="-1"`, taken over from task 5.8, and "Back to the house"), `nav.floor-stair` (one button per floor button, visible label the title, `aria-label` the accessible name), `ul.nameplates` (`article.nameplate` with `aria-label`, `data-ghost-state`, path in `--font-code`, reason, score line, state label, the always-visible locked line, and the start button with `aria-describedby` when `hasStart`; no focusable element on Locked Nameplates), the empty-floor line. Every control sends through the guard.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add floor buttons and nameplates`
    - _Requirements: 3.6, 3.7, 3.10, 6.4, 6.5, 6.6, 6.9, 6.10, 8.3, 8.4, 8.5, 8.6, 8.7, 8.9, 8.12, 8.13, 17.3_
    - _Design: "DOM modules" (sceneControls.ts), "Accessible names"_

  - [ ] 10.4 Apply focus after each render
    - In `renderer.ts`: record `FocusBefore` before the rebuild, apply `scenicFocusAfterRender` after it, then the safety net (if focus is on `body`, not connected, or inside `[hidden]` or `[inert]`, focus the Scene_Heading) before `render` returns. DOM order gives the tab order of the design table.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): move focus with the scenic scenes`
    - _Requirements: 17.4, 17.5, 17.7, 17.8, 17.9_
    - _Design: "scenic/model/scenicFocus.ts" (safety net), "Tab order per Scene"_

  - [ ] 10.5 Move the Camera between scenes
    - In `stage.ts` and `renderer.ts`: a render with a `transition` sets the new Camera transform (the CSS transition runs from the current position, so a newer render wins); a `transition` of `null` keeps the framing; the two other floors are dimmed in a Floor_Scene. In `motion.css`: the `camera` and `floor dim` transitions (700 ms, `cubic-bezier(0.65, 0, 0.35, 1)`) in the no-preference block; under `reduce` the Camera has no transition (instant cut) and the dim is a 150 ms opacity fade.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): move the camera to each floor`
    - _Requirements: 8.1, 8.2, 8.8, 8.10, 8.11, 18.3_
    - _Design: "Camera frames", "Animation Catalogue", D3_

  - [x] 10.6 Style the Floor_Scene controls
    - In `stage.css` (tokens only): scene bar, floor stair at the stage positions of "World geometry", Nameplate rail (Night backing, Brass notched border, state label colours), narrow layout under 64rem, touch targets, no horizontal scroll at 360 px.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): style the floor scene controls`
    - _Requirements: 8.3, 17.12, 17.13, 19.4, 21.3_
    - _Design: "Props and panels" (Nameplate), "World geometry"_

  - [x] 10.7 Add the floor screenshots
    - In `shotList.ts` and `shots.ts` add `02-floor-attic`, `03-floor-middle`, `04-floor-basement` and `17-reduced-floor-attic`; update the `shotList` test count.
    - Verify: `npm run check` exits `0`; `npm run shots` exits `0`.
    - Commit message: `feat(web): screenshot the floor scenes`
    - _Requirements: 24.4, 24.5_
    - _Design: "Shots", "Flow per viewport"_

  - [ ] 10.8 Checkpoint and PR 2b
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 2c, task 11.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 2b`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-2a -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-2b`. Body in `$env:TEMP\pr-scenic-web-2b-body.md` from the template, with the size warning and measured count, the Requirement 2 check, "Shots added: `02-floor-attic`, `03-floor-middle`, `04-floor-basement`, `17-reduced-floor-attic`, each at both sizes", and the manual check: keyboard only through house and floors; `?view=simple` focus behaves as before.
    - Run `gh pr create --base feat/scenic-web-2a --head feat/scenic-web-2b --title "feat: add the floor scene, camera moves and nameplates" --body-file $env:TEMP\pr-scenic-web-2b-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [ ] 11. PR 2c — Telephone
  - Branch: `feat/scenic-web-2c`. Stacks on: `feat/scenic-web-2b`.
  - Estimate: ~630 changed lines. Model: Auto (Opus only with the director's yes).
  - _Design: "PR Split" row 2c_

  - [ ] 11.1 Add the telephone texts
    - In `texts.ts` add `phone` (`answer`, `answerWaiting`, `quiet`, `ring`) with the design values (additions only); extend `scenicTexts.test.ts` so the new keys are checked.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the telephone texts`
    - _Requirements: 2.2, 9.7, 9.10, 9.14_
    - _Design: "New texts"_

  - [ ] 11.2 Add the Telephone state machine
    - Create `packages/web/src/view/scenic/model/phoneBell.ts`: `PhoneInputs`, `PhoneEvent`, `PhoneEffect`, `PhoneState`, `phoneStep(state, event)` and `callWaiting(state)`, following the state diagram of the design.
    - Create `packages/web/src/view/scenic/model/phoneBell.test.ts` with examples: Opening_Rings after `intro-ended` with a sample target (9.2); no Opening_Rings when the first render has no target; the 20 s Rings stop after a `ghost-started` that did not come from the Answer_Button (9.3, Q17); the Live_Call starts on busy then done with a live report and stops on answer, other report, error or busy, not on Scene changes (9.5); `answered` yields `stop` (9.12); `callWaiting` (9.14).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): decide when the telephone rings`
    - _Requirements: 9.2, 9.3, 9.5, 9.6, 9.12, 9.14_
    - _Design: "scenic/model/phoneBell.ts", D13, decision Q17_

  - [ ] 11.3 Property test for the Telephone
    - **Property 15: After the first start the Telephone rings only for an exorcism**
    - **Validates: Requirements 9.3, 9.4, 9.12**
    - Generator: sequences of `PhoneEvent` values (renders with random `PhoneInputs`, timer ends, answers, ghost starts, exorcised moments, return-glow ends), at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 15: After the first start the Telephone rings only for an exorcism`.
    - Test file: `phoneBell.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the telephone rings only when it should`
    - _Requirements: 9.3, 9.4, 9.12_
    - _Design: "Correctness Properties", Property 15_

  - [ ] 11.4 Draw the Ring effects
    - The telephone is painted in the illustration, at `TELEPHONE_ANCHOR` (536, 611); the page does not redraw it. In `art/props.ts` add `ringEffectsArt()`: only the vibration arcs (`phone-lines`, 3 on each side, Bone) and the Pumpkin radial glow (`phone-glow`) around that point, with no handset and no base, no logo and no text. `stage.ts` mounts it in the existing `telephone` layer.
    - Extend `art.test.ts`: the tree passes the rules, has the `phone-lines` and `phone-glow` parts, has no handset or base part, and is centred on `TELEPHONE_ANCHOR`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the ring effects over the telephone`
    - _Requirements: 9.1, 22.1_
    - _Design: "Props and panels" (Telephone, Ring)_

  - [ ] 11.5 Add the phone widget
    - Create `packages/web/src/view/scenic/phoneWidget.ts`: `.phone-widget` with the `aria-hidden` "RING!" bubble, the Answer_Button (visible "Answer the phone", `aria-label` from `callWaiting`, updated in the same render) and the Phone_Bubble. It sits in `.world-overlay` for the house and middle-floor frames and in `.scene-dock` for attic and basement (D14), same element and tab place. Activation: live report shows `house.powerLine` and sends nothing; sample with a Telephone_Target sends `start-ghost` for it through the guard; otherwise shows `TEXTS.phone.quiet`; the bubble text is announced through the Scenic_Announcer and stays until the next Scene change or activation. Styles in `stage.css` (Phone_Bubble Bone backing, Night text).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the answer the phone button`
    - _Requirements: 9.7, 9.8, 9.9, 9.10, 9.11, 9.14, 17.4, 17.5_
    - _Design: "DOM modules" (phoneWidget.ts), D14_

  - [ ] 11.6 Ring the Telephone from the renderer
    - In `renderer.ts`: send `render` events with `PhoneInputs` every render; send `intro-ended` at the first House_Scene render (the Intro is cut, so the Opening_Rings start there, D13); send `ghost-started` whenever any `start-ghost` is sent (Answer_Button or Nameplate start button, Q17) and `answered` on the Answer_Button; run the effects with `window.setTimeout` (2 s per Ring, 20 s waits) and the `is-ringing` class; timers read `guard.current()` when they fire.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): ring the telephone in the house scenes`
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.12, 2.7_
    - _Design: "Purely visual state of the Scenic_Renderer" (phone), "scenic/model/phoneBell.ts"_

  - [ ] 11.7 Animate the Ring
    - In `motion.css`: `phone-buzz`, `phone-glow`, `ring-pop`, `bubble-in` and the counter-scale transition in the no-preference block; under `reduce`, while Ringing, the "RING!" bubble and the glow are shown still (glow at 0.6), with no lines.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): animate the ringing telephone`
    - _Requirements: 9.6, 9.13, 18.4, 20.1_
    - _Design: "Animation Catalogue" (phone rows)_

  - [ ] 11.8 Checkpoint and PR 2c
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is the time check, group 12, then PR 3a, task 13.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 2c`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-2b -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-2c`. Body in `$env:TEMP\pr-scenic-web-2c-body.md` from the template, with the size warning and measured count, the Requirement 2 check, "Shots added: none new", and the manual check: rings at load and every 20 s until a ghost is started; answering starts the first ghost; a live report starts the Live_Call.
    - Run `gh pr create --base feat/scenic-web-2b --head feat/scenic-web-2c --title "feat: add the ringing telephone" --body-file $env:TEMP\pr-scenic-web-2c-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [ ] 12. Time check, 23 Nov 2026 (conditional)
  - Do this check on 23 Nov 2026, whatever task is in progress. It sits before PR 3a because stage 2 should be merged by then. If PRs 2a, 2b and 2c are all merged into `main` on 23 Nov 2026, write "Not triggered" under tasks 12.2 and 12.5 and mark them `[x]` with no other change.
  - If they are not all merged, run tasks 12.2 and 12.5 as commits on the branch in progress (the newest open PR branch, or `feat/scenic-web-3a` if it is about to start) and list them in that PR's body. Cut 1 is already approved by the director (design "Cut List"). Cut 2 is withdrawn and cut 3 was applied on 19 Nov (tasks 12.3 and 12.4). **Cut 4 is NOT pre-approved**: it needs a new director decision and is not a task here.
  - These tasks are conditional, not optional: they run when the time check triggers.
  - _Design: "Cut List", "PR Split" (Time check)_

  - [ ] 12.1 Run the time check
    - On 23 Nov 2026 ask the director whether PRs 2a, 2b and 2c are merged, and write the answer under this task ("Triggered" or "Not triggered").
    - No commit of its own; it is marked `[x]` in the next commit.
    - _Requirements: none (planning)_

  - [ ] 12.2 Conditional cut 1: reuse Variant 0 for the Lantern_Wraith and the Chained_Brute
    - Only if task 12.1 says "Triggered". In `art/ghosts.ts` Variants 1 to 4 of the Lantern_Wraith and the Chained_Brute reuse Variant 0 (the same scale, tilt and eye style); the Variant numbers still follow the position, so P4 still passes. In `art.test.ts` the "Variants differ" check (5.9) applies to the Wisp only; the size order of 5.6 and "each type keeps its own part" still run at every Variant. The Gallery shows repeated cells.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): reuse variant 0 for the wraith and the brute`
    - _Requirements: 5.9, 23.5_
    - _Design: "Cut List" order 1_

  - [x] 12.3 (Withdrawn 19 Nov: the window flicker no longer exists and the bats are painted, still, in the illustration)

  - [x] 12.4 Conditional cut 3: drop the Intro
    - Applied 19 Nov (director): the Intro is cut now, ahead of the time check. Tasks 16.1 and 16.2 are withdrawn. The renderer keeps sending `intro-ended` at the first House_Scene render, so the Opening_Rings start there (D13). Requirement 16 is "WHERE the Intro is built", so 18.2 and the Intro part of 17.14 are empty. The Shots flow has no Intro step.
    - _Requirements: 16.1, 18.2, 17.14_
    - _Design: "Cut List" order 3, D13_

  - [ ] 12.5 Conditional: record cut 1 in `docs/decisiones.md`
    - Only if task 12.1 says "Triggered". Add one line for cut 1 (it changes 5.9 and the "different look" part of 23.5 for the middle floor and the basement), with the date and the director's pre-approval. Cut 3 is already recorded (19 Nov) and cut 2 is withdrawn. Spanish is allowed.
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: record the scenic-web time-check cut`
    - _Requirements: none (decision record)_
    - _Design: "Cut List"_

### Stage 3

- [ ] 13. PR 3a — Room and Grimoire
  - Branch: `feat/scenic-web-3a`. Stacks on: `feat/scenic-web-2c`.
  - Estimate: ~900 changed lines. Model: Auto (Opus only with the director's yes).
  - _Design: "PR Split" row 3a_

  - [ ] 13.1 Add the Grimoire view
    - Create `packages/web/src/view/scenic/model/grimoireView.ts`: `GrimoireBlock`, `GrimoireView` and `grimoireView(model)` (`null` outside the Ghost_Scene), blocks in the Simple_Renderer order, labels from `TEXTS.actionLabels` as in `simple/ghost.ts`, `litCandles` by Requirement 10.9, Answer_Box key `${path}\n${questionNumber}`.
    - Create `packages/web/src/view/scenic/model/grimoireView.test.ts`: for every ghost step reached with the committed script, the texts and titles (10.2), the Answer_Box (10.3), the code (10.6), the licence directly after the code (10.7, 25.5), the lit candles (10.9) and the Answer_Box key rule (10.10).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): map the ghost view to the grimoire`
    - _Requirements: 10.2, 10.3, 10.4, 10.6, 10.7, 10.9, 10.10, 10.12, 25.5_
    - _Design: "scenic/model/hudView.ts and scenic/model/grimoireView.ts"_

  - [ ] 13.2 Property test for the Grimoire choices
    - **Property 17: Grimoire choices follow Available_Actions**
    - **Validates: Requirements 10.4, 10.12**
    - Generator: `viewModelArb` restricted to Ghost_Scenes, plus every step of a real `pageRunArb` run, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 17: Grimoire choices follow Available_Actions`.
    - Test file: `grimoireView.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check grimoire choices follow available actions`
    - _Requirements: 10.4, 10.12_
    - _Design: "Correctness Properties", Property 17_

  - [ ] 13.3 Draw the exorcism room
    - Create `packages/web/src/view/scenic/art/room.ts` with `roomArt()`: the close-up room (viewBox `0 0 800 800`), window with rain, Night floor and vignette, three Question_Candles (`qcandle` with `flame-wrap`), cold and warm light overlays (`room-light-cold`, `room-light-warm`), the `sparks` group (12 diamonds) and the smoke "?" (`smoke-q`).
    - Extend `art.test.ts`: the tree passes the rules and has exactly three Question_Candles.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the exorcism room`
    - _Requirements: 10.1, 10.8, 22.1_
    - _Design: "Art System" (Close-up room), "Props and panels" (Question_Candles)_

  - [ ] 13.4 Source_Scan item 14
    - In `source.test.ts`: no `.value` read and no `input` or `change` listener in `src/view/scenic/grimoire.ts` (the test asserts the file exists from task 13.6 on; until then it skips only that existence check), and no scenic file reads `answerBox.value` or listens to it. Negative self-check.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the scenic answer box text is never read`
    - _Requirements: 10.11, 25.1_
    - _Design: "Source_Scan additions" item 14_

  - [ ] 13.5 Build the Ghost_Scene
    - Create `packages/web/src/view/scenic/ghostScene.ts`: the `.room` layer created on entering the Ghost_Scene and kept for the visit (`room` state), the close-up ghost (`.ghost-vigour` > `.ghost-react` > `svg` > `.ghost-idle`) with `layout.closeUp`, lit candles from `litCandles`, removal after the leave fade. In `renderer.ts` and `stage.ts`: `.world`, `.scene-dock`, `.floor-stair`, `.nameplates` and `.scene-bar` are `inert` in the Ghost_Scene; the Telephone group is `visibility: hidden` and the phone widget hidden and out of the tab order; the house loops are paused.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): open the close-up exorcism room`
    - _Requirements: 5.11, 9.1, 9.7, 10.1, 10.8, 10.9, 10.13, 17.14, 20.4_
    - _Design: "DOM modules" (ghostScene.ts), "Animation Catalogue" (Ghost_Scene pause)_

  - [ ] 13.6 Build the Grimoire
    - Create `packages/web/src/view/scenic/grimoire.ts`: `section.grimoire` from `grimoireView` with the heading as focus target, the Answer_Box `textarea` with its label (kept while its key is unchanged, new and empty otherwise; never reads `.value`; no `input` or `change` listener), one button per choice sending through the guard, the Code_Block `pre` with `tabindex="0"`, and the Licence_Notice right after it, outside its scroll.
    - Verify: `npm run check` exits `0` (item 14 now covers the file).
    - Commit message: `feat(web): draw the grimoire panel`
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.10, 10.11, 10.12, 17.6, 25.1, 25.5_
    - _Design: "DOM modules" (grimoire.ts), "Props and panels" (Grimoire)_

  - [ ] 13.7 Style the room and the Grimoire
    - Create `packages/web/src/view/scenic/styles/room.css` (tokens only): room backdrop, Grimoire page (Slate backing, Brass corners, IM Fell English headings), choice rows with the Pumpkin `clip-path` marker, Code_Block max height from a token with its own scroll, Grimoire beside the drawing at 64rem and above and under it below (D10). In `motion.css`: room enter and leave and candle light transitions, with the reduced 150 ms fades.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): style the exorcism room and grimoire`
    - _Requirements: 10.6, 17.12, 17.13, 19.3, 19.4_
    - _Design: "Props and panels" (Grimoire), "Animation Catalogue", D10_

  - [ ] 13.8 Add the room screenshots
    - In `shotList.ts` and `shots.ts` add `05-ghost-explaining`, `06-ghost-asking`, `11-ghost-failed` and `18-reduced-ghost-asking`, driving the sample flow of the design; update the `shotList` test count.
    - Verify: `npm run check` exits `0`; `npm run shots` exits `0`.
    - Commit message: `feat(web): screenshot the exorcism room`
    - _Requirements: 24.4, 24.5_
    - _Design: "Shots", "Flow per viewport"_

  - [ ] 13.9 Checkpoint and PR 3a
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 3b, task 14.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 3a`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-2c -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-3a`. Body in `$env:TEMP\pr-scenic-web-3a-body.md` from the template, with the size warning and measured count, the Requirement 2 check, "Shots added: `05-ghost-explaining`, `06-ghost-asking`, `11-ghost-failed`, `18-reduced-ghost-asking`, each at both sizes", any time-check cuts of group 12, and the manual check: exorcise `bench/static.js` with the keyboard only.
    - Run `gh pr create --base feat/scenic-web-2c --head feat/scenic-web-3a --title "feat: add the exorcism room and grimoire" --body-file $env:TEMP\pr-scenic-web-3a-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [ ] 14. PR 3b — Reactions, Exorcised_Moment, Return_Glow, Haunt_Meter rules
  - Branch: `feat/scenic-web-3b`. Stacks on: `feat/scenic-web-3a`.
  - Estimate: ~780 changed lines. Model: Auto.
  - _Design: "PR Split" row 3b_

  - [ ] 14.1 Add the Reaction rules
    - Create `packages/web/src/view/scenic/model/reactions.ts`: `ReactionKind`, `Vigour`, `VIGOUR_START`, `REACTION_MS`, `reactionFor`, `vigourAfterAction`, `vigourAfterRender` and `vigourStyle`, as in the design.
    - Create `packages/web/src/view/scenic/model/reactions.test.ts`: `reactionFor` gives a Reaction only for `rate` and `dont-know` (`self-check` `half` gives none); `vigourAfterRender` resets on entering `failed` (11.6); every `REACTION_MS` value is at most 1000 (11.10).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): decide how the ghost reacts`
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.10_
    - _Design: "scenic/model/reactions.ts"_

  - [ ] 14.2 Property test for the ghost's limits
    - **Property 14: The close-up ghost stays within its size and opacity limits**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.7**
    - Generator: sequences of `UserAction` values from `actionArb`, applied with `vigourAfterAction`, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 14: The close-up ghost stays within its size and opacity limits`.
    - Test file: `reactions.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the ghost stays within its limits`
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7_
    - _Design: "Correctness Properties", Property 14_

  - [ ] 14.3 Add the render memory
    - In `packages/web/src/view/scenic/model/renderMemory.ts` add `VisualMemory`, `RenderEffects`, `EMPTY_MEMORY` and `nextMemory(memory, model)` with the rules of the design (frozen list meter in the Ghost_Scene, `from` only after a Ghost_Scene with moments and a non-null previous list progress, moments on a real Haunted-to-Exorcised change with the same source, Finale `shown`, `animate`, `announce`).
    - Create `packages/web/src/view/scenic/model/renderMemory.test.ts` with examples: "Show the sample again" with exorcised Cards shows them lit with no moment and no meter move; "Not yet" keeps the Card Exorcised and still gives a Return_Glow.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): remember what the scenic view showed last`
    - _Requirements: 4.3, 4.4, 12.1, 12.2, 12.6, 12.7, 12.8, 13.7, 13.8_
    - _Design: "scenic/model/renderMemory.ts"_

  - [ ] 14.4 Property test for the Haunt_Meter
    - **Property 10: The Haunt_Meter shows the last list values while a ghost is open**
    - **Validates: Requirements 4.3, 4.4, 4.17, 12.6, 12.7**
    - Generator: `pageRunArb`, its models fed in order to `nextMemory`, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 10: The Haunt_Meter shows the last list values while a ghost is open`.
    - Test file: `renderMemory.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the haunt meter freezes while a ghost is open`
    - _Requirements: 4.3, 4.4, 4.17, 12.6, 12.7_
    - _Design: "Correctness Properties", Property 10_

  - [ ] 14.5 Property test for one-shot moments
    - **Property 11: One-shot moments start once and only on a real change**
    - **Validates: Requirements 12.1, 12.2, 12.8, 13.7**
    - Generator: `pageRunArb`, at least 100 runs.
    - Tag: `// Feature: scenic-web, Property 11: One-shot moments start once and only on a real change`.
    - Test file: `renderMemory.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check one-shot moments start once`
    - _Requirements: 12.1, 12.2, 12.8, 13.7_
    - _Design: "Correctness Properties", Property 11_

  - [ ] 14.6 Feed the HUD from the render memory
    - Change `hudView(model)` to `hudView(model, effects)`: the meter and the Ghost_Icons come from `effects.meter` (frozen in the Ghost_Scene, animated `from` after a Return_Glow). Update the calls in `renderer.ts`, the unit tests of task 1.7 and the P9 call (same assertions); add examples for the frozen meter and icons. `hud.ts` animates the fill from `from` to the new scale.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): freeze the haunt meter during an exorcism`
    - _Requirements: 4.3, 4.4, 12.6, 12.7_
    - _Design: "scenic/model/hudView.ts and scenic/model/grimoireView.ts", "scenic/model/renderMemory.ts"_

  - [ ] 14.7 Play the Reactions
    - In `ghostScene.ts` and `renderer.ts`: a ghost action sent through the guard updates `vigour` and starts its Reaction class on `.ghost-react` (a new action jumps the playing one to its end and restarts the class); `start-ghost` and `retry` reset the vigour; entering `failed` resets it; `.ghost-vigour` takes `vigourStyle`; the Grimoire is never delayed and focus never moves for a Reaction.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): make the ghost react to answers`
    - _Requirements: 11.1, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 25.1_
    - _Design: "Purely visual state" (vigour, reaction), "Animation Catalogue" notes (Jumping to an end state)_

  - [ ] 14.8 Play the Exorcised_Moment and the Return_Glow
    - Create `packages/web/src/view/scenic/effects.ts` with the Return_Glow timer. In `renderer.ts` and `ghostScene.ts`: `effects.exorcisedMoments` starts the spiral, sparks and warm room (order of D6); a render in the same Scene lets it play, a Scene change jumps it to its end; `effects.returnGlow` adds `is-returning` to those slots for 800 ms, so the Exorcised candle and its light fade in (`slot-return`); send `exorcised-moment` and `return-glow-ended` to `phoneStep`, so one Ring follows the Return_Glow when a Telephone_Target exists (9.4).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): reward the exorcism with sparks and warm light`
    - _Requirements: 6.8, 9.4, 12.1, 12.3, 12.4, 12.6, 12.8, 12.9_
    - _Design: "effects.ts" row of "DOM modules", D5, D6_

  - [ ] 14.9 Animate Reactions and the exorcism
    - In `motion.css`: `react-recoil`, `react-shudder`, `react-laugh`, `react-puzzle`, `smoke-question`, the vigour transition, `exorcise-spiral`, `exorcise-sparks`, `room-warm`, `slot-return` (duration token `--sc-dur-slot-return`; rename the unused 800 ms light-up token of `scenic-tokens.css`) and the meter transition in the no-preference block; under `reduce`, `react-fade`, `ghost-fade-out` and the 200 ms fades of the catalogue, the meter instant, the vigour scale instant.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): animate reactions and the exorcised moment`
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 12.3, 12.4, 12.6, 18.7, 20.1_
    - _Design: "Animation Catalogue"_

  - [ ] 14.10 Add the Reaction and exorcism screenshots
    - In `shotList.ts` and `shots.ts` add `07-reaction-got-it`, `08-reaction-partly`, `09-reaction-missed-it`, `10-reaction-dont-know` and `12-exorcised-moment`, captured at their end state; update the `shotList` test count.
    - Verify: `npm run check` exits `0`; `npm run shots` exits `0`.
    - Commit message: `feat(web): screenshot reactions and the exorcised moment`
    - _Requirements: 24.4, 24.5, 24.6_
    - _Design: "Shots", "Stable frames"_

  - [ ] 14.11 Checkpoint and PR 3b
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 4a, task 15.1), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 3b`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-3a -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-3b`. Body in `$env:TEMP\pr-scenic-web-3b-body.md` from the template, with the size warning and measured count, the Requirement 2 check, "Shots added: `07-reaction-got-it`, `08-reaction-partly`, `09-reaction-missed-it`, `10-reaction-dont-know`, `12-exorcised-moment`, each at both sizes", and the manual check: after an exorcism, back on the floor the candle lights up, the Haunt_Meter moves, then the telephone rings once.
    - Run `gh pr create --base feat/scenic-web-3a --head feat/scenic-web-3b --title "feat: add ghost reactions and the exorcised moment" --body-file $env:TEMP\pr-scenic-web-3b-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

### Stage 4

- [ ] 15. PR 4a — Finale, live analysis, Lightning
  - Branch: `feat/scenic-web-4a`. Stacks on: `feat/scenic-web-3b`.
  - Estimate: ~490 changed lines. Model: Auto.
  - _Design: "PR Split" row 4a_

  - [ ] 15.1 Add the Lightning and Finale texts
    - In `texts.ts` add `lightning` (`on`, `off`, `reducedReason`) and `finaleDone`; in `powerTexts.ts` add `finaleOtherGhosts` (additions only). Extend `scenicTexts.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the lightning and finale texts`
    - _Requirements: 2.2, 13.4, 15.5, 15.9, 25.4_
    - _Design: "New texts"_

  - [ ] 15.2 Add the Lightning clock
    - Create `packages/web/src/view/scenic/model/lightningClock.ts`: `FLASH_MIN_MS`, `FLASH_MAX_MS`, `nextFlashDelay(random)` and `flashAllowed(input)`.
    - Create `packages/web/src/view/scenic/model/lightningClock.test.ts` with the `flashAllowed` table: no flash with the toggle off, under Reduced_Motion, in the Ghost_Scene, during the Finale (D8), during a Ring or an Exorcised_Moment (Q7).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): schedule lightning flashes`
    - _Requirements: 15.1, 15.2, 18.5_
    - _Design: "scenic/model/lightningClock.ts", D7, D8, decision Q7_

  - [ ] 15.3 Property test for the Lightning interval
    - **Property 16: Lightning flashes are 10 to 15 seconds apart**
    - **Validates: Requirements 15.1, 15.3**
    - Generator: numbers in [0, 1) (`fc.double` with `min: 0`, `max: 1`, `maxExcluded: true`, `noNaN: true`), at least 100 runs. Checks `nextFlashDelay(r)` is an integer from 10,000 to 15,000 inclusive.
    - Tag: `// Feature: scenic-web, Property 16: Lightning flashes are 10 to 15 seconds apart`.
    - Test file: `lightningClock.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check lightning flashes are 10 to 15 seconds apart`
    - _Requirements: 15.1, 15.3_
    - _Design: "Correctness Properties", Property 16_

  - [ ] 15.4 Draw the effects layer
    - There is no `art/sky.ts`: the weather overlay is in `art/weather.ts`. In a new `art/effects.ts` add `effectsLayer()`: the Search_Beam fan from the porch lantern painted in the illustration, at (354, 629) in house units (the lantern's lit centre in the asset is (319, 566), times 10/9; checked against `house-scene.svg`, element `porch-lantern-glow`); the lightning bolt with the full-world flash rect in one `lightning` group; and the dawn band in a `dawn` group, clipped to the sky like the rain (the clip of `weatherLayer`). No bats. `stage.ts` mounts it in place of the empty `effects` group.
    - Extend `art.test.ts`: the tree passes the rules; the beam starts at (354, 629); the dawn band uses the sky clip and never covers the house; there is no `bats` part.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the search beam, lightning and dawn`
    - _Requirements: 13.3, 14.1, 15.1, 22.1_
    - _Design: "Props and panels" (Search_Beam, Lightning, Dawn), "World geometry"_

  - [ ] 15.5 Add the Lightning_Toggle
    - Extend `HudView` and `hudView` with the toggle (text, `aria-pressed`, disabled and reason under Reduced_Motion) and add examples to `hudView.test.ts` for on, off and Reduced_Motion. In `hud.ts` add the real `button` (flip on click, Enter or Space, same frame, focus kept, no UserAction) and the visible reason linked with `aria-describedby`. The state lives only in memory and starts on unless Reduced_Motion is on.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the lightning toggle`
    - _Requirements: 4.12, 15.5, 15.6, 15.8, 15.9_
    - _Design: "Accessible names" (Lightning_Toggle), decision Q26_

  - [ ] 15.6 Show the Finale and the Search_Beam
    - In `effects.ts`, `stage.ts` and `renderer.ts`: `data-finale` from `layout.finale`, animated only when `effects.finale.animate` (after a Return_Glow of the same render, with an 0.8 s delay), end state otherwise; the `.finale-banner` with two lines (`TEXTS.finaleDone` and `POWER_TEXTS.finaleOtherGhosts`) or `house.houseClean`, announced through the Scenic_Announcer; `data-busy` from `live.busy` shows the Search_Beam. Banner styles in `stage.css` (line 1 `--font-title`, so Source_Scan item 12 now checks `.finale-banner .line-1`).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): show the dawn finale and the search beam`
    - _Requirements: 3.3, 13.1, 13.2, 13.3, 13.4, 13.5, 13.7, 13.8, 14.1, 14.2, 14.5, 21.2_
    - _Design: "effects.ts" row of "DOM modules", "Props and panels" (Finale banner), decision Q8_

  - [ ] 15.7 Flash the Lightning
    - In `effects.ts`: schedule each flash from the previous due time with `nextFlashDelay(Math.random())`, never from a render; skip a due flash when `flashAllowed` is false and keep counting; the first flash is due 10 s to 15 s after load or after turning the toggle on; turning it off starts no new flash and ends a showing one within 1 s.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): flash lightning over the house`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.7_
    - _Design: "scenic/model/lightningClock.ts", D7, D8_

  - [ ] 15.8 Animate the Finale, the beam and the Lightning
    - In `motion.css`: `finale-rain-stop`, `finale-dawn`, `banner-in`, `beam-sweep` and `lightning-flash` (at most 3 flashes per second) in the no-preference block; under `reduce` the 200 ms fades, the beam fixed at −3° and no Lightning. The Finale is: the page rain stops, the dawn band fades in over the sky, the banner appears. The clouds are painted and stay still. Remove the unused token `--sc-dur-finale-clouds` from `scenic-tokens.css`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): animate the finale and the search beam`
    - _Requirements: 13.3, 13.7, 14.6, 15.4, 18.4, 18.5, 18.7_
    - _Design: "Animation Catalogue"_

  - [ ] 15.9 Add the Finale and live screenshots
    - In `shotList.ts` and `shots.ts`: turn the Lightning_Toggle off before the first shot; add `13-finale`, `14-live-busy` (request held, shot taken at once, then released, Q21) and `15-live-report`; update the `shotList` test count.
    - Verify: `npm run check` exits `0`; `npm run shots` exits `0`.
    - Commit message: `feat(web): screenshot the finale and the live analysis`
    - _Requirements: 24.4, 24.5, 24.6, 24.14_
    - _Design: "Shots", "No real GitHub, no network", decision Q21_

  - [ ] 15.10 Checkpoint and PR 4a
    - Update `PLAN.md` ("En curso", "Pendientes", "Para retomar": next is PR 4b, task 16.3; tasks 16.1 and 16.2 are withdrawn), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 4a`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-3b -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-4a`. Body in `$env:TEMP\pr-scenic-web-4a-body.md` from the template, with the size warning and measured count, the Requirement 2 check, "Shots added: `13-finale`, `14-live-busy`, `15-live-report`, each at both sizes", and the manual check: flashes every 10 to 15 s; the toggle stops them; under Reduced_Motion the toggle is off and disabled with its reason.
    - Run `gh pr create --base feat/scenic-web-3b --head feat/scenic-web-4a --title "feat: add the finale, live search beam and lightning" --body-file $env:TEMP\pr-scenic-web-4a-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [ ] 16. PR 4b — Reduced_Motion audit, responsive polish, default switch
  - Branch: `feat/scenic-web-4b`. Stacks on: `feat/scenic-web-4a`.
  - Estimate: ~330 changed lines (the Intro, tasks 16.1 and 16.2, is cut). Model: Auto.
  - _Design: "PR Split" row 4b_

  - [x] 16.1 (Withdrawn 19 Nov: the Intro is cut now, director's decision)

  - [x] 16.2 (Withdrawn 19 Nov: the Intro is cut now, director's decision; `intro-ended` is sent at the first House_Scene render, D13)

  - [ ] 16.3 Apply Reduced_Motion changes while the page is open
    - In `motion.ts` and `renderer.ts`: when Reduced_Motion turns on, every one-shot (Camera move, Reaction, Exorcised_Moment, Return_Glow, Finale change) jumps to its end state, loops stop through the media query, Lightning stops within 1 s and its toggle becomes off and disabled; when it turns off, loops start again and the toggle is enabled and stays off. Texts, controls, accessible names and Card states never depend on it.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): follow reduced motion changes without a reload`
    - _Requirements: 15.9, 18.1, 18.8, 18.9_
    - _Design: "Error Handling" (Reduced_Motion changes while open), "motion.ts" row of "DOM modules"_

  - [ ] 16.4 Source_Scan item 8, reduce-block rule
    - In `source.test.ts`: inside `@media (prefers-reduced-motion: reduce)` blocks, `animation` and `transition` use only keyframes that animate `opacity`, a duration token whose value is 200 ms or less, and no `infinite`. Negative self-check.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check reduced motion uses short fades only`
    - _Requirements: 18.4, 18.6_
    - _Design: "Source_Scan additions" item 8_

  - [ ] 16.5 Complete the reduce blocks
    - In `motion.css` audit every row of the "Animation Catalogue" against its RM column and complete the `reduce` blocks: instant Camera cut, still loops, 200 ms fades with the same end states as with motion on. Remove the unused token `--sc-dur-intro` from `scenic-tokens.css` and its line in `contrast.test.ts` (the Intro is cut).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): complete the reduced motion styles`
    - _Requirements: 18.3, 18.4, 18.5, 18.6, 18.7_
    - _Design: "Animation Catalogue" (RM column)_

  - [ ] 16.6 Polish the responsive layout
    - In `base.css`, `hud.css`, `stage.css` and `room.css` (tokens only): the whole House_Scene fits 1440 × 900 with no scroll; at 390 × 844 the house is fully drawn and no wider than the viewport; the Grimoire is under the drawing below 64rem; no horizontal page scroll from 360 px up, also at 200 % zoom and in landscape; only the Code_Block scrolls horizontally.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): fit the scenic view to laptops and phones`
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
    - _Design: "Camera frames", D10, decisions Q9 and Q22_

  - [ ] 16.7 Complete the shot list
    - In `shotList.ts` and `shots.ts`: all 19 states × 2 sizes = 38 PNG files; the flow has no Intro step (the Intro is cut); the `shotList` test expects 38 unique names; the script prints `Wrote 38 PNG files to packages/web/shots/`.
    - Verify: `npm run check` exits `0`; `npm run shots` writes 38 files and exits `0`.
    - Commit message: `feat(web): take every scenic screenshot`
    - _Requirements: 24.4, 24.5, 24.6, 24.10, 24.12_
    - _Design: "Shots", "Shots_Script (npm run shots)"_

  - [ ] 16.8 Make the scenic view the default
    - One small commit: `chooseView` returns `"simple"` exactly when `new URLSearchParams(search).get("view") === "simple"`, else `"scenic"` (Requirement 1); `viewChoice.test.ts` examples become those of the design (`?view=SIMPLE`, `?view=`, `?view=simple&view=scenic`, `?view=scenic&view=simple`, hash and other parameters) and P12 takes the design's expectation; the Scenic_View_Link of `simple/renderer.ts` points to `./`; the Shots_Script opens `/haunted-repo/`.
    - Verify: `npm run check` exits `0`; `npm run shots` exits `0`.
    - Commit message: `feat(web): make the scenic view the default`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.11, 1.12_
    - _Design: "Renderer choice and CSS loading", "Dark launch (director decision Q14)", "Simple_Renderer change (Scenic_View_Link)"_

  - [ ] 16.9 Checkpoint and PR 4b
    - Update `PLAN.md` ("En curso": scenic-web complete after merge; "Pendientes"; "Para retomar": task 17.1 for the director after deploy), mark this task `[x]` and commit both. Commit message: `docs: update the plan for scenic-web PR 4b`.
    - Run `npm run check`; it must exit `0`.
    - Measure: `git diff --shortstat feat/scenic-web-4a -- . ':(exclude)package-lock.json'`.
    - Push with `git push -u origin feat/scenic-web-4b`. Body in `$env:TEMP\pr-scenic-web-4b-body.md` from the template, with the size warning and measured count, the Requirement 2 check, "Shots added: none new; the full set of 38 files", and the manual checklist: keyboard only in every Scene; screen reader spot check; Network tab shows no simple CSS at the default and no scenic CSS at `?view=simple`; 360 px with no horizontal scroll; system Reduced_Motion toggled while the page is open.
    - Run `gh pr create --base feat/scenic-web-4a --head feat/scenic-web-4b --title "feat: add the reduced motion audit and the scenic default" --body-file $env:TEMP\pr-scenic-web-4b-body.md`.
    - Never merge.
    - _Requirements: none (git workflow)_

- [ ] 17. Director check of the public page (by hand)
  - [ ] 17.1 Open the deployed demo in a clean browser
    - **For the director (Luis Miguel), done by hand after PR 4b is merged and deployed.** Open https://devcaos.github.io/haunted-repo/ in a clean browser window, at the default view (scenic) and at `?view=simple`, each with the system Reduced_Motion setting on and off.
    - When the director reports the result, Kiro marks this task `[x]` and updates `PLAN.md` in one `docs:` commit on a new branch `docs/scenic-web-close` from `main`, with its own pull request. Never merge.
    - Commit message: `docs: close the scenic-web tasks`
    - _Requirements: 25.3, 25.6, 25.7_
    - _Design: "Durability (until 29 January 2027)"_

## Notes

- No task is optional: the design marks no property and no test as optional. Every property P1 to P18 has its own sub-task: P12, P13 and P9 in PR 1a; P1 to P8 in PR 1c; P18 in PR 1f; P15 in PR 2c; P17 in PR 3a; P14, P10 and P11 in PR 3b; P16 in PR 4a.
- Tasks 12.1, 12.2 and 12.5 are conditional: they run only if the time check of 23 Nov 2026 triggers. They are not optional in the `*` sense. Task 12.3 is withdrawn and 12.4 was applied on 19 Nov (director). Cut 4 of the design's Cut List needs a new director decision and has no task.
- Tasks 6.1 and 17.1 involve the director by hand. Task 8.1 was a hard stop and is approved (18 Nov, merge of PR #59).
- DOM modules (`hud.ts`, `stage.ts`, `sceneControls.ts`, `phoneWidget.ts`, `ghostScene.ts`, `grimoire.ts`, `effects.ts`, `renderer.ts`) have no automated test because the design adds no jsdom or happy-dom. They are covered by `npm run build`, the Source_Scan, the Shots_Script checks and the manual checks in each PR body.
- The scenic view adds no external service. The only network use is the existing live form, already covered by the web-demo real-service check. The Shots_Script uses Core's strict fake and aborts every other request.
- Requirement 19 is checked by hand on the Shots_Script screenshots and in a browser at 360 px (Requirement 19.5); no automated layout test is added to `npm run check`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["1.7"] },
    { "id": 7, "tasks": ["1.8"] },
    { "id": 8, "tasks": ["1.9"] },
    { "id": 9, "tasks": ["1.10"] },
    { "id": 10, "tasks": ["1.11"] },
    { "id": 11, "tasks": ["1.12"] },
    { "id": 12, "tasks": ["1.13"] },
    { "id": 13, "tasks": ["2.1"] },
    { "id": 14, "tasks": ["2.2"] },
    { "id": 15, "tasks": ["2.3"] },
    { "id": 16, "tasks": ["2.4"] },
    { "id": 17, "tasks": ["2.5"] },
    { "id": 18, "tasks": ["2.6"] },
    { "id": 19, "tasks": ["2.7"] },
    { "id": 20, "tasks": ["2.8"] },
    { "id": 21, "tasks": ["2.9"] },
    { "id": 22, "tasks": ["2.10"] },
    { "id": 23, "tasks": ["3.1"] },
    { "id": 24, "tasks": ["3.2"] },
    { "id": 25, "tasks": ["3.3"] },
    { "id": 26, "tasks": ["3.4"] },
    { "id": 27, "tasks": ["3.5"] },
    { "id": 28, "tasks": ["3.6"] },
    { "id": 29, "tasks": ["3.7"] },
    { "id": 30, "tasks": ["3.8"] },
    { "id": 31, "tasks": ["3.9"] },
    { "id": 32, "tasks": ["3.10"] },
    { "id": 33, "tasks": ["3.11"] },
    { "id": 34, "tasks": ["3.12"] },
    { "id": 35, "tasks": ["3.13"] },
    { "id": 36, "tasks": ["3.14"] },
    { "id": 37, "tasks": ["4.1"] },
    { "id": 38, "tasks": ["4.2"] },
    { "id": 39, "tasks": ["4.3"] },
    { "id": 40, "tasks": ["4.4"] },
    { "id": 41, "tasks": ["4.5"] },
    { "id": 42, "tasks": ["4.6"] },
    { "id": 43, "tasks": ["5.1"] },
    { "id": 44, "tasks": ["5.2"] },
    { "id": 45, "tasks": ["5.3"] },
    { "id": 46, "tasks": ["5.4"] },
    { "id": 47, "tasks": ["5.5"] },
    { "id": 48, "tasks": ["5.6"] },
    { "id": 49, "tasks": ["5.7"] },
    { "id": 50, "tasks": ["5.8"] },
    { "id": 51, "tasks": ["5.9"] },
    { "id": 52, "tasks": ["6.1"] },
    { "id": 53, "tasks": ["7.1"] },
    { "id": 54, "tasks": ["7.2"] },
    { "id": 55, "tasks": ["7.3"] },
    { "id": 56, "tasks": ["7.4"] },
    { "id": 57, "tasks": ["7.5"] },
    { "id": 58, "tasks": ["7.6"] },
    { "id": 59, "tasks": ["7.7"] },
    { "id": 60, "tasks": ["7.8"] },
    { "id": 61, "tasks": ["7.9"] },
    { "id": 62, "tasks": ["8.1"] },
    { "id": 63, "tasks": ["9.1"] },
    { "id": 64, "tasks": ["9.2"] },
    { "id": 65, "tasks": ["9.3"] },
    { "id": 66, "tasks": ["9.4"] },
    { "id": 67, "tasks": ["9.5"] },
    { "id": 68, "tasks": ["9.6"] },
    { "id": 69, "tasks": ["9.7"] },
    { "id": 70, "tasks": ["9.8"] },
    { "id": 71, "tasks": ["9.9"] },
    { "id": 72, "tasks": ["10.1"] },
    { "id": 73, "tasks": ["10.2"] },
    { "id": 74, "tasks": ["10.3"] },
    { "id": 75, "tasks": ["10.4"] },
    { "id": 76, "tasks": ["10.5"] },
    { "id": 77, "tasks": ["10.6"] },
    { "id": 78, "tasks": ["10.7"] },
    { "id": 79, "tasks": ["10.8"] },
    { "id": 80, "tasks": ["11.1"] },
    { "id": 81, "tasks": ["11.2"] },
    { "id": 82, "tasks": ["11.3"] },
    { "id": 83, "tasks": ["11.4"] },
    { "id": 84, "tasks": ["11.5"] },
    { "id": 85, "tasks": ["11.6"] },
    { "id": 86, "tasks": ["11.7"] },
    { "id": 87, "tasks": ["11.8"] },
    { "id": 88, "tasks": ["12.1"] },
    { "id": 89, "tasks": ["12.2"] },
    { "id": 90, "tasks": ["12.3"] },
    { "id": 91, "tasks": ["12.4"] },
    { "id": 92, "tasks": ["12.5"] },
    { "id": 93, "tasks": ["13.1"] },
    { "id": 94, "tasks": ["13.2"] },
    { "id": 95, "tasks": ["13.3"] },
    { "id": 96, "tasks": ["13.4"] },
    { "id": 97, "tasks": ["13.5"] },
    { "id": 98, "tasks": ["13.6"] },
    { "id": 99, "tasks": ["13.7"] },
    { "id": 100, "tasks": ["13.8"] },
    { "id": 101, "tasks": ["13.9"] },
    { "id": 102, "tasks": ["14.1"] },
    { "id": 103, "tasks": ["14.2"] },
    { "id": 104, "tasks": ["14.3"] },
    { "id": 105, "tasks": ["14.4"] },
    { "id": 106, "tasks": ["14.5"] },
    { "id": 107, "tasks": ["14.6"] },
    { "id": 108, "tasks": ["14.7"] },
    { "id": 109, "tasks": ["14.8"] },
    { "id": 110, "tasks": ["14.9"] },
    { "id": 111, "tasks": ["14.10"] },
    { "id": 112, "tasks": ["14.11"] },
    { "id": 113, "tasks": ["15.1"] },
    { "id": 114, "tasks": ["15.2"] },
    { "id": 115, "tasks": ["15.3"] },
    { "id": 116, "tasks": ["15.4"] },
    { "id": 117, "tasks": ["15.5"] },
    { "id": 118, "tasks": ["15.6"] },
    { "id": 119, "tasks": ["15.7"] },
    { "id": 120, "tasks": ["15.8"] },
    { "id": 121, "tasks": ["15.9"] },
    { "id": 122, "tasks": ["15.10"] },
    { "id": 123, "tasks": ["16.1"] },
    { "id": 124, "tasks": ["16.2"] },
    { "id": 125, "tasks": ["16.3"] },
    { "id": 126, "tasks": ["16.4"] },
    { "id": 127, "tasks": ["16.5"] },
    { "id": 128, "tasks": ["16.6"] },
    { "id": 129, "tasks": ["16.7"] },
    { "id": 130, "tasks": ["16.8"] },
    { "id": 131, "tasks": ["16.9"] },
    { "id": 132, "tasks": ["17.1"] }
  ]
}
```
