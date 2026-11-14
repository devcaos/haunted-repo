# Requirements Document

## Introduction

This spec builds the public demo page in `packages/web`, published on GitHub Pages. A judge opens the page without installing anything. The page shows the ghosts of a repository grouped by floor and lets the judge try to exorcise one. The audience is beginners who build with AI. All page text is in English, in plain words and short sentences.

The page opens on a committed sample report of `lukeed/sirv` and makes no network call on load. A form runs a live ghost detection on any public GitHub repository. The judge can exorcise the sample ghosts on the page by rating their own answers, driven by the real exorcism engine of Core and by Tutor texts written in advance. Nothing is saved. The look is temporary and sober; a later visual design must replace it without touching the logic. A later spec will replace the Simple_Renderer with an immersive scenic renderer; this spec only prepares the architecture for it and adds no graphic asset.

The work ships in two pull requests, each under about 500 changed lines (not counting JSON data and `package-lock.json`):

- **PR 1** (branch `feat/web-demo`): sample script and sample data, Vitest alias, design tokens, ghost list by floor, report warnings, live form, fallback, licence notice, removal of the check button.
- **PR 2** (branch `feat/web-exorcism`, from `main` after PR 1 is merged): demo script and interactive exorcism, progress indicator.

Each requirement title says which PR delivers it.

PR 1 may go over about 500 lines. If either PR goes over, Kiro warns the project director before opening it and proposes a split. Kiro does not cut or drop tests to stay under the limit.

## Glossary

- **Web_Page**: the static demo site built from `packages/web` and served on GitHub Pages.
- **Core**: the workspace `@haunted-repo/core` (`detectGhosts`, `parseReport`, `startSession`, `advance`, `buildInstructions`, `QUESTION_SETS`, `classifyFileKind`, `hauntedShare`).
- **Sample_Repo**: the public repository `https://github.com/lukeed/sirv` (MIT licence).
- **Sample_SHA**: the commit `1135207e92c40354543cbd15c763c7a61d79d432` of the Sample_Repo.
- **Sample_Script**: the hand-run script (for example `npm run sample:make`) that produces the Sample_Data. It is not part of `npm run check` or `npm test`.
- **Sample_Data**: the committed output of the Sample_Script under `packages/web`: the Sample_Report, one Ghost_Text per ghost path, and the Licence_Text.
- **Sample_Report**: the HauntedReport JSON of the Sample_Repo at the Sample_SHA.
- **Ghost_Text**: the full text of a ghost file at the Sample_SHA.
- **Licence_Text**: the text of the Sample_Repo `LICENSE` file at the Sample_SHA.
- **Licence_Notice**: the visible MIT notice: the copyright line of the Licence_Text plus a link to the committed Licence_Text.
- **Ghost_List**: the three sections Attic, Middle floor and Basement, from top to bottom, each listing its ghosts as cards (drawn by the Simple_Renderer).
- **Ghost_Card**: the card of one ghost, showing its path, difficulty score and reason (drawn by the Simple_Renderer).
- **Live_Form**: the form where the judge pastes a GitHub repository URL to run `detectGhosts`.
- **Fallback**: showing the Sample_Report again with the Fallback_Message.
- **Fallback_Message**: a plain English message saying that GitHub allows 60 requests per hour without an account and asking the judge to try again later.
- **Demo_Script**: the committed JSON with the pre-written Tutor texts for some ghosts of the Sample_Report.
- **Ghost_Content**: the Demo_Script entry of one ghost: an explanation, 3 simpler explanations (one per question), a retry explanation, 3 questions and 3 model answers (one per question).
- **Scripted_Ghost**: a ghost of the Sample_Report that has Ghost_Content.
- **Locked_Ghost**: a ghost of the Sample_Report without Ghost_Content.
- **Exorcism_Panel**: the part of the Web_Page where the judge exorcises one Scripted_Ghost (drawn by the Simple_Renderer).
- **Code_Block**: the block in the Exorcism_Panel that shows the full Ghost_Text, with its own scroll and a maximum height (drawn by the Simple_Renderer).
- **Sample_Session**: the in-memory exorcism session of the Sample_Report, kept apart from any live report.
- **Power_Texts**: the one module that holds every page text that mentions the Kiro Power.
- **Answer_Box**: the text box in the Exorcism_Panel where the judge may type an answer.
- **Rating_Buttons**: the buttons "Got it", "Partly" and "Missed it".
- **Progress_Indicator**: the line "N of M ghosts still haunting" plus a simple bar.
- **Status_Region**: an element with `aria-live` where status and error messages appear.
- **Tokens_File**: the one CSS file that holds every colour, font, spacing and size as CSS custom properties.
- **Presentation_Layer**: the functions that build the DOM from plain view data, plus the CSS files.
- **Logic_Layer**: the modules that call Core, run detection, decide the Fallback and hold page state. The Logic_Layer has no DOM access.
- **Check_Script**: the root command `npm run check` (lint, format check, build, tests).
- **View_Model**: the plain-data description of everything the Web_Page shows, built by the Logic_Layer on every change.
- **Scene**: where the judge is: the house overview, one floor, or one ghost open.
- **User_Action**: a named judge input, such as starting a ghost or rating an answer, independent of how it is triggered.
- **Renderer**: the Presentation_Layer part that draws a View_Model and sends User_Actions.
- **Simple_Renderer**: the temporary sober Renderer of this spec.

## Requirements

### Requirement 1: Sample data from a real run (PR 1)

**User Story:** As the project director, I want the sample data to come from a real run of Core, so that the demo shows true results and never hand-written ones.

#### Acceptance Criteria

1. WHEN the Sample_Script runs, THE Sample_Script SHALL call `detectGhosts` with the Sample_Repo URL and the `ref` option set to the Sample_SHA.
2. THE Sample_Script SHALL carry a code comment saying why it uses the `ref` option, which Core documents as "TEST ONLY"; Core code and comments stay unchanged.
3. WHEN `detectGhosts` succeeds, THE Sample_Script SHALL download the Ghost_Text of every ghost path and the Licence_Text, all at the Sample_SHA.
4. THE Sample_Script SHALL make the downloads of criterion 3 with a request budget separate from the one used by `detectGhosts` (a new GitHub client instance or plain fetch of the raw files at the Sample_SHA, as the design decides), because one Core GitHub client stops at 8 requests.
5. THE Sample_Script SHALL need no GitHub token; one run makes at most about 14 requests (up to 8 for `detectGhosts`, up to 5 Ghost_Texts, 1 Licence_Text), under the limit of 60 per hour without an account.
6. WHEN all downloads succeed, THE Sample_Script SHALL write the Sample_Data under `packages/web`.
7. THE Sample_Script SHALL write the Licence_Text as a static file that the build copies unchanged to its output (for example under `packages/web/public`), so that a link can open it on GitHub Pages.
8. IF `detectGhosts` or any download fails, THEN THE Sample_Script SHALL exit with a non-zero code, print the error, and leave the existing Sample_Data unchanged.
9. THE Sample_Script SHALL run on Windows PowerShell and on Linux with only cross-platform Node tools.
10. THE Check_Script and `npm test` SHALL NOT run the Sample_Script.
11. THE Web_Package tests SHALL check that `parseReport` returns ok on the committed Sample_Report.
12. THE Web_Package tests SHALL check that the `overview.ref` of the committed Sample_Report equals the Sample_SHA.
13. THE Web_Package tests SHALL check that the Sample_Data holds exactly one Ghost_Text per ghost path of the Sample_Report and no other Ghost_Text.

### Requirement 2: Page opens on the sample report with no network (PR 1)

**User Story:** As a judge, I want the page to show ghosts right away, so that I can try it even when GitHub is slow or blocked.

#### Acceptance Criteria

1. WHEN the Web_Page loads, THE Web_Page SHALL read the Sample_Report with `parseReport` and show the Ghost_List of the Sample_Report.
2. WHEN the Web_Page loads, THE Logic_Layer SHALL make zero network requests.
3. THE Web_Page SHALL take the Sample_Data from the build output, with no request to GitHub.

### Requirement 3: Ghost list by floor (PR 1)

**User Story:** As a judge, I want the ghosts grouped by floor, so that I see what is easy and what is hard.

#### Acceptance Criteria

1. THE Ghost_List SHALL show three sections titled "Attic", "Middle floor" and "Basement", in that order from top to bottom.
2. THE Ghost_List SHALL place every ghost in the section of its `floor`, keeping the report order inside each section.
3. THE Ghost_Card SHALL show the ghost path, its difficulty score and its reason.
4. IF a floor has no ghosts, THEN THE Ghost_List SHALL show that section with one plain line saying it has no ghosts.

### Requirement 4: Live analysis of a public repository (PR 1)

**User Story:** As a judge, I want to paste any public GitHub URL, so that I see the ghosts of a repository I choose.

#### Acceptance Criteria

1. THE Web_Page SHALL show the Live_Form with a labelled URL field and a submit button.
2. WHEN the judge submits the Live_Form, THE Logic_Layer SHALL call `detectGhosts` once with the entered URL and no `ref` option.
3. WHILE a live analysis is running, THE Logic_Layer SHALL ignore every further submit, so that only one `detectGhosts` call runs at a time.
4. WHILE a live analysis is running, THE Live_Form submit button SHALL be disabled.
5. WHEN a live analysis finishes, THE Live_Form submit button SHALL be enabled again.
6. WHEN `detectGhosts` succeeds, THE Web_Page SHALL show the Ghost_List of the returned report.
7. WHILE the Ghost_List shows a live report, THE Web_Page SHALL show one short line, taken from the Power_Texts, saying that exorcism of this repository happens in Kiro with the Power.
8. WHILE the Ghost_List shows a live report, THE Web_Page SHALL show a button "Show the sample again" that shows the Sample_Report again.
9. WHILE the Ghost_List shows a live report, THE Web_Page SHALL offer no way to start an exorcism.
10. WHILE the Exorcism_Panel is open, THE Web_Page SHALL hide the Live_Form, so that the Live_Form is used only from the Ghost_List.
11. WHEN a live report is shown, THE Logic_Layer SHALL keep the Sample_Session in memory unchanged.
12. WHEN the judge clicks "Show the sample again", THE Web_Page SHALL show the Sample_Report with the progress of the Sample_Session (in memory only; a reload still starts again, see Requirement 9.3).
13. THE Power_Texts module SHALL hold every page text that mentions the Kiro Power (the live-report line of criterion 7, the Locked_Ghost line of Requirement 6.2 and any other), and THE Presentation_Layer SHALL take those texts only from the Power_Texts module, so that they can change in one place if the Power is not ready by the code freeze.

### Requirement 5: Errors and fallback (PR 1)

**User Story:** As a judge, I want a clear message when the live analysis fails, so that I know what happened and can keep using the demo.

#### Acceptance Criteria

1. IF `detectGhosts` returns `RATE_LIMITED` or `NETWORK_ERROR`, THEN THE Web_Page SHALL apply the Fallback.
2. IF `detectGhosts` throws, THEN THE Web_Page SHALL apply the Fallback.
3. IF `detectGhosts` returns `INVALID_REPORT`, THEN THE Web_Page SHALL apply the Fallback (`detectGhosts` never returns this code; the mapping exists so that P3 covers every code).
4. IF `detectGhosts` returns `INVALID_URL`, `REPO_NOT_FOUND`, `EMPTY_REPO` or `NO_SUPPORTED_FILES`, THEN THE Web_Page SHALL show the Core error message in the Status_Region and keep the Live_Form and its entered URL.
5. THE Logic_Layer SHALL map every `ErrorCode` of Core to exactly one outcome: "show message" or "fallback" (property-based test P3).
6. THE Web_Package tests SHALL use the strict fake GitHub of Core, or a fake that rejects every request the real GitHub API rejects, and SHALL NOT loosen it.

### Requirement 6: Interactive exorcism of the sample (PR 2)

**User Story:** As a judge, I want to try an exorcism on the page, so that I feel how the real tool works without installing it.

#### Acceptance Criteria

1. WHILE the Ghost_List shows the Sample_Report, THE Ghost_Card of each haunted Scripted_Ghost SHALL offer a button to start its exorcism.
2. WHILE the Ghost_List shows the Sample_Report, THE Ghost_Card of each Locked_Ghost SHALL show the line "Exorcise it in your own Kiro with the Power", taken from the Power_Texts, and offer no start button.
3. WHEN the judge starts an exorcism, THE Logic_Layer SHALL send `pick-ghost` to `advance` with the ghost path and its full Ghost_Text, on the Sample_Session made by `startSession` from the Sample_Report.
4. WHILE the engine step is `explaining`, THE Exorcism_Panel SHALL show the Ghost_Content explanation (the retry explanation on every retry, including a second or later retry) and the Code_Block.
5. WHILE the engine step is `asking`, `simplifying` or `model-answer`, THE Exorcism_Panel SHALL show the Code_Block.
6. THE Code_Block SHALL show the full Ghost_Text with no trimming, the same text sent in `pick-ghost` (Core accepts up to 100 KB), inside a block with its own scroll and a maximum height.
7. WHEN the Exorcism_Panel opens, THE Web_Page SHALL move keyboard focus into the Exorcism_Panel.
8. WHEN the judge finishes reading an explanation, THE Logic_Layer SHALL send `explanation-done` with that explanation text.
9. WHILE the engine step is `asking`, THE Exorcism_Panel SHALL show the current question of the Ghost_Content, the Answer_Box, a button to see the model answer, and an "I don't know" button.
10. WHEN the judge asks to see the model answer, THE Exorcism_Panel SHALL show the model answer of the current question and then the Rating_Buttons.
11. WHEN the judge clicks "Got it", "Partly" or "Missed it", THE Logic_Layer SHALL send `answer-rated` with rating `right`, `half-right` or `wrong`, and the current question text.
12. WHEN the judge clicks "I don't know", THE Logic_Layer SHALL send `dont-know` with the current question text.
13. WHILE the engine step is `simplifying`, THE Exorcism_Panel SHALL show the simpler explanation of the Ghost_Content for the current question, and THE Logic_Layer SHALL send `explanation-done` with that text when the judge continues; the same question is then asked again.
14. WHILE the engine step is `model-answer`, THE Exorcism_Panel SHALL show the model answer of the current question and a continue button, and THE Logic_Layer SHALL send `explanation-done` with that text when the judge continues.
15. WHILE the engine step is `model-answer`, THE Exorcism_Panel SHALL hide the "I don't know" button.
16. WHILE the engine step is `self-check`, THE Exorcism_Panel SHALL show three buttons labelled "Yes", "Partly" and "Not yet" that send `self-check-answered` with `yes`, `half` and `no`.
17. WHILE the engine step is `self-check`, THE Exorcism_Panel SHALL offer no leave button, because `self-check` accepts only `self-check-answered`.
18. WHILE the engine step is `failed`, THE Exorcism_Panel SHALL show a "Try again" button that sends `retry-ghost`.
19. WHILE the engine step is `failed`, THE Exorcism_Panel SHALL show a "Back to the list" button that sends no event and only shows the Ghost_List; the next exorcism then starts with `pick-ghost`, which `failed` accepts.
20. WHILE the engine step is `explaining`, `asking`, `simplifying` or `model-answer`, THE Exorcism_Panel SHALL show a leave button that sends `leave-ghost` and then shows the Ghost_List.
21. WHILE the engine step is `house-clean`, THE Web_Page SHALL show one plain line saying every ghost is exorcised.
22. THE Exorcism_Panel SHALL show one visible line saying that in the real tool the user's own Kiro judges the answer.
23. THE Logic_Layer SHALL ignore the Answer_Box text, so that the typed text exists only in the DOM field and is never sent, logged or stored.
24. WHEN the judge retries a ghost, THE Exorcism_Panel SHALL ask the same 3 questions of the Ghost_Content again; the engine accepts repeated questions.
25. FOR ALL sequences of judge choices on a Scripted_Ghost, `advance` SHALL return ok on every event the Logic_Layer sends, and every attempt SHALL end in step `self-check`, in step `failed`, or in step `choosing` after the judge leaves (property-based test P1).
26. IF `advance` returns an error, THEN THE Web_Page SHALL show a plain message in the Status_Region and return to the Ghost_List of the Sample_Report.

### Requirement 7: Demo script content (PR 2)

**User Story:** As the project director, I want the Tutor texts written in advance by following the engine, so that the demo matches what the real Tutor does.

#### Acceptance Criteria

1. THE Demo_Script SHALL hold Ghost_Content for the 2 ghosts with the lowest difficulty score in the Sample_Report, breaking ties like `suggestGhost` (lowest `difficultyScore`, then smallest path by string comparison).
2. WHERE the optional last task group is done, THE Demo_Script SHALL hold Ghost_Content for the other ghosts of the Sample_Report.
3. THE Ghost_Content SHALL hold 3 questions that follow, in order, the 3 objectives of `QUESTION_SETS` for the kind that `classifyFileKind` returns on its Ghost_Text.
4. THE Ghost_Content SHALL hold exactly one non-blank model answer per question.
5. THE Ghost_Content SHALL hold exactly one simpler explanation per question, each about the part of the file that its question is about.
6. THE Ghost_Content explanation, each simpler explanation and the retry explanation SHALL each be non-blank and at most 150 words.
7. THE Ghost_Content texts SHALL contain no line numbers.
8. FOR ALL Ghost_Content in the Demo_Script, every question SHALL be non-blank and the 3 questions SHALL be different from each other (property-based test P2).
9. THE Web_Package tests SHALL check that every Demo_Script path is a ghost path of the Sample_Report.
10. WHEN Kiro writes each Ghost_Content text, Kiro SHALL follow the instructions that `buildInstructions` returns for that step (behaviour questions, beginner words, an everyday analogy, without comparing with Java, as the default profile rule `java-forbidden` requires).
11. WHEN PR 2 starts, before writing any Ghost_Content text, Kiro SHALL tell the project director which 2 ghost paths are the easiest in the committed Sample_Report (by criterion 1) and wait for an explicit "yes".

### Requirement 8: Progress indicator (PR 2)

**User Story:** As a judge, I want to see how much of the house is still haunted, so that I notice my progress.

#### Acceptance Criteria

1. WHILE the Ghost_List shows the Sample_Report, THE Web_Page SHALL show the Progress_Indicator with the count of haunted ghosts and the total ghost count.
2. THE Progress_Indicator bar SHALL show the value of `hauntedShare` for the Sample_Report and the current session progress.
3. WHEN a ghost becomes exorcised, THE Progress_Indicator SHALL show the new count and bar value.
4. WHEN a ghost becomes exorcised, THE Ghost_Card of that ghost SHALL show the state "exorcised".

### Requirement 9: Nothing is saved (PR 1 and PR 2)

**User Story:** As a judge, I want a clean demo every time, so that nothing about me is stored.

#### Acceptance Criteria

1. THE Web_Page SHALL keep the session state only in memory.
2. THE Web_Package source SHALL contain no use of `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie`, checked by a test.
3. WHEN the judge reloads the Web_Page, THE Web_Page SHALL start again on the Sample_Report with every ghost haunted.

### Requirement 10: Licence notice (PR 1)

**User Story:** As the project director, I want the sirv MIT notice visible, so that the demo respects the licence of the code it shows.

#### Acceptance Criteria

1. THE Web_Page footer SHALL show the Licence_Notice.
2. WHILE the Web_Page shows a Ghost_Text, THE Web_Page SHALL show the Licence_Notice next to the code.
3. THE Licence_Notice copyright line SHALL be taken from the committed Licence_Text.
4. THE Licence_Notice link SHALL open the committed Licence_Text, served as a static file of the build output (for example from `packages/web/public`), so that the link works on GitHub Pages under the `base` path.

### Requirement 11: Temporary look and replaceable design (PR 1)

**User Story:** As the project director, I want a sober temporary look that a later design can replace, so that the redesign does not touch the logic.

#### Acceptance Criteria

1. THE Tokens_File SHALL define these colours as CSS custom properties: page `#0a0f17`, panel `#121a26`, line `#26344a`, text `#e2e7ee`, muted `#8d9bb0`, candle `#f0a04b`, light `#f6c27a`, cold `#9fb4d6`.
2. THE Tokens_File SHALL define every font, spacing and size used by the Web_Page CSS.
3. THE Web_Page CSS files other than the Tokens_File SHALL contain no literal colour value, checked by a test.
4. THE Web_Page SHALL use system font stacks only, with a serif stack such as Georgia for titles.
5. THE Web_Page SHALL load no external font, image, CDN resource or third-party script.
6. THE Web_Page SHALL contain no drawing of a house, a building or an illustration.
7. THE Logic_Layer modules SHALL have no import of DOM types or access to `document` or `window`, so that their tests run without a browser.
8. THE Presentation_Layer SHALL build the DOM only from plain view data given by the Logic_Layer.
9. THE Ghost_List sections in the Simple_Renderer SHALL carry a stable data attribute for the floor, and THE Ghost_Card in the Simple_Renderer SHALL carry a stable data attribute for the ghost state: `haunted`, `exorcised` or `locked`.

### Requirement 12: Accessibility and small screens (PR 1)

**User Story:** As a judge, I want to use the page with the keyboard and on a phone, so that I can try it in any setup.

#### Acceptance Criteria

1. THE Web_Page SHALL let the judge reach and use every button, field and link with the keyboard alone.
2. THE Web_Page SHALL show every status and error message in the Status_Region.
3. WHILE the viewport is 360 px wide, THE Web_Page SHALL show all text with no horizontal scroll of the page (long code lines may scroll inside their own block).

### Requirement 13: Vitest alias (PR 1)

**User Story:** As the project director, I want web tests to use the current core source, so that `npm test` works without a build.

#### Acceptance Criteria

1. THE `vitest.config.ts` SHALL alias `@haunted-repo/core` to `packages/core/src/index.ts`.
2. WHEN `npm test` runs after a clean checkout with no build, THE Web_Package tests SHALL run against the Core source.

### Requirement 14: Replace the check button (PR 1)

**User Story:** As the project director, I want the old check button removed, so that no dead code stays.

#### Acceptance Criteria

1. THE Web_Page SHALL show no "Check GitHub connection" button.
2. THE Live_Form logic SHALL reuse the single-flight logic of `packages/web/src/checkButton.ts` where it fits.
3. THE Web_Package SHALL contain no code or test from `checkButton.ts` that the new page does not use.

### Requirement 15: Real service checks (PR 1)

**User Story:** As the project director, I want the real GitHub calls checked, so that the demo works outside the fakes.

#### Acceptance Criteria

1. THE Sample_Script run SHALL count as the real-service check of detection and download at the Sample_SHA.
2. WHEN PR 1 is deployed, the project director SHALL check the Live_Form by hand on the deployed Web_Page with the Sample_Repo URL, because the browser cannot set the User-Agent header (docs/frictions.md, 12 Nov).
3. WHEN Kiro opens PR 1, Kiro SHALL write in the PR body the steps for the check of criterion 2: the exact page URL to open (`https://devcaos.github.io/haunted-repo/`), the exact repository URL to paste (`https://github.com/lukeed/sirv`), what the director should see on success (the Ghost_List of the live report and the Power line of Requirement 4.7), and what the director should see on the Fallback (the Sample_Report and the Fallback_Message).
4. THE Check_Script SHALL perform no network access.

### Requirement 16: Project documents (PR 1 and PR 2)

**User Story:** As the project director, I want the plan and logs up to date, so that I can resume work later.

#### Acceptance Criteria

1. WHEN the spec is done, THE PLAN.md item 6 ("Spec: web de demostración") SHALL be marked done.
2. WHEN PR 1 is done, THE PLAN.md "Pendientes" line about the MIT notice of lukeed/sirv SHALL be marked closed.
3. WHEN PR 1 is done, THE PLAN.md note (g) SHALL be marked used.
4. THE `docs/kiro-usage-log.md` file SHALL receive one new line about this spec in each PR.
5. IF a task gets stuck, THEN `docs/frictions.md` SHALL receive an entry the same day, in its own docs commit.
6. WHEN PR 1 is done, THE PLAN.md note (e) ("en el navegador se guarda solo el progreso") SHALL be replaced by "nothing is saved" (pending docs change, made in the PR 1 branch, not before; see Requirement 9).

### Requirement 17: Report warnings (PR 1)

**User Story:** As a judge, I want to know when a report is incomplete, so that I do not take a partial result as the full picture.

#### Acceptance Criteria

1. WHILE the Ghost_List shows a report whose `overview.partial` is true, THE Web_Page SHALL show one plain line saying that the analysis is incomplete.
2. WHILE the Ghost_List shows a report whose `overview.message` is not null, THE Web_Page SHALL show one line with the text of `overview.message`.
3. WHILE the Ghost_List shows a report whose `overview.truncated` is true, THE Web_Page SHALL show one plain line saying that only part of the repository files was looked at.
4. WHILE the Ghost_List shows a report whose `overview.skipped` list is not empty, THE Web_Page SHALL list every skipped file with its path and a plain reason: "too large" for `TOO_LARGE` and "not text" for `NOT_TEXT`.
5. THE Web_Page SHALL apply criteria 1 to 4 to the Sample_Report and to every live report.
6. WHILE the Ghost_List shows a report with `overview.partial` false, `overview.message` null, `overview.truncated` false and an empty `overview.skipped`, THE Web_Page SHALL show no report warning.

### Requirement 18: Readiness for a scenic UI (PR 1 and PR 2)

**User Story:** As the project director, I want the page logic to describe the screen as plain data and to accept named actions, so that a later immersive design can replace the whole look by changing only presentation files.

#### Acceptance Criteria

1. THE Logic_Layer SHALL describe everything the Web_Page shows in one View_Model of plain data, with no functions and no DOM nodes, that is unchanged by a JSON round trip (property-based test P11).
2. THE View_Model SHALL hold the current Scene (house, one floor, or one ghost with its floor and path) and, in the render where the Scene changed, the previous and the next Scene.
3. THE Presentation_Layer SHALL send every judge input as a named User_Action, and THE Logic_Layer SHALL ignore every User_Action that the View_Model does not list as available, with no state change, no engine event and no `detectGhosts` call (property-based test P10).
4. THE Logic_Layer SHALL never wait for the Presentation_Layer, so that an animation or transition never delays the logic.
5. THE Web_Package SHALL declare every graphic asset slot in one manifest, each with a fallback, and THE Web_Page SHALL work with every slot empty; this spec adds no graphic asset.
6. THE Web_Package tests SHALL check, without a browser, the View_Model of each main state of the page listed in the design.
7. THE Logic_Layer SHALL import nothing from the Presentation_Layer, and THE Presentation_Layer SHALL import only types from Core, checked by a test.

## Edge Cases

- The judge double-clicks the Live_Form submit button: only one `detectGhosts` call runs.
- The judge submits an empty or blank URL: Core returns `INVALID_URL` and the page shows its message; the form keeps the text.
- GitHub is unreachable or rate-limits the browser (60 requests per hour without an account): the Fallback shows the Sample_Report and the Fallback_Message.
- A live repository has fewer than 5 ghosts, or every ghost on one floor: the empty floors show their "no ghosts" line.
- A Ghost_Text is empty: the Exorcism_Panel shows an empty code block and the explanation; `classifyFileKind` returns `general`.
- The judge says "I don't know" twice on the same question: the model answer is shown and the engine counts the question as wrong.
- The judge rates "Missed it" on the first question: the attempt cannot pass (the core question is wrong) and ends in `failed` after the third rating.
- The judge leaves a ghost in the middle: the ghost stays haunted and the Ghost_List is shown again.
- The judge exorcises every Scripted_Ghost while Locked_Ghosts remain: the step returns to `choosing`, not `house-clean`, and the Progress_Indicator does not reach 0.
- The judge types a very long answer: it stays in the Answer_Box and is never read or stored.
- The judge wants a live analysis during a sample exorcism: the Live_Form is hidden while the Exorcism_Panel is open, so the judge must leave first (or go back to the list from `failed`, or finish the self-check).
- The judge runs a live analysis after exorcising a sirv ghost, then clicks "Show the sample again": the Sample_Report comes back with that ghost still exorcised.
- The judge is in `self-check`: no leave button is shown; the judge must pick "Yes", "Partly" or "Not yet".
- The judge clicks "Back to the list" after `failed`: no event is sent; the ghost stays haunted and the next start sends `pick-ghost`.
- The judge retries a ghost twice or more: each retry shows the retry explanation again and the same 3 questions.
- The judge says "I don't know" on two different questions: each one shows the simpler explanation of its own question.
- A Ghost_Text is very long: the Code_Block shows all of it with its own scroll; the page itself does not grow past the maximum height.
- Two ghosts of the Sample_Report have the same difficulty score at the cut for the 2 easiest: the smaller path (string comparison) wins.
- The sample or a live report has skipped files, a message, `truncated` or `partial`: the report warnings of Requirement 17 are shown.
- The repository name changes: `base` in `vite.config.ts` must change with it.

## Done Criteria

- On the deployed Web_Page, the page opens on the sirv report with no network request.
- On the deployed Web_Page, a live URL shows its ghosts, or the Fallback shows with a clear message.
- On the deployed Web_Page, a judge can exorcise the 2 easiest sirv ghosts from start to end.
- The Progress_Indicator changes when a ghost is exorcised.
- Changing only the Tokens_File changes the colours of the whole page.
- The Licence_Notice is visible in the footer and next to the code.
- `npm run check` is green.
- PR 1 and PR 2 are open and not merged. Each task has its own commit and is marked `[x]` in `tasks.md`.

## Out of Scope

- Any drawing of the house, illustration, painted image, animation or sound.
- The final visual design (made later with other tools).
- The scenic renderer, rooms art, animations and any graphic asset (a later spec).
- The Kiro Power and the exorcism certificate.
- Accounts and saving progress in any form.
- Exorcising a live repository on the web.
- Any AI call or paid API call.
- Google Fonts, any CDN or any third-party script.
- An automated live-network test of the Web_Page (the Sample_Script and the manual check cover it).
- Any change to `packages/core/src`, code or comments (the "TEST ONLY" comment of `DetectOptions.ref` stays as is).
- Editing `PLAN.md` before the PR 1 branch (the note (e) change of Requirement 16.6 is pending until then).
- Trimming long Ghost_Texts.
- Extra retry questions beyond the 3 of each Ghost_Content.

## Open Questions

1. **Live analysis while exorcising.** What does the page show while a live analysis runs? Can the judge keep using the sample exorcism meanwhile, or does the live result replace the Ghost_List and end the session (which loses in-memory progress)?
   **Resolved:** the Live_Form is used only from the Ghost_List, never with the Exorcism_Panel open. The Sample_Session is kept in memory apart, and "Show the sample again" restores it with its progress (in memory only; a reload starts again). See Requirements 4.10 to 4.12.
2. **After `failed`.** Requirement 6.13 offers `retry-ghost` and `leave-ghost`. Confirm. Also: the Ghost_Content has one retry explanation; what does a second retry show (the retry explanation again)?
   **Resolved:** "Try again" sends `retry-ghost`; "Back to the list" sends no event, because `failed` does not accept `leave-ghost`. A second or later retry shows the retry explanation again. See Requirements 6.4, 6.18 and 6.19.
3. **Retry questions.** On a retry, `buildInstructions` adds the rule `different-questions` with the questions asked before. The Ghost_Content has only 3 questions, so a retry repeats them. Accept repeating them in the demo, or add 3 more questions per ghost?
   **Resolved:** the same 3 questions may repeat; the engine does not require different ones. See Requirement 6.24.
4. **Simpler explanation per ghost or per question.** For the `simplifying` step, `buildInstructions` asks for a simpler explanation "of the part of the file that the question is about", and `dont-know` can happen on each of the 3 questions. The brief gives one simpler explanation per ghost. Accept one shared text, or write one simpler explanation per question?
   **Resolved:** one simpler explanation per question, so 3 short simpler texts per ghost. See the Ghost_Content glossary entry and Requirements 6.13 and 7.5.
5. **Long files.** Is the shown code the full Ghost_Text, or is it cut for very long files (and if cut, at how many lines)?
   **Resolved:** the full text, in a block with its own scroll and a maximum height, never trimmed, because the same text goes to the engine in `pick-ghost` (Core limit 100 KB). See Requirement 6.6.
6. **Self-check buttons.** Confirm that the three self-check buttons map to `yes`, `half` and `no`, and choose their labels.
   **Resolved:** events `yes`, `half`, `no`; labels "Yes", "Partly", "Not yet". See Requirement 6.16.
7. **`ref` from the Sample_Script.** `DetectOptions.ref` is documented as "TEST ONLY: a commit SHA read instead of the default branch. No URL can set it." Using it from a hand-run script stretches that comment. Option A: change the comment to "test and sample-script only" (a docs change in Core, needs approval). Option B: keep the comment as is.
   **Resolved:** Option B. Core is not touched; the Sample_Script uses `ref` and says why in a comment. See Requirement 1.2.
8. **`INVALID_REPORT`.** `detectGhosts` never returns `INVALID_REPORT` (only `parseReport` does). Requirement 5.3 maps it to the Fallback so that P3 covers every code. Confirm, or choose "show message".
   **Resolved:** mapping `INVALID_REPORT` to the Fallback is correct. See Requirement 5.3.
9. **Download cost.** `detectGhosts` does not return file texts, so the Sample_Script makes extra GitHub requests (one per ghost plus the licence). Without a token the limit is 60 per hour. Confirm that running it with no token is enough, since it is run rarely and by hand.
   **Resolved:** no token. One run makes about 14 requests at most (up to 8 for `detectGhosts`, 5 Ghost_Texts, 1 Licence_Text). The Core GitHub client stops at 8 requests per instance, so the downloads use a separate request budget (a new client instance or plain fetch of raw files at the Sample_SHA, as the design decides). See Requirements 1.4 and 1.5.
