# Implementation Plan: Web demo

## Overview

`packages/web` becomes the real demo page, built in the order of the design: first the test setup and the sample data from a real run, then the Logic_Layer (View_Model, User_Actions, house view, controller), then the Presentation_Layer (asset manifest, tokens, Simple_Renderer, wiring), then the source rules, docs and PR 1. PR 2 adds the Demo_Script, the exorcism logic, the progress indicator and the Exorcism_Panel. Each leaf task is one commit and leaves `npm run check` green. No file under `packages/core/src` changes.

## Pull requests

- **PR 1** on branch `feat/web-demo` (already created). Tasks 0 to 7.
- **PR 2** on branch `feat/web-exorcism`, created from an up-to-date `main` only AFTER the project director merges PR 1. Tasks 8 to 16.
- Kiro never merges. Luis Miguel merges on GitHub.
- Size per design: PR 1 about 2,350 changed lines, PR 2 about 1,250 changed lines, not counting JSON data and `package-lock.json`. The director (Luis Miguel) accepted these new sizes: he saw them and approved the design. Each PR body carries a size warning with the real count. Tests are never cut to fit the size.

## If we run late

Cut in this order, and only as far as needed:

1. PR 1 alone is the minimal version for 20 Nov 2026 (ghost list, live form, fallback, licence).
2. Cut group 16 first (optional Tutor content for the other sirv ghosts).
3. Then cut the `go-to-floor` and `go-to-house` actions (about 30 logic lines plus their tests). Record the cut in `docs/decisiones.md`.

## Working rules for every task

- Kiro runs a task only when the director says so, and asks permission before modifying code.
- Run every command from the repository root, in PowerShell. Before the first commit of a session, check the branch with `git branch --show-current` (PR 1: `feat/web-demo`; PR 2: `feat/web-exorcism`; never `main`).
- One task = one commit. The commit message is in English, conventional style like the repo history (`feat(web):`, `test(web):`, `chore:`, `docs:`). If a message needs an "and", it is two commits.
- Before each commit run `npm run check` (lint, format check, build, tests) and fix what fails. A task is done only when it exits `0`.
- Mark the task `[x]` in this file and include `tasks.md` AND `.kiro/specs/web-demo/tasks.meta.json` (when it exists) in that same commit.
- Checkpoint tasks have no commit of their own; their `[x]` goes in the next commit.
- If a task gets stuck, add an entry to `docs/frictions.md` the same day, in its own `docs:` commit. If something fails after two attempts, stop and explain the problem.
- Never run `npm audit fix`. No new dependency is planned; if one were ever needed, exact versions only (no `^` or `~`) and the director decides first.
- Scripts must work on Windows PowerShell: only Node tools, no `rm -rf` or shell-only syntax.
- Do not touch `requirements.md` or `design.md` of this spec, nor any file under `packages/core/src`.
- Relative imports use the `.js` extension, except in `packages/web/scripts/make-sample.ts`, which imports `../src/sample/makeSample.ts` (Node runs it directly).
- Tests sit next to the code as `*.test.ts`; helpers are `*.testutil.ts`. No snapshot files. Web tests that can reach `detectGhosts` stub the global `fetch` to throw in `beforeEach`, so no test calls GitHub (Requirement 15.4).
- Every property test is one `fc.assert(fc.property(...), { numRuns: 100 })` (or `fc.asyncProperty`) with the comments `// Feature: web-demo, Property N: <title>` and `// **Validates: Requirements ...**`.
- All page text comes from `src/logic/texts.ts` or `src/logic/powerTexts.ts`, in English. Before using an API of Vite, Vitest or fast-check that the repo does not use yet, check its current documentation.
- If a task goes over about 200 changed lines, stop and ask the director how to split it.

## Decisions taken from the design

These open doubts of the design are settled by the approved design and are not reopened in these tasks:

- `go-to-floor` and `go-to-house` are kept as designed (logic and tests only; the Simple_Renderer does not show them).
- Leaving a ghost (`leave-ghost`, `back-to-list`, end of the self-check) returns to the `floor` scene of that ghost, not to `house`.
- "I don't know" stays available in `asking` after the model answer is shown.
- The code is hidden (`code: null`) in `self-check` and `failed`.
- `show-sample` is not available while a live analysis runs.
- Starting a ghost again after "Back to the list" sends `pick-ghost` and shows the first explanation; only "Try again" shows the retry explanation.

## Tasks

### PR 1 — feat/web-demo

- [x] 0. Commit the spec
  - On branch `feat/web-demo` (check with `git branch --show-current`), commit the spec itself so that "`git status --short` prints nothing" holds for the later tasks: `.kiro/specs/web-demo/requirements.md`, `design.md`, `tasks.md`, `.config.kiro`, and `tasks.meta.json` if it exists.
  - Before the commit run `npm run check`; it must exit `0`.
  - Mark this task `[x]` in `tasks.md` and include it in that same commit.
  - One commit. Commit message: `docs: add web-demo spec`
  - _Requirements: none (git workflow)_

- [~] 1. Test setup and sample data
  - [x] 1.1 Add the Vitest alias for Core
    - In `vitest.config.ts` add `resolve.alias` mapping `@haunted-repo/core` to `packages/core/src/index.ts` (with `fileURLToPath(new URL(...))`), as in the design "Vitest alias". `vitest.live.config.ts` stays unchanged.
    - Verify the "no build" case: `node -e "require('node:fs').rmSync('packages/core/dist',{recursive:true,force:true})"`, then `npm test` passes (the current `checkButton.test.ts` now runs against Core source). Then `npm run check`.
    - Commit message: `chore: run web tests against core source`
    - _Requirements: 13.1, 13.2_

  - [x] 1.2 Add `makeSample.ts` and its tests with the strict fake
    - Create `packages/web/src/sample/makeSample.ts`: `SAMPLE_REPO_URL`, `SAMPLE_SHA` (the single definition), `SampleOutput`, `copyrightLineOf(licenceText)` and `makeSample({ fetch })` exactly as in the design. Step 1 calls `detectGhosts(SAMPLE_REPO_URL, { ref: SAMPLE_SHA, fetch })` with the comment about the "TEST ONLY" `ref`; step 2 uses a second `createGitHubClient` for every Ghost_Text and the `license` file; a missing copyright line, any Core error or any thrown error gives `{ ok: false, error }` and no output. It imports only `@haunted-repo/core` (no relative import). It writes no file.
    - Create `packages/web/src/logic/fakeDetect.testutil.ts`: wraps the strict fake of Core (relative import of `fakeGitHub.testutil.ts`) and adds `User-Agent: vitest`, the way Node and browsers do. The fake itself is not changed or loosened.
    - Create `packages/web/src/sample/makeSample.test.ts`: with the fake (`shas: [SAMPLE_SHA]`, 5 ghost files plus `license`) success gives one text per ghost and the copyright line, the tree request uses the SHA, total requests ≤ 14; errors give no output: repo not found, rate limit after k requests, missing `license`, licence with no copyright line; `copyrightLineOf` examples (first match, any case, trimmed, `null` when absent). `fetch` stubbed to throw in `beforeEach`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): build the sample data from a core run`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 5.6, 15.4_

  - [x] 1.3 Add the hand-run `npm run sample:make` script
    - Create `packages/web/scripts/make-sample.ts` as in the design: calls `makeSample({})`; on error prints it, sets `process.exitCode = 1` and writes nothing; otherwise writes `report.json.tmp`, `files.json.tmp`, `sirv-license.txt.tmp` next to `src/sample/report.json`, `src/sample/files.json`, `public/sirv-license.txt`, and renames them over the targets only when all three temp writes succeeded; on a temp-write failure deletes the temp files and exits `1`. Prints the paths written and the request count of each client. Only `node:fs/promises`, `node:path`, `node:url`.
    - Create `packages/web/scripts/tsconfig.json` (extends the base, NodeNext, `types: ["node"]`, `noEmit`, `allowImportingTsExtensions`, `erasableSyntaxOnly`).
    - Root `package.json`: add `"sample:make": "npm run build -w @haunted-repo/core && node packages/web/scripts/make-sample.ts"`. `packages/web/package.json`: `build` becomes `tsc --noEmit && tsc -p scripts && vite build`. `check` and `test` do not run the script.
    - `.prettierignore`: add `packages/web/src/sample/report.json` and `packages/web/src/sample/files.json` (before the files exist, so task 1.4 stays a data-only commit).
    - Do NOT run the script in this task.
    - Verify: `npm run check` exits `0` (the script is type-checked by `tsc -p scripts`).
    - Commit message: `chore(web): add the hand-run sample script`
    - _Requirements: 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 1.4 Run the sample script against real GitHub and commit the data
    - This is the real-service check of detection and download (Requirement 15.1). Run `npm run sample:make` once, with no token. One run makes at most 14 requests to `api.github.com` (limit 60 per hour without an account).
    - If it fails, read the error. Try at most a second time, and only if the error can be fixed without changing Core or the design (for example a network blip). If it fails twice, stop: write an entry in `docs/frictions.md` (own `docs:` commit) and report to the director. Never loop.
    - On success check `git status --short`: only `packages/web/src/sample/report.json`, `packages/web/src/sample/files.json` and `packages/web/public/sirv-license.txt` are new, and `overview.ref` in `report.json` equals the Sample_SHA.
    - Copy the printed output (paths and request counts) under this task in `tasks.md` as a sub-bullet "Run result: ...", so the PR 1 body can quote it.
    - Verify: `npm run check` exits `0`.
    - Commit message: `chore(web): add the lukeed/sirv sample data`
    - _Requirements: 1.3, 1.5, 1.6, 1.7, 15.1_
    - Run result: `Wrote packages\web\src\sample\report.json`, `Wrote packages\web\src\sample\files.json`, `Wrote packages\web\public\sirv-license.txt`, `Requests by the detection client: 7`, `Requests by the download client: 6`. `overview.ref` is `1135207e92c40354543cbd15c763c7a61d79d432`. The first run fetched the data but could not write it because `packages/web/public/` did not exist yet (ENOENT, no temp file left); the second run, after creating that folder, succeeded.

  - [x] 1.5 Add `sampleData.ts` and the committed-data test
    - Create `packages/web/src/vite-env.d.ts` with `/// <reference types="vite/client" />` (types for `?raw`, `import.meta.glob` and CSS imports).
    - Create `packages/web/src/sample/sampleData.ts`: re-exports `SAMPLE_REPO_URL` and `SAMPLE_SHA` from `./makeSample.js`; `SampleData`; `parseSampleFiles(jsonText)` (strict, never throws); `loadSample(reportJson, filesJson)` (uses `parseReport`; rejects when the text keys are not exactly the ghost paths; never throws).
    - Create `packages/web/src/sample/sampleData.test.ts` (reads the committed files with `node:fs`, starts with `/// <reference types="node" />`): `parseReport` ok on the committed report; `overview.ref === SAMPLE_SHA`; text keys equal the ghost paths; `copyright` equals `copyrightLineOf` of `public/sirv-license.txt`; `loadSample` ok on the committed data; `loadSample` rejects a missing key, an extra key, invalid JSON and a wrong shape.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): load the committed sample data`
    - _Requirements: 1.11, 1.12, 1.13, 2.1, 2.3, 10.3_

- [x] 2. View model, user actions and house view
  - [x] 2.1 Add the View_Model types and the user actions
    - Create `packages/web/src/logic/viewModel.ts` with the types of the design (`Scene`, `SceneTransition`, `GhostState`, `GhostCardView`, `FloorView`, `WarningsView`, `ProgressView`, `HouseView`, `ReadingKind`, `GhostView`, `LicenceView`, `StatusKind`, `ViewModel`, `Renderer`). All types are defined now; in PR 1 `ghost` is always `null`, `progress` and `houseClean` are `null`, `lockedLine` is `null`.
    - Create `packages/web/src/logic/actions.ts`: the full `UserAction` union (13 types, ghost actions included), `AvailableAction`, `ActionSink`, `isAvailable(model, action)` (same type and same parameters; the URL of `submit-live` is free). No action carries the Answer_Box text.
    - Create `packages/web/src/logic/actions.test.ts`: `isAvailable` examples (URL is free for `submit-live`; floor, path, rating and answer must match; an empty `available` rejects everything).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the view model and user actions`
    - _Requirements: 6.23, 11.8, 18.1, 18.2, 18.3_

  - [x] 2.2 Add the page texts and the house view
    - Create `packages/web/src/logic/powerTexts.ts` (`POWER_TEXTS.liveReport`, `POWER_TEXTS.lockedGhost`) and `packages/web/src/logic/texts.ts` (`TEXTS` of the design: floor titles, empty floor, busy, `liveDone`, fallback, partial, truncated, skipped title and reasons, sample broken, form label, action labels). PR 2 lines are added in PR 2.
    - Create `packages/web/src/logic/houseView.ts`: `buildWarnings(overview)`, `buildLiveHouse(report)` (every card `haunted`, `canStart` false, Power line from `POWER_TEXTS`, no progress) and `buildSampleHouse(report, null)` (every card `haunted`, `canStart` false, no Power line). Floors always in the order attic, middle floor, basement; report order inside each floor; `emptyLine` when a floor has no cards.
    - Create `packages/web/src/logic/houseView.test.ts` with examples: one ghost per floor; every ghost on one floor (two empty lines); warnings for each of `partial`, `message`, `truncated`, `skipped` (`TOO_LARGE` → "too large", `NOT_TEXT` → "not text"); no warning when all are clear; live house has the Power line, sample house has none.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): group ghosts by floor with report warnings`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.7, 4.9, 4.13, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [x] 2.3 Property test for the grouping by floor
    - **Property 4: Ghosts are grouped by floor in report order**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - Generator: `reportArb` (relative import from Core test utilities). Checks on `buildLiveHouse` and on `buildSampleHouse(report, null)`: titles in order, cards of each floor exactly the report ghosts of that floor in report order with the same path, floor, score and reason, `emptyLine` iff the floor has no cards.
    - Test file: `packages/web/src/logic/houseView.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check ghosts are grouped by floor`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.4 Property test for the report warnings
    - **Property 5: Report warnings match the overview exactly**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6**
    - Generator: the `overview` of `reportArb`. Checks: lines in the order partial, message, truncated, each present iff it applies and nothing else; one skipped entry per skipped file with the right reason; `skippedTitle` iff `skipped` is not empty.
    - Test file: `packages/web/src/logic/houseView.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check report warnings match the overview`
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [~] 3. Page controller
  - [x] 3.1 Add the controller with scenes and navigation
    - Create `packages/web/src/logic/page.ts`: `DetectFn`, `EngineFns`, `PageDeps` (in PR 1 without `script`), `PageController`, `createPage(deps, renderer)`. State in the closure only. `start()` renders the first model: scene `house`, transition `null`, sample house, `ghost` null, form visible, not busy, status none, licence (`copyright` from the sample, `href: "sirv-license.txt"`, link text of the design), `available` as in the design table. `dispatch(action)`: step 1 ignores unavailable actions (no state change, no render, no Core call); `go-to-floor` and `go-to-house` change the scene; every render computes `transition`. If `deps.sample` is not ok: `house` and `licence` null, `available` empty, status error `TEXTS.sampleBroken`. The controller never awaits the renderer (`render` returns `void`). In this task `submit-live` and `show-sample` are listed as in the table but their handling arrives in task 3.2 (they render nothing yet); ghost actions are never available in PR 1.
    - Create `packages/web/src/logic/recordingRenderer.testutil.ts` (stores a deep copy of every model).
    - Create `packages/web/src/logic/states.test.ts` with the PR 1 states "Opening on the sample" (including: `detect` and `fetch` not called, no `show-sample`), "Floor navigation" and "Sample broken", checking named fields only.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the page controller with scenes`
    - _Requirements: 2.1, 2.2, 2.3, 9.1, 10.1, 10.4, 18.1, 18.2, 18.3, 18.4, 18.6_

  - [ ] 3.2 Add the live analysis, the outcome table and the fallback
    - Create `packages/web/src/logic/outcome.ts`: `Outcome`, `OUTCOME_BY_CODE: Readonly<Record<ErrorCode, Outcome>>` and `outcomeOf(code)` exactly as in the design.
    - In `page.ts` handle `submit-live` (single flight: `busy = true` and status busy before the first `await`, render; `await deps.detect(url)` with the URL as typed; ok → live house, scene `house`, status `TEXTS.liveDone`; `show-message` → status error with Core's message, house and scene unchanged; `fallback` or thrown → sample house, scene `house`, status `TEXTS.fallback`; `finally` → `busy = false`, render) and `show-sample` (sample house, scene `house`, status none). This replaces the busy pattern of `checkButton.ts` (same `finally` idea).
    - Extend `states.test.ts` with "Live analysis running" (controlled promise), "Live list" (3 ghosts and 1 ghost wording), "Message error" (`REPO_NOT_FOUND` from the fake), "Fallback" (rate limit from the fake), "Show the sample again" and "Report warnings" (fake repository with a skipped file and truncation). `detect` is `(url) => detectGhosts(url, { fetch: fakeFetch })` through `fakeDetect.testutil.ts`; global `fetch` stubbed to throw.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): run a live analysis with fallback`
    - _Requirements: 4.2, 4.3, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.6, 14.2, 15.4, 17.5, 18.6_

  - [ ] 3.3 Property test for the outcome table
    - **Property 3: Every error code has exactly one outcome**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - Generator: `fc.constantFrom` over an independent list of the 7 codes, typed so a new Core code is a compile error; `fc.string()` for the message; `fc.anything()` for a thrown value. Checks `outcomeOf` and the last View_Model after `submit-live` with a `detect` stub that returns that error or throws.
    - Test file: `packages/web/src/logic/page.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check every error code has one outcome`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 3.4 Property test for single flight
    - **Property 7: Only one live analysis runs at a time**
    - **Validates: Requirements 4.3, 4.4, 4.5**
    - Generator: `fc.integer({ min: 0, max: 20 })` extra submits while pending, and an outcome from `fc.oneof` (ok report from `reportArb`, error result, throw). Checks: `detect` called once; the model before the call has `busy` true and no `submit-live`; the last model has `busy` false and `submit-live`; a submit after the end calls `detect` again.
    - Test file: `packages/web/src/logic/page.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check only one live analysis runs`
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ] 3.5 Property test for unavailable actions (list scenes)
    - **Property 10: Unavailable actions change nothing**
    - **Validates: Requirements 4.3, 4.9, 18.3**
    - Generator: a random path of available actions in the list scenes (`choicesArb` mapped to `model.available`, including pending live analyses), then `fc.oneof` over all 13 action types with the parameters of the design; only the actions that `isAvailable` rejects are dispatched. Checks: same model (deep equal), no render, no `detect` call, no `engine.advance` call (injected counting `EngineFns`). PR 2 extends it to the ghost scene (task 10.7).
    - Test file: `packages/web/src/logic/page.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check unavailable actions change nothing`
    - _Requirements: 4.3, 4.9, 18.3_

  - [ ] 3.6 Property test for plain data and scenes (list scenes)
    - **Property 11: The View_Model is plain data and scenes are consistent**
    - **Validates: Requirements 11.7, 11.8, 18.1, 18.2, 18.4**
    - Generator: `choicesArb` mapped to `model.available`, using `go-to-floor`, `go-to-house`, `show-sample` and `submit-live` with the strict fake. Checks every rendered model: equals `JSON.parse(JSON.stringify(model))`; `ghost` null iff scene is not `ghost`; `live.formVisible` false iff scene is `ghost`; `transition` rule; no `go-to-floor` for the floor in focus. PR 2 extends it to the ghost scene (task 10.7).
    - Test file: `packages/web/src/logic/page.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the view model is plain data`
    - _Requirements: 11.7, 11.8, 18.1, 18.2, 18.4_

- [ ] 4. Checkpoint - logic of PR 1
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Presentation layer and wiring
  - [ ] 5.1 Add the asset manifest with empty slots
    - Create `packages/web/src/view/assets/manifest.ts` (`AssetSlotId` with the 10 ids, `AssetLayer`, `AssetFallback`, `AssetSlot`, `ASSET_SLOTS` with every `layers` list `[]` and a fallback and purpose for each), `packages/web/src/view/assets/resolve.ts` (`resolveSlot(id)` with one literal `import.meta.glob("./files/*", { query: "?url", import: "default", eager: true })`; never throws) and `packages/web/src/view/assets/files/.gitkeep`.
    - Create `packages/web/src/view/assets/manifest.test.ts` (`node:fs`): every id once; fallback and non-blank purpose; every layer has a non-blank `source`; every listed file exists; every file in `files/` except `.gitkeep` is listed; no layer file is an address; every `layers` list is empty in this spec.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add the asset manifest with empty slots`
    - _Requirements: 11.5, 18.5_

  - [ ] 5.2 Add the design tokens and the base CSS
    - Create `packages/web/src/view/simple/tokens.css` with the 8 colours of Requirement 11.1 and every font (system stacks, a serif stack such as Georgia for titles), spacing and size used by the CSS. Create `packages/web/src/view/simple/simple.css` using only `var(...)` for colours, fonts and sizes; code block with max height and its own scroll; no page-wide horizontal scroll at 360 px. Create `packages/web/src/view/simple/dom.ts` with `el(tag, attrs, children)` (text with `textContent` only).
    - No drawing, image or external resource.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add design tokens and base styles`
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6, 12.3_

  - [ ] 5.3 Add the Simple_Renderer for the house, the live form and the licence
    - Create `packages/web/src/view/simple/house.ts` (`renderHouse`: three sections with `data-floor`, cards with path, score, reason, `data-ghost-state`, empty lines, warnings, Power line), `licence.ts` (`renderLicence`: copyright line plus relative link `sirv-license.txt`) and `renderer.ts` (`createSimpleRenderer(root, onAction)`: builds the shell once with header, Live_Form with a labelled URL field, Status_Region with `aria-live`, main, footer with the licence; the form is never replaced so the URL text stays; `form.hidden = !model.live.formVisible`; submit button disabled when `submit-live` is not available; on submit `preventDefault()` and `onAction({ type: "submit-live", url })`; one button per available action that this renderer shows, labelled from `TEXTS.actionLabels`; ignores `transition`; asks `resolveSlot` and uses the fallbacks).
    - Imports from `@haunted-repo/core` are `import type` only. No `innerHTML`. No test file: covered by the build and the manual checks of the PR body.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the house with the simple renderer`
    - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.4, 4.5, 4.8, 5.4, 10.1, 10.4, 11.8, 11.9, 12.1, 12.2, 12.3, 18.5_

  - [ ] 5.4 Wire the page in `main.ts` and `index.html`
    - Rewrite `packages/web/index.html`: head (title, meta, charset) and `<body><div id="root"></div><script type="module" src="/src/main.ts"></script></body>`; no inline style, no external resource.
    - Rewrite `packages/web/src/main.ts`: import `report.json?raw` and `files.json?raw`, `loadSample`, `createSimpleRenderer` and its CSS, `createPage` with `detect: (url) => detectGhosts(url)` (no `ref`), then `page.start()`. It no longer imports `checkButton.ts`.
    - Verify: `npm run check` exits `0`; `npm run build` output in `packages/web/dist` contains `sirv-license.txt` at its root.
    - Commit message: `feat(web): wire the demo page`
    - _Requirements: 2.1, 2.2, 2.3, 4.2, 10.4, 11.5, 18.5_

  - [ ] 5.5 Delete the check button
    - Delete `packages/web/src/checkButton.ts` and `packages/web/src/checkButton.test.ts`. Its single-flight idea lives on in task 3.2 and P7.
    - Verify: `npm run check` exits `0`; a search for `checkButton` under `packages/web` finds nothing.
    - Commit message: `chore(web): remove the check button`
    - _Requirements: 14.1, 14.3_

  - [ ] 5.6 Add the source rules for storage, HTML, texts and layers
    - Create `packages/web/src/source.test.ts` (`node:fs`, `/// <reference types="node" />`), scanning non-test files under `src/` and `index.html`: no `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` (the test skips itself); no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`; the word `Power` only in `powerTexts.ts`; the text `Check GitHub connection` nowhere; no `style` attribute or `<style>` in `index.html`; Logic_Layer (`src/logic/**`, `src/sample/**`) has no `document`, `window`, `HTMLElement` and no import from `src/view`; `makeSample.ts` has no relative import; `src/view/**` imports Core only with `import type`. Add one negative self-check per rule group (an inline string that the pattern must match), so a rule cannot pass by matching nothing.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check source rules for storage and layers`
    - _Requirements: 4.13, 9.2, 11.7, 14.1, 18.7_

  - [ ] 5.7 Add the source rules for CSS and external addresses
    - Extend `source.test.ts`: in `index.html` and every `.ts`, `.css` and `.svg` under `src/view/`, no `http://` or `https://` and no protocol-relative `//` at the start of a `url(...)`, `@import`, `src` or `href` value (the two SVG namespace values are exempt). In `src/view/simple/**/*.css` except `tokens.css`: no literal colour (the list of the design, CSS named colours included), no size unit and no `font-family` without `var(` (units and exemptions exactly as in the design). Negative self-checks as in task 5.6.
    - Verify: `npm run check` exits `0`; changing one colour in `simple.css` to a hex value makes `npm test` fail (then undo).
    - Commit message: `test(web): check styles use tokens and local files only`
    - _Requirements: 11.2, 11.3, 11.5_

- [ ] 6. Project documents for PR 1
  - [ ] 6.1 Update `PLAN.md`
    - Item 6 ("Spec: web de demostración"): PR 1 in progress (list, live form, fallback, licence). "Pendientes": mark the MIT notice line of lukeed/sirv as closed. Note (g): mark it used. Note (e) ("en el navegador se guarda solo el progreso"): replace it with "nothing is saved". Add a short "Para retomar" note: PR 2 starts from `main` after the merge, task 8.1. `PLAN.md` may stay in Spanish.
    - Verify: `npm run check` exits `0`; `git status --short` shows only `PLAN.md`, `tasks.md` (and `tasks.meta.json`).
    - Commit message: `docs: update the plan for web demo PR 1`
    - _Requirements: 16.2, 16.3, 16.6_

  - [ ] 6.2 Add the line to `docs/kiro-usage-log.md`
    - One new line about PR 1 of this spec, in the style and order of the file.
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: log Kiro usage for web demo PR 1`
    - _Requirements: 16.4_

- [ ] 7. Final checkpoint and PR 1
  - [ ] 7.1 Final check of PR 1
    - Ensure all tests pass, ask the user if questions arise.
    - Run `npm run check` (exit `0`, no network needed); `git status --short` prints nothing.
    - Count the changed lines with `git diff --stat main...HEAD`, excluding `package-lock.json` and the JSON data (`report.json`, `files.json`); the licence text counts as data too.
    - Mark this task `[x]` and commit `tasks.md` (and `tasks.meta.json`).
    - Commit message: `docs: close the web demo PR 1 tasks`
    - _Requirements: 15.4_

  - [ ] 7.2 Open PR 1
    - Push with `git push -u origin feat/web-demo`.
    - Write the body to a file outside the repository (for example `$env:TEMP\pr1-body.md`), filling `.github/pull_request_template.md`, and run `gh pr create --base main --head feat/web-demo --title "feat: add the web demo ghost list and live form" --body-file <that file>`. Title under 70 characters.
    - The body includes:
      - What was built and what PR 2 adds.
      - **Size warning**: the real changed-line count of task 7.1, that it is over about 500 lines, that the director accepted this size in the design, and that tests were not cut.
      - The real-service check: the "Run result" of task 1.4.
      - **Manual check of the live form after deploy (done by the director, not by Kiro)**, per Requirement 15.3:
        1. Open `https://devcaos.github.io/haunted-repo/` in a clean browser window.
        2. Paste `https://github.com/lukeed/sirv` in the form and submit.
        3. Success: the Ghost_List of the live report and the line "To exorcise the ghosts of this repository, use your own Kiro with the Haunted Repo Power."
        4. Fallback: the Sample_Report and the message "GitHub allows only 60 requests per hour without an account…".
      - Manual page checklist: keyboard only reaches every control; 360 px wide shows no page-wide horizontal scroll; the licence link opens the text; no request in the Network tab on load; changing one colour in `tokens.css` changes the page.
      - That nothing was merged.
    - Never merge. No commit in this task (the PR is opened from the commits above); mark it `[x]` in the first commit of PR 2.
    - _Requirements: 15.2, 15.3_

### PR 2 — feat/web-exorcism

- [ ] 8. Branch and Demo_Script
  - [ ] 8.1 Create the branch `feat/web-exorcism`
    - Only after the director confirms that PR 1 is merged. Run `git checkout main`, `git pull`, then `git checkout -b feat/web-exorcism`. Check that `main` contains the PR 1 commits.
    - No commit of its own; mark this task and task 7.2 `[x]` in the commit of task 8.2.
    - _Requirements: none (git workflow)_

  - [ ] 8.2 Add the Demo_Script parser
    - Create `packages/web/src/logic/demoScript.ts`: `GhostContent`, `DemoScript`, `parseDemoScript(jsonText)` (strict, never throws: every text non-blank, exactly 3 questions, 3 simpler explanations and 3 model answers, the 3 questions different, `kind` one of the 4 `FileKind` values, no repeated path) and `contentOf(script, path)`.
    - Create `packages/web/src/logic/demoScript.test.ts` with examples: a valid script; each rejection (blank text, repeated question, 2 or 4 items, repeated path, unknown kind, wrong type, invalid JSON); `contentOf` with a missing path and a `null` script.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): parse the demo script`
    - _Requirements: 7.4, 7.5, 7.6, 7.8_

  - [ ] 8.3 Property test for the Demo_Script parser
    - **Property 2: The Demo_Script parser accepts only complete content**
    - **Validates: Requirements 7.4, 7.5, 7.8**
    - Generator: valid Ghost_Content records from `fc.string()` with non-blank filters, mutated by one of the mutations of the design. Checks: `ok` iff the content is complete; never throws. (The "committed file returns ok" part is added in task 8.5, when the file exists.)
    - Test file: `packages/web/src/logic/demoScript.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the demo script parser`
    - _Requirements: 7.4, 7.5, 7.8_

  - [ ] 8.4 Confirm the 2 easiest ghosts with the director
    - From the committed `packages/web/src/sample/report.json`, sort the ghosts by `difficultyScore` ascending, then by path with `a < b` (the order of `suggestGhost`). Tell the director, in Spanish, the 2 first paths with their score and floor, and the kind that `classifyFileKind` gives on each Ghost_Text.
    - WAIT for an explicit "yes". Write no Ghost_Content text before it.
    - After the "yes", write the 2 paths under this task in `tasks.md` as a sub-bullet "Approved ghosts: ...", mark it `[x]` and commit.
    - Commit message: `docs: record the two demo ghosts`
    - _Requirements: 7.1, 7.11_

  - [ ] 8.5 Write the Tutor texts for the 2 easiest ghosts
    - Act as the Tutor. For each approved ghost, get the instruction text of every step (`explaining`, `asking` for each question, `simplifying` for each question, `model-answer`, retry explanation after `retry-ghost`) by driving `startSession` and `advance` with the default profile (for example with a temporary local script that is not committed), and follow it: plain beginner words, an everyday analogy, behaviour questions, no line numbers, no comparison with Java (`java-forbidden`), explanation, retry explanation and each simpler explanation at most 150 words. The 3 questions follow, in order, the 3 objectives of `QUESTION_SETS` for the kind of that file; each simpler explanation is about the part of the file its question is about.
    - Create `packages/web/src/sample/demo-script.json` (hand-written, formatted by Prettier) with the 2 Ghost_Contents.
    - Extend `demoScript.test.ts` (committed content): the committed file parses `ok` (the last part of P2); it holds the 2 easiest ghosts by (score, path); every path is a sample ghost; `kind` equals `classifyFileKind(text, ghost.language)`; each reading text is at most 150 words; no line numbers (regex of the design).
    - Show the texts to the director before the commit; the match with the objectives is checked by the director, not by a test.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add tutor texts for the two easiest ghosts`
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

- [ ] 9. Sample card state and progress
  - [ ] 9.1 Extend the sample house with card states and progress
    - In `houseView.ts`, `buildSampleHouse(report, exorcism)` with the `exorcism` argument of the design: card state (`exorcised` / `locked` / `haunted`), `canStart` (haunted cards, step `choosing` or `failed`, `startAllowed`), `lockedLine` from `POWER_TEXTS.lockedGhost`, `progress` (`TEXTS.progress`, `haunted`, `total`, `share = hauntedShare`), `houseClean` on `house-clean`.
    - In `texts.ts` add the PR 2 lines (`judgeLine`, `selfCheck`, `stillHaunted`, `houseClean`, `progress`, `engineError`).
    - Create `packages/web/src/logic/uniquePathReportArb.testutil.ts` (maps `reportArb` through a dedupe that keeps the first ghost of each path).
    - Extend `houseView.test.ts` with examples: exorcised card, locked card with its line and no start, `canStart` false in `asking` and when `startAllowed` is false, progress line and share, house-clean line.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): show ghost states and progress in the sample`
    - _Requirements: 4.13, 6.1, 6.2, 6.21, 8.1, 8.2, 8.4, 11.9_

  - [ ] 9.2 Property test for the progress view
    - **Property 6: The progress view follows the progress**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - Generator: `uniquePathReportArb` and `progressArb(report.ghosts)`. Checks `total`, `haunted`, `share = hauntedShare(report, progress)` and `line = TEXTS.progress(haunted, total)`.
    - Test file: `packages/web/src/logic/houseView.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the progress view`
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 9.3 Property test for the card state
    - **Property 8: Card state follows progress and content**
    - **Validates: Requirements 4.9, 6.1, 6.2, 8.4, 11.9**
    - Generator: `uniquePathReportArb`, `progressArb`, `fc.subarray` of the paths, `fc.constantFrom` of the 8 steps, `fc.boolean()` for `startAllowed`. Checks the state rule, that it does not depend on `startAllowed`, the locked line, the `canStart` rule, and that every live card is `haunted` with `canStart` false and no locked line. The part "canStart iff `start-ghost` is available" is checked inside P1, P10 and P11 (tasks 10.5 and 10.7).
    - Test file: `packages/web/src/logic/houseView.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the ghost card state rule`
    - _Requirements: 4.9, 6.1, 6.2, 8.4, 11.9_

- [ ] 10. Exorcism logic in the page
  - [ ] 10.1 Add the ghost view, the step actions and the event mapping
    - Create `packages/web/src/logic/exorcism.ts`: `readingText`, `buildGhostView` (the table of the design by step: code, licence next to code, judge line, reading, question number, question, revealed answer, Answer_Box, prompt), `ghostActions(step, revealed)` (the rows of the design table) and `eventFor(action, state, content, text)`.
    - Create `packages/web/src/logic/exorcism.test.ts` with examples: rating map `right` / `half-right` / `wrong`; self-check map `yes` / `half` / `no`; the `explanation-done` text equals `readingText`; retry explanation when `current.explanation !== ""`.
    - Extend `actions.test.ts`: for every step and both `revealed` values, every action of `ghostActions` maps to an event type in `ALLOWED_EVENTS[step]` or to `null`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): map exorcism steps to views and events`
    - _Requirements: 6.4, 6.5, 6.6, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15, 6.16, 6.17, 6.18, 6.19, 6.20, 6.22, 6.24, 10.2_

  - [ ] 10.2 Drive the Sample_Session from the controller
    - In `page.ts`: `PageDeps.script` and `engine` (defaults to Core's); the Sample_Session from `startSession(sample.report)`; `revealed`; `start-ghost` (`pick-ghost` with the full Ghost_Text, scene `ghost`); ghost actions through `eventFor`, checked against `ALLOWED_EVENTS[step]` before `advance`; `show-model-answer` (local, no event) and `back-to-list` (no event); scenes after leave, back and self-check (floor of that ghost), `house` on `house-clean`; form hidden in the `ghost` scene; `start-ghost` not available while busy; engine error → status `TEXTS.engineError`, session restarted from its progress, scene `house`. `submit-live` never touches the Sample_Session; `show-sample` shows it with its progress.
    - In `main.ts` pass `script: null` for now (the real script is wired in task 12.2, together with the panel renderer).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): drive the sample exorcism from the page`
    - _Requirements: 4.10, 4.11, 4.12, 6.3, 6.8, 6.19, 6.20, 6.23, 6.26, 9.1_

  - [ ] 10.3 State tests for the reading and asking states
    - Extend `states.test.ts`: "Ghost explaining", "Asking, not revealed", "Asking, revealed" (no engine call for the reveal), "Simplifying", "Model answer", "Leave", "Locked ghost", and the PR 2 check of "Live analysis running" (every sample `canStart` false). Built with the committed data and the committed `demo-script.json`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the exorcism reading and asking states`
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.9, 6.10, 6.12, 6.13, 6.14, 6.15, 6.20, 6.22, 10.2, 18.6_

  - [ ] 10.4 State tests for the end states
    - Extend `states.test.ts`: "Self-check", "Exorcised", "Failed", "Retry", "Back to the list", "House clean" (generated script for every ghost), "Engine error" (injected `advance` that returns an error), "Reload" (a second controller from the same data).
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the exorcism end states`
    - _Requirements: 6.16, 6.17, 6.18, 6.19, 6.21, 6.24, 6.26, 8.3, 8.4, 9.3, 18.6_

  - [ ] 10.5 Property test for the engine walk
    - **Property 1: Every available action is accepted by the engine**
    - **Validates: Requirements 6.5, 6.6, 6.8, 6.9, 6.15, 6.17, 6.20, 6.25, 4.10, 18.3**
    - Generator: `choicesArb` (up to 200 numbers), each taken modulo `model.available` (skipping `submit-live`). Two runs: the committed data and script, and a generated script with content for every sample ghost (to reach `house-clean`). `engine.advance` is wrapped to record every call. Checks of the design, plus: `canStart` of each card is true iff `start-ghost` for its path is available (P8 link); and one example that the `pick-ghost` text equals the `files.json` text (6.3).
    - Test file: `packages/web/src/logic/exorcism.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check every available action is accepted`
    - _Requirements: 4.10, 6.3, 6.5, 6.6, 6.8, 6.9, 6.15, 6.17, 6.20, 6.25, 18.3_

  - [ ] 10.6 Property test for the Sample_Session isolation
    - **Property 9: A live analysis never changes the Sample_Session**
    - **Validates: Requirements 4.11, 4.12**
    - Generator: `choicesArb` for a judge path stopped in a `house` or `floor` scene, plus the outcome generator of P7. Checks: after `submit-live` and then `show-sample` (when available), the session is the same object and the sample house has the same card states and progress.
    - Test file: `packages/web/src/logic/page.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check live runs keep the sample session`
    - _Requirements: 4.11, 4.12_

  - [ ] 10.7 Extend P10 and P11 to the ghost scene
    - **Property 10: Unavailable actions change nothing** and **Property 11: The View_Model is plain data and scenes are consistent**
    - **Validates: Requirements 4.3, 4.9, 4.10, 6.17, 11.7, 11.8, 18.1, 18.2, 18.3, 18.4**
    - In the two properties of tasks 3.5 and 3.6, let the path include ghost actions with the committed script. P10 also checks that the session object is the same; P11 also checks `ghost.path` and `ghost.floor` equal the scene's. Both check `canStart` iff `start-ghost` is available (P8 link).
    - Test file: `packages/web/src/logic/page.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): extend view model checks to the ghost scene`
    - _Requirements: 4.3, 4.9, 4.10, 6.17, 11.7, 11.8, 18.1, 18.2, 18.3, 18.4_

- [ ] 11. Checkpoint - logic of PR 2
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Presentation of the exorcism
  - [ ] 12.1 Draw progress, locked ghosts and the house-clean line
    - In `view/simple/house.ts`: the Progress_Indicator (line plus native `<progress max="1">` with `share`), the locked line on locked cards (from the model, which takes it from `POWER_TEXTS`), the start button on cards with `canStart`, the `exorcised` state label, the house-clean line. Extend `simple.css` with tokens only.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw progress and ghost states`
    - _Requirements: 4.13, 6.1, 6.2, 6.21, 8.1, 8.2, 8.3, 8.4, 11.9_

  - [ ] 12.2 Draw the Exorcism_Panel and wire the Demo_Script
    - Create `packages/web/src/view/simple/ghost.ts` (`renderGhost`): heading with `tabindex="-1"`, reading text, Code_Block `<pre class="code-block" tabindex="0"><code>` with the full Ghost_Text, Licence_Notice next to the code, judge line, question, Answer_Box `<textarea>` with a label and no event listener, revealed model answer, one button per available ghost action (labels from `TEXTS.actionLabels`), self-check prompt and buttons, failed prompt with "Try again" and "Back to the list". In `renderer.ts` show the panel when `model.ghost` is not null and move focus to its heading when the scene or the step changed. Extend `simple.css` (tokens only).
    - In `main.ts` import `demo-script.json?raw`, parse it with `parseDemoScript` and pass the script (or `null` when the parse fails).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): draw the exorcism panel`
    - _Requirements: 4.10, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10, 6.14, 6.15, 6.16, 6.17, 6.18, 6.19, 6.20, 6.22, 6.23, 10.2, 12.1, 12.2_

  - [ ] 12.3 Extend the source rules for the Answer_Box
    - Check that the rules of tasks 5.6 and 5.7 already scan the new files (`ghost.ts`, `demoScript.ts`, `exorcism.ts`, `demo-script.json` is data and not scanned). Add one rule to `source.test.ts`: `src/view/simple/ghost.ts` reads no `.value` and adds no `input` or `change` listener, so the Answer_Box text never leaves the DOM field. Negative self-check as in task 5.6.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(web): check the answer box text is never read`
    - _Requirements: 6.23, 9.2_

- [ ] 13. Project documents for PR 2
  - [ ] 13.1 Update `PLAN.md`
    - Mark item 6 ("Spec: web de demostración") done, with the numbers of PR 1 and PR 2. Add a "Para retomar" note: the optional Tutor texts of group 16, and that the scenic renderer is a later spec.
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: mark the web demo spec as done in the plan`
    - _Requirements: 16.1_

  - [ ] 13.2 Add the line to `docs/kiro-usage-log.md`
    - One new line about PR 2 of this spec, in the style and order of the file.
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: log Kiro usage for web demo PR 2`
    - _Requirements: 16.4_

- [ ] 14. Final checkpoint - PR 2
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Open PR 2
  - [ ] 15.1 Final check and pull request
    - Run `npm run check` (exit `0`); `git status --short` prints nothing. Count the changed lines with `git diff --stat main...HEAD`, excluding `package-lock.json` and JSON data (`demo-script.json` is hand-written; say its size apart).
    - Mark this task `[x]`, commit `tasks.md` (and `tasks.meta.json`) with message `docs: close the web demo PR 2 tasks`, then `git push -u origin feat/web-exorcism`.
    - Write the body to a file outside the repository and run `gh pr create --base main --head feat/web-exorcism --title "feat: add the sample exorcism to the web demo" --body-file <that file>`, filling `.github/pull_request_template.md`. The body includes:
      - What was built; that only the 2 easiest ghosts have Tutor texts and the others are locked (unless group 16 was done).
      - **Size warning**: the real count, over about 500 lines, accepted by the director in the design, tests not cut.
      - **Manual checks after deploy (done by the director, not by Kiro)** on `https://devcaos.github.io/haunted-repo/`: exorcise the 2 easiest ghosts from start to end (including one "I don't know", one retry and the self-check); the progress line and bar change when a ghost is exorcised; keyboard focus moves into the panel at each step; changing only `tokens.css` changes the colours of the whole page.
      - That nothing was merged.
    - Never merge.
    - Commit message: `docs: close the web demo PR 2 tasks`
    - _Requirements: 16.1_

- [ ] 16. Optional: Tutor texts for the other sirv ghosts
  - Only if time allows and the director asks for it. Done on `feat/web-exorcism` while PR 2 is open (extra commits on the same PR), or on a new branch from `main` if PR 2 is already merged. Each task adds one Ghost_Content to `demo-script.json`, following the same Tutor rules as task 8.5, and unlocks that ghost. The content tests of task 8.5 extend to it automatically (every entry is checked); the "2 easiest are present" test stays. The number of tasks below depends on how many ghosts the committed report has (at most 5); skip a task when the ghost does not exist.
  - [ ]* 16.1 Tutor texts for the 3rd easiest ghost
    - Show the texts to the director before the commit.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add tutor texts for the third ghost`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.10_

  - [ ]* 16.2 Tutor texts for the 4th easiest ghost
    - Show the texts to the director before the commit.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add tutor texts for the fourth ghost`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.10_

  - [ ]* 16.3 Tutor texts for the 5th easiest ghost
    - Show the texts to the director before the commit.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(web): add tutor texts for the fifth ghost`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.10_

## Notes

- Only group 16 is optional (marked `*`). Every property (P1 to P11), the committed-data test, the state tests and the source rules are required.
- The Simple_Renderer DOM builders have no automated test because the design adds no jsdom or happy-dom; they are covered by `npm run build` and by the manual checks in each PR body.
- The only real-service check run by Kiro is task 1.4. The live form in the browser is checked by the director after deploy (Requirement 15.2), as written in the PR 1 body.
- Requirement 7.3 (questions follow the `QUESTION_SETS` objectives) is checked by the director when the texts are shown in task 8.5; the test only checks the `kind`.
- Requirement 18.4 has no separate test: `render` returns `void`, the controller never awaits it, and the type checks this.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0"] },
    { "id": 1, "tasks": ["1.1"] },
    { "id": 2, "tasks": ["1.2"] },
    { "id": 3, "tasks": ["1.3"] },
    { "id": 4, "tasks": ["1.4"] },
    { "id": 5, "tasks": ["1.5"] },
    { "id": 6, "tasks": ["2.1"] },
    { "id": 7, "tasks": ["2.2"] },
    { "id": 8, "tasks": ["2.3"] },
    { "id": 9, "tasks": ["2.4"] },
    { "id": 10, "tasks": ["3.1"] },
    { "id": 11, "tasks": ["3.2"] },
    { "id": 12, "tasks": ["3.3"] },
    { "id": 13, "tasks": ["3.4"] },
    { "id": 14, "tasks": ["3.5"] },
    { "id": 15, "tasks": ["3.6"] },
    { "id": 16, "tasks": ["5.1"] },
    { "id": 17, "tasks": ["5.2"] },
    { "id": 18, "tasks": ["5.3"] },
    { "id": 19, "tasks": ["5.4"] },
    { "id": 20, "tasks": ["5.5"] },
    { "id": 21, "tasks": ["5.6"] },
    { "id": 22, "tasks": ["5.7"] },
    { "id": 23, "tasks": ["6.1"] },
    { "id": 24, "tasks": ["6.2"] },
    { "id": 25, "tasks": ["7.1"] },
    { "id": 26, "tasks": ["7.2"] },
    { "id": 27, "tasks": ["8.1"] },
    { "id": 28, "tasks": ["8.2"] },
    { "id": 29, "tasks": ["8.3"] },
    { "id": 30, "tasks": ["8.4"] },
    { "id": 31, "tasks": ["8.5"] },
    { "id": 32, "tasks": ["9.1"] },
    { "id": 33, "tasks": ["9.2"] },
    { "id": 34, "tasks": ["9.3"] },
    { "id": 35, "tasks": ["10.1"] },
    { "id": 36, "tasks": ["10.2"] },
    { "id": 37, "tasks": ["10.3"] },
    { "id": 38, "tasks": ["10.4"] },
    { "id": 39, "tasks": ["10.5"] },
    { "id": 40, "tasks": ["10.6"] },
    { "id": 41, "tasks": ["10.7"] },
    { "id": 42, "tasks": ["12.1"] },
    { "id": 43, "tasks": ["12.2"] },
    { "id": 44, "tasks": ["12.3"] },
    { "id": 45, "tasks": ["13.1"] },
    { "id": 46, "tasks": ["13.2"] },
    { "id": 47, "tasks": ["15.1"] },
    { "id": 48, "tasks": ["16.1"] },
    { "id": 49, "tasks": ["16.2"] },
    { "id": 50, "tasks": ["16.3"] }
  ]
}
```
