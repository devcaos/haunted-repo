# Requirements Document

## Introduction

This spec adds a second Renderer to the demo page in `packages/web`: the Scenic_Renderer, in `packages/web/src/view/scenic/`. It draws the demo as a Halloween video-game scene: a cutaway haunted house with three floors, a different ghost design for each floor, a game HUD in real HTML, a telephone that rings when there is a ghost to attend, and a close-up exorcism room with a Grimoire dialogue panel. The art is hand-built SVG, made from plain data and animated with modern CSS only.

The Scenic_Renderer implements the existing `Renderer` interface of `src/logic/viewModel.ts` (`render(model: ViewModel): void`) and sends the existing `UserAction` values. It becomes the default view. The current Simple_Renderer stays available at `?view=simple` and through a visible "Simple view" link, and it gets a "Scenic view" link back. Both renderers use the same Logic_Layer, which this spec does not change, apart from new English texts (see Requirement 2).

This spec follows the plan written in the web-demo design ("Readiness for a scenic UI" and "How to replace the look"): a new folder under `src/view/`, one renderer choice in `main.ts`, and no change to `src/logic/**`, `src/sample/**`, the committed data or Core. It also takes the decisions of 16 Nov in `docs/decisiones.md`: an SVG with a video-game look (Halloween style, with animation) and a different ghost design for each floor. The tagline is the one decided on 17 Nov: "Your repo is haunted. Let's fix that."

Facts checked in the code on 17 Nov and respected here:

- Floors are exactly `"attic"` (easy, score 0 to 33), `"middle floor"` (34 to 66) and `"basement"` (hard, 67 to 100) (`packages/core/src/ghost-detection/floor.ts`).
- The committed sirv sample (`src/sample/report.json`) has 4 attic ghosts, 1 middle-floor ghost and 0 basement ghosts. Only `bench/static.js` and `builder.js` have Ghost_Content in the Demo_Script, so only those two can be exorcised on the page; the other 3 are Locked_Ghosts.
- The engine reaches `house-clean` only when no ghost is haunted (`suggestGhost` returns `null`, `packages/core/src/exorcism/engine.ts`). Locked_Ghosts stay haunted in the engine, so the sample can never reach `house-clean`.
- A live report has up to 5 ghosts, and all of them can be on one floor.
- The Logic_Layer already exposes `scene` (`house`, `floor`, `ghost`), `transition`, `go-to-floor` and `go-to-house`. The Simple_Renderer does not use them.
- While `scene.kind` is `"ghost"`, Available_Actions holds only the ghost actions of the step: no `go-to-floor`, `go-to-house`, `start-ghost`, `submit-live` or `show-sample` (`available` in `page.ts`).
- A ghost becomes `exorcised` in the progress when its third answer is decided and the step becomes `self-check`, not after the self-check answer (`nextQuestion` in `engine.ts`). So the Card changes while the Ghost_Scene is still open (Requirement 12).
- `house.progress.total` is the number of different ghost paths of the sample report: 5 for sirv (`buildProgress` in `houseView.ts`).

### Relation to the web-demo spec

The web-demo spec is not edited by this spec. Its rules relate to the Scenic_Renderer as follows:

- For the Scenic_Renderer, Requirements 3, 5, 21 and 22 of this spec replace web-demo Requirements 11.1, 11.2, 11.4 and 11.6 and the web-demo Out of Scope line "Any drawing of the house, illustration, painted image, animation or sound" (sound stays out of scope here too). Those web-demo rules keep binding the Simple_Renderer only. The decision is recorded in `docs/decisiones.md` (17 Nov).
- This spec is the "later spec" named in the web-demo Out of Scope ("The scenic renderer, rooms art, animations and any graphic asset").
- New texts: this spec is the separate decision about texts that the web-demo design ("How to replace the look") asks for. New texts are additions only; no existing text in `texts.ts` or `powerTexts.ts` changes (Requirement 2.2).
- Asset manifest: Shape_Data is code, not an asset. The asset manifest of web-demo Requirement 18.5 stays for image files. The Scenic_Renderer shows the scene illustration and the four Gate_Panel pictures (frame, gargoyle, lantern, pumpkin; director's decision, 19 Nov), which `src/view/scenicEntry.ts` resolves from the manifest and hands in (Requirement 22.10).
- Every other web-demo requirement that binds any renderer still holds (Requirement 25), including 4.7 (the Power line of a live report), 9 (nothing stored), 10.1 and 10.2 (licence), 12.3 (no horizontal scroll at 360 px) and 17 (warnings).

### Style guide (short note)

The full style guide goes in `design.md`. The rules that the requirements rely on are:

- Shadow-theatre silhouettes in 4 to 5 depth layers; farther layers are lighter and bluer.
- A thin rim light from the moon on the silhouettes.
- At least 40% of each scene is deep shadow.
- One main light per scene.
- Nothing symmetric: the composition is asymmetric.
- One eye-catching anomaly at a time.
- Colour meaning: cold blue means code you do not understand yet; warm orange means code that is yours.
- Intent only, not tested: the Wisp looks playful.

### Size of the work

This spec will change far more than about 500 lines. Following `git-workflow.md`, the design must propose how to split it into stacked pull requests before any task starts, as was done for web-demo (decision of 14 Nov in `docs/decisiones.md`).

## Glossary

Names in `code font` are the exact names in the code (checked on 17 Nov). Names with underscores are the spec names used in the web-demo spec or in this spec.

- **Web_Page**: the static demo site built from `packages/web` and served on GitHub Pages (same as in the web-demo spec).
- **Web_Package**: the workspace `packages/web` (`@haunted-repo/web`).
- **Core**: the workspace `@haunted-repo/core` (`packages/core`).
- **Logic_Layer**: the modules under `src/logic/` and `src/sample/` that call Core, hold page state and build the ViewModel. They have no DOM access (web-demo Requirement 11.7).
- **Presentation_Layer**: the files under `src/view/` plus their CSS (web-demo glossary).
- **ViewModel**: the plain-data description of everything the Web_Page shows, type `ViewModel` in `src/logic/viewModel.ts` (the web-demo spec writes it as View_Model).
- **UserAction**: a named judge input, type `UserAction` in `src/logic/actions.ts` (the web-demo spec writes it as User_Action). `AvailableAction` is the same list with `submit-live` listed without a URL.
- **Available_Actions**: the field `available` of the ViewModel. The Logic_Layer ignores any UserAction not listed there.
- **Renderer**: the interface `Renderer` in `src/logic/viewModel.ts`: `render(model: ViewModel): void`.
- **Simple_Renderer**: the current sober Renderer in `src/view/simple/` (`createSimpleRenderer` in `renderer.ts`).
- **Scenic_Renderer**: the new Renderer of this spec, in `src/view/scenic/`.
- **Main_Entry**: `packages/web/src/main.ts`, the only file that imports both a Renderer and the controller (`createPage`).
- **View_Choice**: the rule in Main_Entry that picks the Scenic_Renderer or the Simple_Renderer from the page address.
- **Simple_View_Link**: the visible link in the HUD that opens the Web_Page with `?view=simple`.
- **Scenic_View_Link**: the visible link in the Simple_Renderer that opens the Web_Page without `view=simple`.
- **Scene**: the type `Scene` of the ViewModel field `scene`: `{ kind: "house" }`, `{ kind: "floor", floor }` or `{ kind: "ghost", floor, path }`.
- **Transition**: the ViewModel field `transition` (`SceneTransition | null`): `{ from, to }` only in the render where the Scene changed.
- **House_Scene**: what the Scenic_Renderer draws when `scene.kind` is `"house"`: the whole cutaway house.
- **Floor_Scene**: what the Scenic_Renderer draws when `scene.kind` is `"floor"`: the Camera framed on one floor, the other two floors dimmed.
- **Ghost_Scene**: what the Scenic_Renderer draws when `scene.kind` is `"ghost"`: the close-up exorcism room.
- **Scene_Heading**: the heading of the shown Scene, as real HTML text: the House_Scene heading, the Floor_Scene heading or the Grimoire heading.
- **Cutaway_House**: the drawing of the house with its front removed, like an open doll's house, showing the attic, the middle floor (Entrance_Hall and Parlour) and the basement.
- **Entrance_Hall**: the left part of the middle floor, with the front door and the telephone table.
- **Parlour**: the right part of the middle floor.
- **Camera**: the CSS transform of the scene layers that frames the whole house or one floor.
- **HUD**: the game heads-up display: the real HTML layer over the scene with the logo, tagline, Haunt_Meter, Ghost_Icons, Live_Plaque, Status_Region, Bestiary, Lightning_Toggle, Licence_Notice and Simple_View_Link.
- **Haunt_Meter**: the HUD bar, drawn like a health bar, that shows the ViewModel `ProgressView` (`line` and `share`). It is shown only while `house.progress` is not `null` (the sample).
- **ProgressView**: the type `ProgressView` in `viewModel.ts`: `line`, `haunted`, `total`, `share`. It is set in `house.progress` only for the sample (`null` for a live report).
- **Ghost_Icons**: the row of small HUD icons, one per Card of the sample report (`house.progress.total`, 5 for sirv), each showing haunted or exorcised. Not shown for a live report.
- **Live_Plaque**: the live form (web-demo Live_Form) drawn as a brass plaque. Same label (`TEXTS.formLabel`), same button text (`TEXTS.actionLabels["submit-live"]`) and same behaviour as the Simple_Renderer form.
- **Status_Region**: the element with `aria-live="polite"` that shows the ViewModel `status.text` (web-demo glossary). It shows only what the Logic_Layer sends.
- **Scenic_Announcer**: a second element with `aria-live="polite"`, owned by the Scenic_Renderer, that announces the Scenic_Renderer's own messages (the Phone_Bubble and the Finale banner). It is not the Status_Region.
- **Licence_Notice**: the sirv MIT notice: the copyright line plus a link to `sirv-license.txt` (`LicenceView` in `viewModel.ts`).
- **Ghost_Type**: one of the three ghost designs, one per floor: **Wisp** (attic), **Lantern_Wraith** (middle floor), **Chained_Brute** (basement).
- **Variant**: one of 5 visual versions (numbers 0 to 4) of a Ghost_Type (size, tilt, eyes, accessory), chosen from the ghost's position among the Cards of its floor.
- **Ghost_Slot**: the place over the scene illustration where one ghost is drawn (no window of its own). Ghost_Slots exist in the House_Scene and the Floor_Scene only.
- **Nameplate**: the brass HTML label of one ghost of the focused floor in a Floor_Scene: path, reason, difficulty and state, the locked line when the Card is Locked, and the start control when `canStart` is true. The House_Scene has no Nameplates.
- **Card**: one `GhostCardView` of the ViewModel (`house.floors[i].ghosts[j]`), with `path`, `floor`, `score`, `reason`, `state`, `canStart` and `lockedLine`.
- **Haunted / Locked / Exorcised**: the three values of `GhostState` (`"haunted"`, `"locked"`, `"exorcised"`) of a Card.
- **Cloche**: the glass bell jar with a padlock in which every Locked ghost is drawn.
- **Scripted_Ghost / Locked_Ghost**: a sample ghost with or without Ghost_Content in the Demo_Script (web-demo glossary).
- **Bestiary**: a small HUD panel that shows the three Ghost_Types with the floor and the difficulty range each one stands for.
- **Telephone**: an original antique desk telephone on the telephone table of the Entrance_Hall, with no logo, no film character and no sound. It is drawn in the House_Scene and the Floor_Scene, not in the Ghost_Scene.
- **Ring**: one ring of the Telephone, lasting about 2 s: a shake, vibration lines, an orange glow and a "RING!" bubble.
- **Opening_Rings**: three Rings in a row (about 6 s in total) when the House_Scene is drawn for the first time in a page load.
- **Live_Call**: the continuous ringing that starts when a live analysis ends with a live report (Requirement 9.5).
- **Ringing**: the Telephone while a Ring or a Live_Call plays.
- **Answer_Button**: the real HTML button "Answer the phone" placed over the Telephone.
- **Telephone_Target**: the path of the first Card whose `canStart` is true, in floor order (attic, middle floor, basement), then report order inside each floor, or none. If a path repeats, the first Card with that path wins.
- **Phone_Bubble**: the speech bubble next to the Telephone that shows the caller's words or "The line is quiet."
- **Grimoire**: the dialogue panel of the Ghost_Scene. It holds the reading, the question, the Answer_Box, the model answer, the prompts, the judge line and the ghost actions as game-style choices, plus the Code_Block and the Licence_Notice next to it.
- **Answer_Box**: the text box where the judge may type an answer. Its text is never read, sent, logged or stored (web-demo Requirement 6.23; `createAnswerBox` in `src/view/simple/ghost.ts`).
- **Code_Block**: the block that shows the full Ghost_Text (`ghost.code`) with its own scroll and a maximum height (web-demo glossary).
- **Question_Candles**: three candles in the Ghost_Scene, one per question; each finished question lights one.
- **Reaction**: a short ghost animation in the Ghost_Scene that follows a UserAction the Scenic_Renderer itself dispatched.
- **Exorcised_Moment**: the animation in the Ghost_Scene when a Card changes from Haunted to Exorcised between two renders: the ghost spirals up into orange sparks and the room turns from cold to warm.
- **Return_Glow**: the animation when the judge comes back to the House_Scene or a Floor_Scene after an Exorcised_Moment: the Exorcised drawing of the ghost's slot fades in and the Haunt_Meter moves.
- **Finale**: the "demo complete" scene change: the rain stops, the horizon turns dawn orange and a banner appears.
- **Search_Beam**: the visible searching animation shown while a live analysis runs (a lantern beam that sweeps the house).
- **Lightning**: a short flash that lights the house.
- **Lightning_Toggle**: the visible HUD button "Lightning: on" / "Lightning: off".
- **Intro**: the optional opening animation in which the facade of the house opens like two doors.
- **Reduced_Motion**: the user setting `prefers-reduced-motion: reduce`.
- **Gate_Panel**: the HUD drawn as a stone gate inside the world (director's decision, 19 Nov). Wide screens: a frame, a gargoyle with a rose window, a lantern and a pumpkin around the HUD text. Narrow screens: the gargoyle over the logo and the form, the Bestiary and the footer inside a tombstone. The pictures are decoration; every text stays HTML.
- **Gate_Rise**: the entrance of the Gate_Panel on wide screens (director's decisions, 19 and 20 Nov): once its pictures have loaded after the house picture, the stone gate rises from the bottom of the window in 3 s (a rumble, four pushes that rock it less each time, a heavy landing), pieces of earth and stone fly up and fall, the gargoyle's eyes, the lantern and the pumpkin light up, and then the HUD texts appear with a cold flicker, top to bottom. The texts never move. It runs once per page load.
- **Motion_Button**: the button "Motion: on" / "Motion: off" of the Scenic view. It stops or starts every animation and transition of the Scenic view and stores nothing.
- **Scenic_Tokens**: the one CSS file of the Scenic_Renderer that holds every colour, size and font as CSS custom properties.
- **Shape_Data**: the plain data (lists of shapes with class names, coordinates and no colours) that describes each SVG piece. It is code, not an asset.
- **Scene_Layout**: the pure functions of the Scenic_Renderer that turn a ViewModel into placed pieces (Ghost_Slots, Variants, start controls, Telephone_Target, Finale flag) without touching the DOM.
- **Source_Scan**: the test file `packages/web/src/source.test.ts`, which scans source text.
- **Size_Check**: the Node script run by `npm run size`, right after the build in `npm run check`. It measures the gzipped size of the built files in `packages/web/dist/` and looks for external addresses in them.
- **Shots_Script**: the hand-run command `npm run shots` that drives the page with Playwright, with every GitHub request intercepted, and saves screenshots.
- **Gallery**: a dev-mode-only page that shows the three Ghost_Types with all Variants and states side by side.
- **Check_Script**: the root command `npm run check` (lint, format check, build, Size_Check, tests).
- **D1 to D14**: the items of the section "Left to the design" at the end of this document.

## Requirements

### Requirement 1: Renderer choice

**User Story:** As a judge, I want the scenic view by default and a way to switch to the simple view and back, so that I see the game look first and can still use a plain page.

#### Acceptance Criteria

1. WHEN the Web_Page loads with no `view` query parameter, THE View_Choice SHALL create the Scenic_Renderer.
2. WHEN the Web_Page loads and the first value of the `view` query parameter (the value `URLSearchParams.get("view")` returns) is exactly `simple` (case-sensitive, nothing before or after it), THE View_Choice SHALL create the Simple_Renderer.
3. IF the first value of the `view` query parameter is empty or is anything other than exactly `simple`, THEN THE View_Choice SHALL create the Scenic_Renderer.
4. THE Main_Entry SHALL pass the chosen Renderer to one `createPage` call, and the `PageDeps` given in that call SHALL be the same for both renderers.
5. THE Main_Entry SHALL create exactly one Renderer per page load, before the first call to `render`. The page SHALL contain no element created by the other Renderer.
6. WHILE the Scenic_Renderer is shown, THE HUD SHALL show the Simple_View_Link in the House_Scene, the Floor_Scene and the Ghost_Scene. The link's address SHALL be the relative address `?view=simple`, so that it opens the Simple_Renderer under the Vite `base` path `/haunted-repo/`.
7. THE View_Choice SHALL read only the query string of the page address, and it SHALL NOT change the page address.
8. THE View_Choice SHALL store nothing in the browser: no cookie, no `localStorage`, no `sessionStorage` and no IndexedDB entry.
9. THE Main_Entry SHALL load only the style sheets of the chosen Renderer, so that WHILE the Simple_Renderer is shown, THE Web_Page applies no CSS rule of the Scenic_Renderer.
10. WHILE the Scenic_Renderer is shown, THE Web_Page SHALL apply no CSS rule of the Simple_Renderer.
11. WHILE the Simple_Renderer is shown, THE Simple_Renderer SHALL show the Scenic_View_Link: a visible link with a new text in `texts.ts` (for example "Scenic view") whose address is a relative address with no `view` query parameter, so that it opens the Scenic_Renderer under the `base` path.
12. WHEN the judge follows the Simple_View_Link or the Scenic_View_Link, THE Web_Page SHALL load again from the start: the in-memory Sample_Session, Lightning_Toggle state and typed URL are lost (allowed by web-demo Requirement 9.3).

#### Edge cases

- `?view=SIMPLE` and `?view=` give the Scenic_Renderer (criteria 2 and 3).
- `?view=simple&view=scenic` gives the Simple_Renderer, and `?view=scenic&view=simple` gives the Scenic_Renderer: only the first value counts (criterion 2).
- Both links drop the hash and every other query parameter of the current address. This is accepted.
- The address also has a hash or other query parameters: they do not change the choice.
- The judge exorcised a ghost and then switches view: the progress starts again (criterion 12).

### Requirement 2: Logic untouched

**User Story:** As the project director, I want the new look to change only presentation files, so that the tested logic, data and engine stay as they are.

#### Acceptance Criteria

1. THE pull requests of this spec SHALL leave every file under `packages/web/src/logic/`, its test files included, byte-for-byte unchanged compared with the base branch of each pull request, except `texts.ts` and `powerTexts.ts`. No file under `packages/web/src/logic/` SHALL be added, removed or renamed.
2. THE pull requests of this spec SHALL change `texts.ts` only by adding new keys with English texts to `TEXTS`, and `powerTexts.ts` only by adding new keys to `POWER_TEXTS` with English texts that name the Kiro Power. Every key that `TEXTS` or `POWER_TEXTS` has in the base branch, nested keys included, SHALL still exist with the same value.
3. THE pull requests of this spec SHALL leave the following byte-for-byte unchanged compared with the base branch of each pull request: every file under `packages/web/src/sample/` (including the committed data `report.json`, `files.json` and `demo-script.json`), `packages/web/public/sirv-license.txt`, and every file under `packages/core/`. No file SHALL be added to, removed from or renamed in `src/sample/` or `packages/core/`.
4. THE pull requests of this spec SHALL leave the declarations of the types `ViewModel`, `Scene`, `SceneTransition`, `HouseView`, `GhostView`, `GhostCardView`, `ProgressView`, `UserAction`, `AvailableAction` and `Renderer` unchanged: the same fields, the same field types and the same union members. Every field SHALL keep the meaning the web-demo spec gives it.
5. IF a requirement of this spec can only be met with a new ViewModel field, a new UserAction or a new union member of a type listed in criterion 4, THEN THE spec SHALL record it as an open question, and THE implementation SHALL NOT add that field, action or member.
6. THE Scenic_Renderer SHALL import from Core only with `import type`, and the Source_Scan check "src/view imports Core only with import type" SHALL include every file under `src/view/scenic/` and pass.
7. WHEN the Scenic_Renderer dispatches a UserAction, THE Scenic_Renderer SHALL dispatch only one that matches an entry of Available_Actions of the last ViewModel passed to its `render`. A match means the same `type` and the same parameters; for `submit-live` any URL matches.
8. IF the Scenic_Renderer has not yet received a ViewModel, THEN THE Scenic_Renderer SHALL dispatch no UserAction.
9. THE pull requests of this spec SHALL only add checks to the Source_Scan or extend existing ones; no existing check SHALL be removed, skipped or made weaker.
10. THE pull requests of this spec SHALL change files under `src/view/simple/` only to add the Scenic_View_Link (Requirement 1.11) and to move the pure focus rule to a shared file (Requirement 17.10), with no change of Simple_Renderer behaviour beyond the new link.

#### Edge cases

- A new text is only a new key in `TEXTS` or `POWER_TEXTS`. Changing the wording of an existing text, or removing a key, is not allowed in this spec.
- `main.ts`, `index.html`, `source.test.ts` (additions only, criterion 9), `vite.config.ts`, the root and web `package.json` and new files in `packages/web/public/` (the font licences, Requirement 21.8) may change. They are not Logic_Layer files.
- An animation or Reaction that ends after a newer render checks its UserAction against the newest ViewModel, not the one that was current when the animation started (criterion 7).
- A test file added under `src/view/scenic/` is a Presentation_Layer file and does not break criterion 1.
- Extending the raw-HTML pattern of the Source_Scan (Requirement 22.3) is an extension and is allowed by criterion 9.

### Requirement 3: House scene

**User Story:** As a judge, I want to see the repository as a haunted house with its three floors, so that I understand at a glance where the easy and the hard ghosts live.

#### Acceptance Criteria

1. WHILE `scene.kind` is `"house"`, THE Scenic_Renderer SHALL draw the Cutaway_House with the Camera framing the whole house, so that the three floors are visible at once and stacked from top to bottom in this order: the attic under the roof, the middle floor, and the basement below a cut ground line.
2. THE Cutaway_House SHALL draw the middle floor with the Entrance_Hall in its left part (front door and telephone table) and the Parlour in its right part.
3. WHILE `scene.kind` is `"house"` or `"floor"` and the Finale is not shown, THE Scenic_Renderer SHALL draw a night sky, a moon, fog, rain and foreground silhouettes. Requirement 13.3 covers the Finale.
4. THE House_Scene composition SHALL be asymmetric: the left half of the drawing SHALL NOT be a mirror image of the right half about the vertical centre line.
5. WHILE `scene.kind` is `"house"` or `"floor"` and `house` is not `null`, THE Scenic_Renderer SHALL draw exactly one Ghost_Slot per Card of `house.floors`. Each Ghost_Slot SHALL lie inside the floor whose `floor` equals `card.floor`, and its content SHALL follow the Card state (Requirement 6).
6. WHILE `scene.kind` is `"house"` or `"floor"`, THE Scenic_Renderer SHALL show, for each `house.floors[i]` whose `{ type: "go-to-floor", floor: house.floors[i].floor }` is in Available_Actions, exactly one real HTML button whose visible label is `house.floors[i].title` and whose accessible name is that title followed by `TEXTS.actionLabels["go-to-floor"]` (D1). THE Scenic_Renderer SHALL show no floor button for a floor whose action is not in Available_Actions.
7. WHEN the judge activates a floor button, THE Scenic_Renderer SHALL dispatch `{ type: "go-to-floor", floor }` for the floor of that button.
8. WHILE `scene.kind` is `"house"`, THE Scenic_Renderer SHALL show the House_Scene heading as real HTML text: `TEXTS.houseHeading(house.repoName)` ("Ghosts of owner/repo") when `house` is not `null`, and `TEXTS.pageTitle` when `house` is `null` (D1).
9. IF `house` is `null` (the sample failed to load), THEN THE Scenic_Renderer SHALL draw the Cutaway_House with no Ghost_Slot and no floor button, and SHALL show `status.text` in the Status_Region.
10. WHILE `scene.kind` is `"house"`, THE Scenic_Renderer SHALL show no Nameplate and no start control. Apart from the HUD, the only controls of the House_Scene SHALL be the floor buttons and the Answer_Button.

#### Edge cases

- The sample has no basement ghost: the basement is drawn empty (Requirement 8.6) and the Bestiary still shows the Chained_Brute (Requirement 7).
- A live report with all 5 ghosts on one floor: all 5 fit in that floor (Requirement 23.3).
- A live report with 1 ghost: two floors are empty.
- In the House_Scene all three floors get a floor button, because the Logic_Layer lists `go-to-floor` for every floor that is not in focus, empty floors included.
- `house` is `null`: Available_Actions is empty, so no floor button appears (criterion 9 agrees with criterion 6), and the heading is `TEXTS.pageTitle`.
- A live analysis is running (`live.busy` true): the floor buttons stay, because the Logic_Layer lists `go-to-floor` even while busy.
- A judge who wants to start a ghost from the House_Scene uses a floor button or the Answer_Button (criterion 10).

### Requirement 4: Game HUD

**User Story:** As a judge, I want a game HUD over the scene, so that I always see the name, my progress, the live form and the messages.

#### Acceptance Criteria

1. THE HUD SHALL be real HTML placed over the scene, outside the SVG, in the House_Scene, the Floor_Scene and the Ghost_Scene.
2. THE HUD SHALL show the logo text `TEXTS.pageTitle` ("Haunted Repo") and the tagline "Your repo is haunted. Let's fix that." (a new text in `texts.ts`).
3. WHILE `house` is not `null` and `house.progress` is not `null`, THE Haunt_Meter SHALL show `house.progress.line` as text, and a bar whose filled width divided by its full width equals `house.progress.share` (0 to 1) within 0.01, except while `scene.kind` is `"ghost"`: then the Haunt_Meter keeps showing the text and the bar of the last House_Scene or Floor_Scene render, and moves to the new values in the first House_Scene or Floor_Scene render after the Ghost_Scene (Requirement 12.6).
4. WHILE `house` is not `null` and `house.progress` is not `null`, THE HUD SHALL show exactly `house.progress.total` Ghost_Icons (one per Card of the sample, 5 for sirv): `house.progress.haunted` of them shown as haunted and `house.progress.total - house.progress.haunted` shown as exorcised, with the same exception as criterion 3: while `scene.kind` is `"ghost"` the Ghost_Icons keep the haunted and exorcised states of the last House_Scene or Floor_Scene render, and change to the new states in the first House_Scene or Floor_Scene render after the Ghost_Scene.
5. WHILE `live.formVisible` is true, THE HUD SHALL show the Live_Plaque with a field labelled `TEXTS.formLabel` and a submit button labelled `TEXTS.actionLabels["submit-live"]`.
6. WHILE `live.formVisible` is false, THE HUD SHALL hide the Live_Plaque.
7. WHEN the judge submits the Live_Plaque (by clicking the submit button or by pressing Enter in the field, as in the Simple_Renderer form), THE Scenic_Renderer SHALL dispatch exactly one `{ type: "submit-live", url }`, where `url` is the field text as typed, with no trimming or other change.
8. WHILE `submit-live` is not in Available_Actions, THE Live_Plaque submit button SHALL be disabled, and pressing Enter in the field SHALL dispatch nothing.
9. THE Scenic_Renderer SHALL build the Live_Plaque once and keep the same field element and its typed text across all later renders, including renders where the Live_Plaque is hidden (web-demo Requirement 5.4).
10. THE HUD SHALL contain exactly one Status_Region (`aria-live="polite"`) from the first render. On every render, the Status_Region text SHALL equal `status.text`, and it SHALL be empty when `status.kind` is `"none"`. THE Scenic_Renderer SHALL write nothing else into the Status_Region.
11. WHILE `licence` is not `null`, THE HUD SHALL show the Licence_Notice inside a `footer` element: the `licence.copyright` line and a link with `href` `licence.href` and text `licence.linkText` (web-demo Requirement 10.1).
12. THE HUD SHALL show the Simple_View_Link, the Bestiary (Requirement 7) and the Lightning_Toggle (Requirement 15) in every render, including when the sample failed to load.
13. WHILE `house` is not `null` and (`house.warnings.lines` is not empty or `house.warnings.skippedTitle` is not `null`), THE HUD SHALL show every line of `house.warnings.lines` in its given order and, when `skippedTitle` is not `null`, that title followed by every entry of `house.warnings.skipped` with its path and reason (web-demo Requirement 17, which binds any renderer).
14. WHILE `house.powerLine` is not `null` (a live report is shown), THE HUD SHALL show `house.powerLine` as visible text in every Scene, whether or not the Telephone was answered (web-demo Requirement 4.7). The Telephone repeats it as the caller's words (Requirement 9.8).
15. WHILE `show-sample` is in Available_Actions, THE HUD SHALL show a button labelled `TEXTS.actionLabels["show-sample"]`, and one click SHALL dispatch exactly one `{ type: "show-sample" }`.
16. WHILE `show-sample` is not in Available_Actions, THE HUD SHALL NOT show the `show-sample` button.
17. WHILE `house` is `null` or `house.progress` is `null` (a live report, or the sample failed to load), THE HUD SHALL show no Haunt_Meter and no Ghost_Icons.
18. THE HUD SHALL show every text over a solid backing whose colour is a Scenic_Tokens value, so that its contrast (Requirement 17.12) holds over a Lightning flash or the Finale's dawn sky.

#### Edge cases

- The judge exorcises a ghost: in the render where the step becomes `self-check`, `house.progress` already holds the new values, but while the Ghost_Scene is open the Haunt_Meter and the Ghost_Icons still show the values of the last House_Scene or Floor_Scene render (criteria 3 and 4).
- A live report is shown: the Haunt_Meter and the Ghost_Icons are hidden (criterion 17) and the Power line is shown (criterion 14).
- The sample failed to load: `house` and `licence` are `null`. The HUD shows the logo, the tagline, the Status_Region, the Simple_View_Link, the Lightning_Toggle and the Bestiary. The Live_Plaque follows `live.formVisible` (the Logic_Layer decides); its button is disabled because Available_Actions is empty.
- The Ghost_Scene is open: the Live_Plaque is hidden (`live.formVisible` false) and the rest of the HUD stays. When the judge leaves the Ghost_Scene, the field still holds the text typed before (criterion 9).
- `status.kind` is `"none"`: the Status_Region stays in the page with empty text, so later messages are still announced.
- "Show the sample again" after a live report: the Haunt_Meter and the Ghost_Icons come back with the sample progress.

### Requirement 5: Three ghost designs and their variants

**User Story:** As a judge, I want each floor to have its own kind of ghost, so that I can tell easy ghosts from hard ones by their look.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL draw every Card whose `floor` is `"attic"` as the Wisp: a tall hooded wraith with a pointed hood, a dark oval face with two small pale eyes and no mouth, one long reaching arm and one short arm with clawed tips, and a robe that ends in long asymmetric points. Its body fades from pale blue-white at the hood to transparent at the robe points. The Wisp is the plain shape and the smallest of the three.
2. THE Scenic_Renderer SHALL draw every Card whose `floor` is `"middle floor"` as the Lantern_Wraith: the same hooded shape as the Wisp, larger, with a cold lantern of pale blue light hanging from the reaching claw.
3. THE Scenic_Renderer SHALL draw every Card whose `floor` is `"basement"` as the Chained_Brute: the same hooded shape, stretched wider, with dark iron shackles on both wrists and chains hanging from them. It has no rim light.
4. THE Scenic_Renderer SHALL take every colour of criteria 1 to 3 from the Scenic_Tokens, and no colour from the Shape_Data (Requirement 22).
5. THE Scenic_Renderer SHALL use the same Ghost_Type for a ghost in every place it is drawn: the Ghost_Slot, the Ghost_Scene (from `ghost.floor`), the Bestiary and the Gallery.
6. THE three Ghost_Types SHALL share one hooded silhouette and SHALL be told apart by size, proportion and one piece of their own. The Lantern_Wraith SHALL have a `lantern` part that the other two lack, and the Chained_Brute SHALL have `shackles` and `chain` parts that the other two lack. The Wisp has neither. At the same Variant number, the Wisp SHALL have the smallest outline and the Chained_Brute the widest.
7. WHILE Reduced_Motion is off, THE Scenic_Renderer SHALL give each Ghost_Type one idle animation, defined as a named CSS animation that differs from the idle animations of the other two Ghost_Types in name and in keyframes.
8. THE Scenic_Renderer SHALL give each Card the Variant number equal to its position among the Cards of its floor, in report order, from 0 for the first Card of that floor to at most 4. Each floor counts from 0 on its own.
9. THE Scenic_Renderer SHALL define 5 Variants (numbers 0 to 4) for each Ghost_Type. Any two Variants of the same Ghost_Type SHALL differ in at least one of size, tilt, eyes and accessory, so two ghosts of one floor never look the same.
10. FOR ALL ViewModels, THE Scene_Layout SHALL give a Variant that depends only on the Card's floor and position, and not on its `path`, `score`, `reason`, `state` or `canStart`. This is checked by the property-based test of Requirement 23.5.
11. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL draw the close-up ghost with the Variant of the Ghost_Slot of that ghost: the Variant of the first Card of `house.floors` whose `floor` is `ghost.floor` and whose `path` is `ghost.path`.
12. THE Bestiary SHALL draw every Ghost_Type with Variant 0.

#### Edge cases

- The sirv sample has 4 attic ghosts: they get Wisp Variants 0, 1, 2 and 3.
- A live report with 5 ghosts on one floor gets Variants 0 to 4 of that floor's Ghost_Type.
- A floor with no Cards draws no ghost. The positions on the other floors do not change.
- A report with 1 attic ghost and 1 basement ghost: both get Variant 0, the first a Wisp and the second a Chained_Brute.
- A Card changes from Haunted to Exorcised, or is Locked: its Variant stays the same, because the Variant does not depend on `state`.
- The same path appears in the sample and, at another position, in a live report: it may get another Variant, because the Variant is not tied to the path.
- The Lantern_Wraith and the Chained_Brute appear in a Ghost_Scene only when their ghost has Ghost_Content. With the committed Demo_Script only Wisps can be exorcised; the Bestiary and the Gallery show the other two (Requirements 7 and 24).
- Under Reduced_Motion there is no idle animation (Requirement 18).

### Requirement 6: Ghost states

**User Story:** As a judge, I want to see at once which ghosts are haunting, which are locked and which are gone, so that I know what I can still do.

#### Acceptance Criteria

1. WHILE a Card is Haunted, THE Scenic_Renderer SHALL draw its ghost in its Ghost_Slot with a cold blue glow whose colour is the named cold-blue Scenic_Tokens custom property.
2. WHILE Reduced_Motion is off and a Card is Haunted, THE Scenic_Renderer SHALL play its ghost's idle animation.
3. WHILE a Card is Locked, THE Scenic_Renderer SHALL draw its ghost in its Ghost_Slot with its own Ghost_Type and Variant, dimmed, inside a Cloche: a glass bell jar with a padlock, drawn the same way for every Locked Card.
4. WHILE `scene.kind` is `"floor"` and a Card of the focused floor is Locked, THE Nameplate of that Card SHALL always show `card.lockedLine` (which equals `POWER_TEXTS.lockedGhost`) as visible text, with no hover or focus needed.
5. WHILE a Card is Locked, THE Scenic_Renderer SHALL give its Nameplate an accessible name that contains `card.lockedLine`.
6. WHILE a Card is Locked, THE Scenic_Renderer SHALL give its Nameplate no focusable element and no Tab stop of its own.
7. WHILE a Card is Exorcised, THE Scenic_Renderer SHALL draw no ghost in its Ghost_Slot.
8. WHILE a Card is Exorcised, THE Scenic_Renderer SHALL draw a lit candle and a warm orange light in its Ghost_Slot, with the light colour being the named warm-orange Scenic_Tokens custom property.
9. THE Scenic_Renderer SHALL give every Nameplate it draws a `data-ghost-state` attribute whose value equals the Card's `state` (`haunted`, `locked` or `exorcised`) in every render, and that does not depend on CSS, Variant or Reduced_Motion.
10. WHEN a Card's `state` changes between two renders, THE Scenic_Renderer SHALL update the drawing of its Ghost_Slot and, if shown, its Nameplate's `data-ghost-state` in the same render (the Exorcised_Moment and the Return_Glow are in Requirement 12).

#### Edge cases

- A live report: every Card is Haunted (`buildLiveHouse`), so no Cloche and no candle appear.
- A touch screen: the locked line needs no hover, because it is always shown on the Nameplate (criterion 4).
- Under Reduced_Motion a Haunted ghost has no idle animation but keeps its cold glow (criteria 1 and 2).
- When the Demo_Script is invalid (`script: null`), every sample Card is Locked, so every Ghost_Slot shows a Cloche and every Nameplate carries `data-ghost-state="locked"`. This is not the Finale (Requirement 13.1 needs at least one Exorcised Card).
- In the House_Scene there are no Nameplates (Requirement 3.10): the states show only in the drawing and, for the sample, in the Haunt_Meter and Ghost_Icons. Each state is in HTML on the Nameplates of its Floor_Scene.
- A Locked ghost is never confused with the Lantern_Wraith, because the Cloche is a bell jar, not a lantern.

### Requirement 7: Bestiary

**User Story:** As a judge, I want a small guide to the three kinds of ghost, so that I know what the basement ghost looks like even when the sample basement is empty.

#### Acceptance Criteria

1. THE Bestiary SHALL show exactly three entries, one per Ghost_Type, in the order Wisp, Lantern_Wraith, Chained_Brute, in every render of the Scenic_Renderer (Requirement 4.12).
2. THE Bestiary SHALL show in each entry the Ghost_Type name, the floor title of its floor from `TEXTS.floorTitles` (Wisp: attic, Lantern_Wraith: middle floor, Chained_Brute: basement) and its difficulty range: Attic 0 to 33, Middle floor 34 to 66, Basement 67 to 100. The ranges are literal new texts in `texts.ts` (D2).
3. THE Bestiary difficulty ranges SHALL match the boundaries of `floorOf` in Core, checked by a test: for each range, `floorOf` of its lowest and its highest number returns the floor of that entry.
4. THE Bestiary SHALL draw each Ghost_Type in the Haunted look with Variant 0 (Requirement 5.12) and never in the Locked or Exorcised look. This holds for any shown report, any Card states and any Scene, including the case where every Card is Locked (`script: null`) or every Card is Exorcised.
5. THE Bestiary SHALL show its names, floor titles and ranges as real HTML text (not text inside an SVG and not an image), taken from `texts.ts` (new Bestiary texts are additions only, Requirement 2.2).
6. THE Bestiary drawings SHALL be hidden from assistive technology (`aria-hidden="true"`), and its texts SHALL NOT be hidden.

#### Edge cases

- The sample basement is empty: the Chained_Brute entry is still shown, in the Haunted look.
- A live report with no ghost on one or two floors: all three entries are still shown.
- On a narrow screen the Bestiary may be folded behind a real HTML button (D2). If it is folded, that button is reachable with Tab and opens it with Enter or Space, and every entry text is reachable with the keyboard after it opens. At 360 px the folded or open Bestiary causes no horizontal scroll (Requirement 19.4).
- Under Reduced_Motion the Bestiary drawings do not move but keep the Haunted look (same rule as Requirement 6).

### Requirement 8: Floor scene and Camera

**User Story:** As a judge, I want to walk into one floor and read each ghost's nameplate, so that I can pick a ghost to exorcise.

#### Acceptance Criteria

1. WHEN a render has `transition.to.kind` `"floor"` (from the House_Scene, another Floor_Scene or the Ghost_Scene), THE Camera SHALL move, in one animation lasting between 0.6 s and 0.8 s, to a framing in which the whole floor `transition.to.floor` is inside the scene area.
2. WHILE `scene.kind` is `"floor"`, THE Scenic_Renderer SHALL keep the two floors other than `scene.floor` drawn, dimmed to about 35% brightness of the focused floor (D3).
3. WHILE `scene.kind` is `"floor"`, THE Scenic_Renderer SHALL show one Nameplate per Card of the focused floor (`scene.floor`), in report order, as real HTML. Each Nameplate SHALL contain `card.path` unchanged, the reason sentence `card.reason`, the difficulty as `TEXTS.scoreLine(card.score)` ("Difficulty: N of 100") and the state label `TEXTS.ghostStateLabels[card.state]`.
4. WHILE `scene.kind` is `"floor"` and a Card of the focused floor has `canStart` true, THE Nameplate of that Card SHALL hold exactly one real HTML button labelled `TEXTS.actionLabels["start-ghost"]`. Activating it by click or keyboard SHALL dispatch `{ type: "start-ghost", path: card.path }`.
5. WHILE a Card has `canStart` false, THE Nameplate of that Card SHALL hold no start button. THE Scenic_Renderer SHALL show no Nameplate and no start control for any Card of a dimmed floor.
6. WHILE `scene.kind` is `"house"` or `"floor"` and a floor's `emptyLine` is not `null`, THE Scenic_Renderer SHALL draw a chained door on that floor. WHILE `scene.kind` is `"floor"` and the focused floor's `emptyLine` is not `null`, THE Scenic_Renderer SHALL show `emptyLine` (which equals `TEXTS.emptyFloor`, or `TEXTS.emptySampleFloor(floor)` for the sample) unchanged as real HTML text.
7. WHILE `go-to-house` is in Available_Actions, THE Scenic_Renderer SHALL show exactly one real HTML button labelled `TEXTS.actionLabels["go-to-house"]` ("Back to the house") that dispatches `go-to-house`. WHILE `go-to-house` is not in Available_Actions, THE Scenic_Renderer SHALL show no such button.
8. WHEN a render has `transition.to.kind` `"house"` (from a Floor_Scene or the Ghost_Scene), THE Camera SHALL move, in one animation lasting between 0.6 s and 0.8 s, back to a framing in which the whole Cutaway_House is inside the scene area.
9. WHILE `scene.kind` is `"floor"`, THE Floor_Scene SHALL carry a `data-floor` attribute whose value equals `scene.floor` (`attic`, `middle floor` or `basement`) and stays the same across renders of that Scene.
10. WHEN a render has `transition` `null`, THE Camera SHALL keep its current framing and start no Camera animation.
11. WHEN a render with a new `transition` arrives while a Camera animation is still running, THE Camera SHALL drop that animation and end on the framing of the newest render's `scene`.
12. WHILE `scene.kind` is `"floor"`, THE Scenic_Renderer SHALL show the Floor_Scene heading as real HTML text equal to the focused floor's `title`.
13. WHILE `scene.kind` is `"floor"`, THE floor buttons of the two dimmed floors SHALL stay shown and reachable with the keyboard (Requirement 3.6).

#### Edge cases

- A new report (live result, fallback, "Show the sample again") always sets the Scene to `house` (`page.ts`). If the judge was on a floor, the Camera goes back to the whole house (criterion 8).
- The judge clicks two floors quickly: the Camera ends on the floor of the last render (criterion 11).
- The judge is on a floor while a live analysis ends: the Logic_Layer sets the Scene to `house` (known Low in `PLAN.md`, "go-to-floor sigue disponible durante un análisis en vivo"), and the Camera follows the model.
- In a Floor_Scene, `go-to-floor` for the focused floor is not in Available_Actions, so that floor has no floor button.
- The first render has `transition` `null` and `scene.kind` `"house"`: the Camera starts on the whole Cutaway_House with no animation.
- A floor of a live report can have no Cards. The chained door and `TEXTS.emptyFloor` show the same way as for the sample.
- Leaving a ghost (`leave-ghost`, `back-to-list` or a self-check answer) goes to the Floor_Scene of that ghost, so the Camera moves from the close-up room to that floor (criterion 1).
- A ghost on a dimmed floor cannot be started from the current Floor_Scene; the judge first uses that floor's button.
- Under Reduced_Motion every Camera move is an instant cut (Requirement 18).

### Requirement 9: Telephone

**User Story:** As a judge, I want an old telephone that rings when a ghost is waiting, so that I know what to do next without reading instructions, and I want it to stop bothering me once I know.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL draw the Telephone on the telephone table of the Entrance_Hall as an original antique desk telephone, with no logo, no film character and no sound, WHILE `scene.kind` is `"house"` or `"floor"`. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL NOT draw the Telephone.
2. WHEN the Scenic_Renderer draws the House_Scene for the first time in a page load, and `house.source` is `"sample"` and the Telephone_Target exists, THE Telephone SHALL play the Opening_Rings: three Rings in a row, about 6 s in total.
3. WHILE `house.source` is `"sample"`, the Telephone_Target exists, the Opening_Rings have ended and no `{ type: "start-ghost" }` has been dispatched in this page load, whatever control started it (the Answer_Button or a start button), THE Telephone SHALL play one Ring every 20 s, counted from the end of the previous Ring.
4. WHEN a `{ type: "start-ghost" }` has been dispatched at least once in this page load, whatever control started it, an Exorcised_Moment has played since the last Ring, and a Telephone_Target exists, THE Telephone SHALL play exactly one Ring, in the first House_Scene or Floor_Scene render after the Ghost_Scene in which that Exorcised_Moment played, after the Return_Glow (Requirement 12.6) has ended. Apart from this criterion and criterion 5, THE Telephone SHALL NOT ring after the first `start-ghost` of the page load.
5. WHEN the Scenic_Renderer receives a ViewModel with `house.source` `"live"` and `status.kind` `"done"`, and the ViewModel it received just before had `status.kind` `"busy"`, THE Telephone SHALL start the Live_Call and keep Ringing without a pause until one of these happens: the judge activates the Answer_Button; a later ViewModel shows a different report (a different `house.source` or a different list of Card paths); a later ViewModel has `status.kind` `"error"` or `"busy"`. A change of Scene between the House_Scene and a Floor_Scene SHALL neither stop nor restart the Live_Call.
6. WHILE no Ring and no Live_Call plays, THE Telephone SHALL be still: no shake, no vibration lines, no orange glow and no "RING!" bubble.
7. WHILE `scene.kind` is `"house"` or `"floor"`, THE Scenic_Renderer SHALL show the Answer_Button over the Telephone: a real HTML button with the visible label "Answer the phone" (a new text in `texts.ts`), the same whether the Telephone is Ringing or still. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL NOT show the Answer_Button and SHALL NOT include it in the tab order.
8. WHEN the judge activates the Answer_Button while `house.source` is `"live"`, THE Scenic_Renderer SHALL show `house.powerLine` (which equals `POWER_TEXTS.liveReport`) in the Phone_Bubble as the caller's words and SHALL dispatch no UserAction. This criterion applies on every activation while a live report is shown, including after the Live_Call was answered.
9. WHEN the judge activates the Answer_Button while `house.source` is `"sample"` and the Telephone_Target exists, THE Scenic_Renderer SHALL dispatch exactly one `{ type: "start-ghost", path }`, with the path of the Telephone_Target, whether or not the Telephone is Ringing at that moment.
10. WHEN the judge activates the Answer_Button while `house` is `null`, or while `house.source` is `"sample"` and no Telephone_Target exists, THE Scenic_Renderer SHALL show "The line is quiet." (a new text in `texts.ts`) in the Phone_Bubble and SHALL dispatch no UserAction.
11. WHEN the Phone_Bubble shows a text, THE Scenic_Renderer SHALL announce that text through the Scenic_Announcer, not through the Status_Region. THE Phone_Bubble SHALL stay until the next Scene change or the next activation of the Answer_Button.
12. WHEN the judge activates the Answer_Button, THE Telephone SHALL stop any Ring or Live_Call that is playing.
13. WHILE Reduced_Motion is on and the Telephone is Ringing, THE Telephone SHALL show the "RING!" bubble and the orange glow, both without movement, pulsing or fading, and SHALL show no shake and no vibration lines.
14. WHILE a call is waiting (`house.source` is `"sample"` and the Telephone_Target exists, or the Live_Call plays), THE accessible name of the Answer_Button SHALL start with "Answer the phone" and SHALL also say that a call is waiting (a new text in `texts.ts`). WHILE no call is waiting, the accessible name SHALL be "Answer the phone" with nothing added. The accessible name SHALL update in the same render in which the waiting call starts or ends.

#### Edge cases

- At load the sample has 2 Cards with `canStart`, so the Opening_Rings play, then one Ring every 20 s until the first ghost is started, by the Answer_Button or by a start button.
- The judge answers at once: the Ring stops, the first Telephone_Target (`bench/static.js` in the sirv report order, if it is first) opens, and from then on the Telephone rings only once per Ghost_Scene visit with an Exorcised_Moment, after the Return_Glow.
- While a live analysis runs (`status.kind` `"busy"`), every `canStart` is false (`startAllowed` is false while busy), so there is no Telephone_Target: no Ring, and answering shows "The line is quiet."
- After both Scripted_Ghosts are exorcised, no Card has `canStart`: no Ring follows the second Exorcised_Moment, and answering shows "The line is quiet."
- A Scripted_Ghost ended in `failed` and the judge went back to the floor: its Card has `canStart` true again (step `failed` accepts `pick-ghost`), so a Telephone_Target exists. The 20 s Rings are already over, because a ghost was started; no Ring plays, because no Exorcised_Moment happened.
- The judge walks between floors during the Live_Call: it keeps ringing (criterion 5).
- A live analysis ends with a show-message error (`status.kind` `"error"`) or the fallback (`status.kind` `"fallback"`): no Live_Call starts. After the fallback the sample rules apply, with the answers already given in this page load.
- The judge starts a new live analysis during a Live_Call: the `"busy"` ViewModel stops it (criterion 5).
- The judge exorcises a ghost, then walks back to the House_Scene or a Floor_Scene: the Return_Glow plays first, then one Ring, only if a Telephone_Target exists at that render. If none exists (for example after the second Scripted_Ghost), no Ring plays.
- The Exorcised_Moment plays but the judge never leaves the Ghost_Scene: no Ring plays, because the Telephone is not drawn there.
- The sample cannot be loaded (`house` is `null`, Available_Actions is empty): the Telephone is still, and answering shows "The line is quiet." and dispatches nothing.
- The judge activates the Answer_Button with the keyboard (Enter or Space): the result is the same as a pointer activation (criteria 8 to 10).
- The first House_Scene render has no Telephone_Target (for example an invalid Demo_Script): no Opening_Rings.

### Requirement 10: Exorcism scene and Grimoire

**User Story:** As a judge, I want the exorcism to look like a close encounter with the ghost, so that answering questions feels like a game while all the text stays readable.

#### Acceptance Criteria

1. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL draw a close-up room with one large ghost on one side and the Grimoire on the other side. The ghost's Ghost_Type comes from `ghost.floor`: Wisp for the attic, Lantern_Wraith for the middle floor, Chained_Brute for the basement, and its Variant follows Requirement 5.11.
2. WHILE `scene.kind` is `"ghost"`, THE Grimoire SHALL show the following as real HTML text (not SVG text): the heading `TEXTS.ghostHeading(ghost.path)`; `ghost.judgeLine`; `ghost.reading.text` under the title `TEXTS.readingTitles[ghost.reading.kind]`; `ghost.question` under the title `TEXTS.questionTitle(ghost.questionNumber)`; `ghost.revealedAnswer` under the title `TEXTS.revealedTitle`; and `ghost.prompt`. A field that is `null` is shown with no title.
3. WHILE `ghost.showAnswerBox` is true, THE Grimoire SHALL show the Answer_Box with an HTML label `TEXTS.answerLabel` linked to it. WHILE `ghost.showAnswerBox` is false, THE Grimoire SHALL show no Answer_Box.
4. WHILE `scene.kind` is `"ghost"`, THE Grimoire SHALL show one real HTML button, drawn as a game-style choice, for each ghost action in Available_Actions (`explanation-continue`, `show-model-answer`, `dont-know`, `retry`, `back-to-list`, `leave-ghost`, `rate`, `self-check`), in the order of Available_Actions. Each button is labelled `TEXTS.actionLabels[type]`, or `TEXTS.actionLabels.rate[rating]` for `rate`, or `TEXTS.actionLabels["self-check"][answer]` for `self-check`. THE Grimoire SHALL show no button for a ghost action that is not in Available_Actions.
5. WHEN the judge activates a ghost-action button, THE Scenic_Renderer SHALL dispatch exactly the UserAction of that Available_Actions entry, once.
6. WHILE `ghost.code` is not `null`, THE Grimoire SHALL show the Code_Block with the full `ghost.code` text, unchanged and not cut short, with `tabindex="0"`, a maximum height taken from the Scenic_Tokens, and its own vertical scroll when the text is taller than that height. WHILE `ghost.code` is `null`, THE Grimoire SHALL show no Code_Block.
7. WHILE `ghost.licenceNextToCode` is true and `licence` is not `null`, THE Grimoire SHALL show the Licence_Notice inside the Grimoire, directly after the Code_Block (web-demo Requirement 10.2).
8. WHILE `scene.kind` is `"ghost"`, THE Ghost_Scene SHALL draw exactly three Question_Candles.
9. WHILE `scene.kind` is `"ghost"`, THE Ghost_Scene SHALL draw this number of lit Question_Candles, with all the other candles unlit: 0 when `ghost.step` is `explaining`; `ghost.questionNumber - 1` when it is `asking` or `simplifying`; `ghost.questionNumber` when it is `model-answer`; 3 when it is `self-check`; 0 when it is `failed`.
10. WHEN two renders in a row both have `ghost.showAnswerBox` true with the same `ghost.path` and `ghost.questionNumber`, THE Scenic_Renderer SHALL keep the same Answer_Box element, so the typed text stays. WHEN a render has `ghost.showAnswerBox` true and the previous render had a different ghost path, a different question number, or no Answer_Box, THE Scenic_Renderer SHALL show a new, empty Answer_Box. This is the same rule as the Simple_Renderer.
11. THE Scenic_Renderer SHALL never read the `value` of the Answer_Box and SHALL never add an `input` or `change` listener to it (web-demo Requirement 6.23).
12. THE Grimoire SHALL keep the document order of the Simple_Renderer: heading, judge line, reading, question, Answer_Box, revealed answer, prompt, ghost-action buttons, Code_Block, Licence_Notice. On wide screens the Code_Block MAY be placed beside the text visually; the document order SHALL stay the same.
13. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL draw no Ghost_Slot, no Nameplate, no floor button and no start control; only the close-up ghost and the room are drawn, and the house behind the room SHALL be inert (not reachable with the keyboard or the pointer).

#### Edge cases

- In `self-check` and `failed`, `ghost.code` is `null`, so there is no Code_Block and no Licence_Notice next to it. The Licence_Notice in the HUD stays.
- A very long Ghost_Text scrolls inside the Code_Block. The Code_Block never grows taller than its maximum height, and the full text can be reached by scrolling.
- An empty Ghost_Text gives an empty Code_Block, and the reading still shows.
- After a second "I don't know" the step is `model-answer`. The current question counts as finished, so its candle is lit.
- A retry starts again with 0 lit candles and, on question 1, a new empty Answer_Box.
- After `simplifying`, going back to `asking` for the same question shows a new empty Answer_Box, because `simplifying` has no Answer_Box. The Simple_Renderer behaves the same way.
- `ghost.revealedAnswer` appears in `asking` after "show model answer", and the Answer_Box stays visible next to it.
- On a narrow screen the Grimoire is placed under the drawing (Requirement 19.3); the document order does not change.

### Requirement 11: Ghost reactions

**User Story:** As a judge, I want the ghost to react to my answers, so that the exorcism feels alive.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL start a Reaction only in the Ghost_Scene and only for a UserAction that the Scenic_Renderer itself dispatched while that action was in Available_Actions.
2. WHEN the Scenic_Renderer dispatches `{ type: "rate", rating: "right" }` ("Got it"), THE ghost SHALL recoil and SHALL end the Reaction with a lower opacity than before the action, never below 40 %.
3. WHEN the Scenic_Renderer dispatches `{ type: "rate", rating: "half-right" }` ("Partly"), THE ghost SHALL shudder and SHALL end the Reaction with the same size and opacity as before the action.
4. WHEN the Scenic_Renderer dispatches `{ type: "rate", rating: "wrong" }` ("Missed it"), THE ghost SHALL laugh and SHALL end the Reaction at a larger size than before the action, never above 130 % of its starting size.
5. WHEN the Scenic_Renderer dispatches `{ type: "dont-know" }` ("I don't know"), THE ghost SHALL tilt its head and a smoke "?" SHALL appear and be gone by the end of the Reaction, with the ghost's size and opacity unchanged.
6. WHEN a render has `ghost.step` `"failed"` and the previous render did not, THE Question_Candles SHALL show 0 lit candles (Requirement 10.9) and THE ghost SHALL return to 100 % of its starting size and 100 % opacity.
7. WHEN the Scenic_Renderer dispatches `start-ghost` or `retry`, THE Scenic_Renderer SHALL set the ghost to 100 % of its starting size and 100 % opacity before any later Reaction.
8. WHEN a Reaction ends, THE Ghost_Scene SHALL show the drawing that the latest ViewModel describes (step and Question_Candles), with the size and opacity set by criteria 2 to 7.
9. THE Scenic_Renderer SHALL keep every Reaction as visual state of the Scenic_Renderer only, like the Answer_Box: a Reaction SHALL NOT dispatch a UserAction, change the ViewModel, move focus, or delay or change the texts and controls of the Grimoire. THE Grimoire SHALL show the latest ViewModel in the same render and stay usable while the Reaction plays; only the ghost drawing animates.
10. THE Scenic_Renderer SHALL end each Reaction within 1,000 ms of the dispatch that started it.
11. IF the Scenic_Renderer dispatches a new UserAction while a Reaction plays, THEN THE Scenic_Renderer SHALL jump the playing Reaction to its end state and start the Reaction of the new action, if it has one.

#### Edge cases

- The label "Partly" is used both by `rate` `half-right` and by `self-check` `half` (`TEXTS.actionLabels`). Only the `rate` action starts the shudder Reaction.
- No UserAction other than those in criteria 2 to 5 starts a Reaction. `start-ghost` and `retry` only reset the ghost (criterion 7).
- An action that is not in Available_Actions starts no Reaction, even if a stale control sends it.
- Repeated "Missed it" or "Got it" answers in one attempt stop at the 130 % size limit and the 40 % opacity limit.
- The third rating moves the step to `self-check` or `failed` in the same render. The Grimoire shows the new step at once (criterion 9). The ghost plays the Reaction and then shows the end state of the new step (criterion 8). For `self-check` the Exorcised_Moment also starts (Requirement 12; their order is D6).
- Under Reduced_Motion, each Reaction is replaced by an opacity fade of 200 ms or less, and the smoke "?" fades in and out. The "Missed it" size change happens as an instant jump, with no animation. The end size and opacity are the same as with Reduced_Motion off (Requirement 18).
- A reload or switching the view loses the Reaction state and the ghost's size and opacity, because they are visual only.

### Requirement 12: Exorcised moment and return glow

**User Story:** As a judge, I want a clear reward when I exorcise a ghost, so that I feel the code is now mine.

#### Acceptance Criteria

1. WHEN two consecutive renders have the same `house.source`, and a Card with the same `path` has state `"haunted"` in the first render and `"exorcised"` in the second, THE Scenic_Renderer SHALL start the Exorcised_Moment for that Card in the second render. With the Logic_Layer of today this is the render where the step becomes `self-check`, in the Ghost_Scene.
2. IF the previous render has a different `house.source`, or has no Card with that `path`, or that Card's state in the previous render is not `"haunted"`, THEN THE Scenic_Renderer SHALL show the Card as Exorcised without playing the Exorcised_Moment or the Return_Glow.
3. THE Exorcised_Moment SHALL show the close-up ghost of the Ghost_Scene moving upward in a spiral and then splitting into orange spark shapes, after which that ghost drawing is no longer shown.
4. THE Exorcised_Moment SHALL change the light of the Ghost_Scene room from the named cold-blue Scenic_Tokens colour to the named warm-orange Scenic_Tokens colour in 1.0 s to 1.4 s, measured from the render that starts it, and the warm orange light SHALL stay until the judge leaves the Ghost_Scene.
5. (Withdrawn on 18 Nov: the Ghost_Slots have no window, because windows drawn over the walls of the scene illustration clashed with it. The Exorcised state of a Card shows in the drawing of the Ghost_Slot itself, Requirement 6.8.)
6. WHEN the Scenic_Renderer draws the first House_Scene or Floor_Scene after a Ghost_Scene in which one or more Exorcised_Moments played, THE Scenic_Renderer SHALL play the Return_Glow: the Exorcised drawing of the Ghost_Slot of each of those Cards fades in, and the Haunt_Meter moves from the share of the last House_Scene or Floor_Scene render before that Ghost_Scene to the new `house.progress.share`, in about 0.8 s (D5), ending at exactly the new share.
7. IF `house.progress` was `null` in the last House_Scene or Floor_Scene render before the current one, THEN THE Haunt_Meter SHALL show the new `house.progress.share` without moving from any earlier value.
8. THE Scenic_Renderer SHALL start the Exorcised_Moment and the Return_Glow at most once per Haunted-to-Exorcised change of a Card: later renders in which that Card stays Exorcised, and later Scene changes or Transitions, SHALL NOT start them again.
9. WHEN a new render arrives while the Exorcised_Moment plays and the Scene stays the same, THE Exorcised_Moment SHALL keep playing. WHEN the Scene changes while the Exorcised_Moment plays, THE Scenic_Renderer SHALL jump it to its end state (D5).

#### Edge cases

- The change happens in the render where the step becomes `self-check`, while the Ghost_Scene is open (`engine.ts`, `nextQuestion`), so the sparks play in the room and the Exorcised drawing of the slot and the Haunt_Meter wait for the judge to come back.
- The judge answers "Not yet" in the self-check: the ghost stays Exorcised (the engine only records the self-check answer). No second Exorcised_Moment plays, and the Return_Glow still plays when the judge reaches the Floor_Scene.
- The judge answers the self-check within 1.2 s: the Scene changes to the Floor_Scene, the Exorcised_Moment jumps to its end state (criterion 9) and the Return_Glow plays.
- "Show the sample again" after a live report: the sample Cards come back already Exorcised. This is not a change from Haunted (the previous render had `house.source` `live`), so neither animation plays. Their slots show the Exorcised drawing at once, and the Haunt_Meter shows the share without moving (criteria 2 and 7).
- A live report: `house.progress` is `null` and no live Card can become Exorcised, so neither animation plays.
- Locked Cards never change to Exorcised, so they never play either animation.
- Under Reduced_Motion both animations become opacity fades of 200 ms or less with the same end state (Requirement 18.6).

### Requirement 13: Demo complete finale

**User Story:** As a judge, I want an ending when I have done everything the demo allows, so that I know the demo is complete and what to do next.

#### Acceptance Criteria

1. WHILE `house` is not `null`, `house.source` is `"sample"`, every Card of `house.floors` is Locked or Exorcised, at least one Card is Exorcised, and `scene.kind` is `"house"` or `"floor"`, THE Scenic_Renderer SHALL show the Finale.
2. WHILE the condition of criterion 1 is false, THE Scenic_Renderer SHALL NOT show the Finale or its banner, and SHALL draw the sky, rain and horizon as in Requirement 3.3.
3. WHILE the Finale is shown, THE Scenic_Renderer SHALL draw no rain and SHALL paint the horizon with a dawn orange colour defined in Scenic_Tokens. The clouds are part of the scene illustration and stay still.
4. WHILE the Finale is shown and `house.houseClean` is `null`, THE Finale SHALL show a banner as real HTML text (not text inside the SVG) with two lines: one saying that the demo is complete (a new text in `texts.ts`), and one saying that the other ghosts wait for the user's own Kiro (a new text in `powerTexts.ts`, because it names the Power).
5. WHILE the Finale is shown and `house.houseClean` is not `null`, THE Finale banner SHALL show `house.houseClean` (which equals `TEXTS.houseClean`) in place of the two lines of criterion 4.
6. THE Scenic_Renderer SHALL decide whether the Finale is shown from the current ViewModel only (the Finale flag of Scene_Layout): two equal ViewModels SHALL give the same decision, whatever was rendered before, and no new ViewModel field SHALL be added (property test in Requirement 23.7).
7. WHEN the condition of criterion 1 turns from false to true between two consecutive renders with the same `house.source`, THE Scenic_Renderer SHALL animate the change of criterion 3. In every other case where the Finale is shown (for example after "Show the sample again"), THE Scenic_Renderer SHALL show it in its end state with no animation.
8. WHEN the Finale banner appears, THE Scenic_Renderer SHALL announce its text through the Scenic_Announcer.

#### Edge cases

- The committed sample: after both Scripted_Ghosts are exorcised and the judge leaves the room, 2 Cards are Exorcised and 3 are Locked, so the Finale shows, animated (criterion 7); `house-clean` is never reached.
- The last Scripted_Ghost enters `self-check`: the Scene is still `ghost`, so no Finale until the judge comes back to the floor.
- A live report: every Card is Haunted, so no Finale.
- The Finale is shown and the judge runs a live analysis: when the live report arrives, `house.source` is `"live"`, so the Finale goes away and the rain comes back (criterion 2).
- After that, "Show the sample again": the sample Cards come back already Exorcised, so the Finale shows again in its end state, with no animation (criterion 7), and the banner is announced again.
- An invalid Demo_Script makes every sample Card Locked at load: no Card is Exorcised, so no Finale.
- `house` is `null` (no report shown yet): no Finale.
- `house-clean` is reached only in tests with a generated Demo_Script for every ghost. `house.houseClean` is not `null` only when no Card is Haunted, so criterion 5 never shows a banner without the Finale scene of criterion 3.
- Reduced_Motion: the Finale appears as a fade, with the same end state (Requirement 18).
- Whether Lightning flashes during the Finale is D8.

### Requirement 14: Live analysis in the scene

**User Story:** As a judge, I want to see that the page is searching my repository, so that I wait without thinking the page froze.

#### Acceptance Criteria

1. WHILE `live.busy` is true, THE Scenic_Renderer SHALL show the Search_Beam in the House_Scene or Floor_Scene that `scene` describes, sweeping the house in a loop (D4).
2. WHILE `live.busy` is false, THE Scenic_Renderer SHALL show no Search_Beam.
3. WHILE `live.busy` is true, THE Scenic_Renderer SHALL show one enabled floor button for each `go-to-floor` entry and one enabled "Back to the house" button for each `go-to-house` entry in Available_Actions. These are the same buttons it shows when `live.busy` is false.
4. WHILE `live.busy` is true, THE Scenic_Renderer SHALL show `status.text` (`TEXTS.busy`) in the Status_Region, character for character.
5. WHILE `status.kind` is `"error"` or `"fallback"`, THE Scenic_Renderer SHALL show `status.text` in the Status_Region, character for character, with every colour, size and font taken from Scenic_Tokens.
6. WHILE Reduced_Motion is on and `live.busy` is true, THE Scenic_Renderer SHALL show the Search_Beam with no CSS animation and no CSS transition, so it stays in one fixed position.

#### Edge cases

- The judge double-clicks the Live_Plaque submit button. `submit-live` is not in Available_Actions while busy, so the button is disabled (Requirement 4.8) and only one analysis runs.
- The judge goes to a floor or back to the house while busy. The Search_Beam stays visible in the new Scene, and the Status_Region keeps `TEXTS.busy`.
- The fallback shows the sample again with `TEXTS.fallback`. The Scene becomes `house` and the Search_Beam is gone, because `live.busy` is false.
- A show-message error (for example `REPO_NOT_FOUND`) keeps the Scene, the shown report and the typed URL. The Search_Beam is gone.
- The analysis ends with `status.kind` `"done"`. The Search_Beam is gone, the Live_Call starts (Requirement 9.5) and the Power line shows in the HUD (Requirement 4.14).
- The Ghost_Scene cannot be open while busy. `live.formVisible` is false there, so no analysis can start from it, and `canStart` is false for every Card while busy, so no ghost can be opened.

### Requirement 15: Lightning

**User Story:** As a judge, I want lightning that makes the house feel alive, and a way to turn it off, so that it adds mood without bothering me.

#### Acceptance Criteria

1. WHILE the Lightning_Toggle is on, Reduced_Motion is off, `scene.kind` is `"house"` or `"floor"` and the Intro is not playing and the Finale is not shown, THE Scenic_Renderer SHALL show a Lightning flash over the Cutaway_House, with each new flash starting 10 s to 15 s (inclusive) after the previous one was due. A new render of the ViewModel SHALL NOT restart this interval (D7).
2. WHEN a flash falls due while the Ghost_Scene, the Intro or the Finale is shown, or while a Ring or an Exorcised_Moment plays, THE Scenic_Renderer SHALL skip that flash and keep counting the interval.
3. WHEN the Lightning_Toggle turns on, or the Web_Page loads with the Lightning_Toggle on, THE Scenic_Renderer SHALL make the first Lightning flash due 10 s to 15 s (inclusive) later.
4. THE Lightning SHALL flash at most 3 times in any period of 1 s (WCAG 2.3.1). Each light-to-dark change counts as one flash.
5. THE HUD SHALL show the Lightning_Toggle as a real HTML `button` element. Its visible text SHALL be exactly "Lightning: on" when the Lightning_Toggle is on and exactly "Lightning: off" when it is off (new texts in `texts.ts`). Its `aria-pressed` SHALL be `"true"` when it is on and `"false"` when it is off.
6. WHEN the judge activates the enabled Lightning_Toggle by pointer, Enter or Space, THE Scenic_Renderer SHALL flip it from on to off or from off to on, update its text and `aria-pressed` in the same frame, keep focus on the Lightning_Toggle, and dispatch no UserAction.
7. WHEN the Lightning_Toggle turns off, THE Scenic_Renderer SHALL start no new Lightning flash, and any flash already showing SHALL end within 1 s.
8. THE Scenic_Renderer SHALL keep the Lightning_Toggle state only in memory: no storage, cookie or page address change. WHEN the Web_Page loads with Reduced_Motion off, THE Lightning_Toggle SHALL be on.
9. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL show no Lightning flash, and THE Lightning_Toggle SHALL be shown set to off ("Lightning: off", `aria-pressed="false"`), disabled, with the visible short reason "Off because your system asks for less motion" (a new text in `texts.ts`) linked to it as its description.

#### Edge cases

- A reload turns the Lightning on again (with Reduced_Motion off), because nothing is saved (web-demo Requirement 9).
- The judge acts every few seconds, so renders happen often. Flashes still come every 10 s to 15 s (criterion 1).
- The judge turns the Lightning_Toggle off during a flash. The flash ends within 1 s and no new flash starts (criterion 7).
- Reduced_Motion turns on while the page is open: the Lightning_Toggle is set to off and disabled, and a flash already showing ends within 1 s.
- Reduced_Motion turns off while the page is open: the Lightning_Toggle becomes enabled and stays off; the judge can turn it on.
- The page loads with Reduced_Motion on: the Lightning_Toggle starts off and disabled (criterion 9).
- The Ghost_Scene is open: no flash (criterion 2).
- The Finale is shown: whether Lightning still flashes is D8.

### Requirement 16: Intro (optional priority)

**User Story:** As a judge, I want the house to open like a doll's house when I arrive, so that the first moment feels like the start of a game.

#### Acceptance Criteria

1. WHERE the Intro is built, WHEN the Scenic_Renderer draws the House_Scene for the first time after a page load, THE Scenic_Renderer SHALL open the facade of the house like two doors in a time between 1.3 s and 1.7 s and then show the open Cutaway_House with no part of the facade left over the scene.
2. WHERE the Intro is built, WHEN the House_Scene is shown again later in the same page load (for example after the judge comes back from a Floor_Scene), THE Scenic_Renderer SHALL show the open Cutaway_House at once and SHALL NOT play the Intro again.
3. WHERE the Intro is built, WHEN the judge presses any key, clicks or taps anywhere on the page during the Intro, THE Scenic_Renderer SHALL end the Intro within 100 ms with no closing animation and show the open Cutaway_House. That key, click or tap SHALL have no other effect: it SHALL NOT activate a control, move focus, type text or submit the Live_Plaque.
4. WHERE the Intro is built, WHILE the Intro plays, THE HUD SHALL stay visible and not covered by the facade, and the scene controls under the facade (floor buttons and Answer_Button) SHALL be inert.
5. WHERE the Intro is built, WHEN the Logic_Layer calls `render` during the Intro, THE Scenic_Renderer SHALL apply that ViewModel to the HUD and the Status_Region in that same call, so that the Intro never delays a render of the Logic_Layer (web-demo Requirement 18.4).

#### Edge cases

- The page loads with a broken sample: the Intro still plays once, or the first key, click or tap ends it.
- The first key press is Tab: the Intro ends and focus does not move; the next Tab moves focus normally (criterion 3).
- The judge clicks a HUD button during the Intro: the Intro ends and the button is not activated; a second click activates it.
- The judge clicks the facade itself, not a control: the Intro ends and nothing else happens.
- Reduced_Motion is on at load: the Intro is skipped (Requirement 18.2).
- Reduced_Motion turns on while the Intro plays: the Intro jumps to its end state (Requirement 18.9).
- The Intro plays once per page load only. Nothing is stored, so a reload plays it again (Out of Scope: saving "Intro seen").

### Requirement 17: Accessibility

**User Story:** As a judge who uses a keyboard or a screen reader, I want to do everything the mouse can do, so that the game look never locks me out.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL place every interactive control (button, link, form control) as a real HTML element outside every `svg` element, and SHALL place no link, form control, button or element with a `tabindex` attribute inside any `svg` element.
2. THE Scenic_Renderer SHALL set `aria-hidden="true"` on every `svg` element it inserts in the Web_Page.
3. THE Scenic_Renderer SHALL give each Nameplate an accessible name made of the Card's path, its floor value (`attic`, `middle floor` or `basement`), its difficulty and its state label, in this order and in the form "bench/static.js, attic, difficulty 7 of 100, haunted" (a new text template in `texts.ts`), where N in "difficulty N of 100" is `card.score` (an integer from 0 to 100).
4. WHILE `scene.kind` is `"house"`, THE keyboard tab order SHALL be: the HUD controls except the Licence_Notice link, then the Answer_Button, then the floor buttons, then the Licence_Notice link of the HUD footer.
5. WHILE `scene.kind` is `"floor"`, THE keyboard tab order SHALL be: the HUD controls except the Licence_Notice link, then "Back to the house", then the Answer_Button, then the floor buttons of the dimmed floors, then the start buttons of the focused floor in report order, then the Licence_Notice link of the HUD footer.
6. WHILE `scene.kind` is `"ghost"`, THE keyboard tab order SHALL be: the HUD controls except the Licence_Notice link, then the Grimoire heading (the focus target of criterion 7, not a Tab stop of its own), then the Answer_Box, then the ghost-action buttons, then the Code_Block, then the Licence_Notice link of the Grimoire, then the Licence_Notice link of the HUD footer. In every Scene the tab order follows the visual order, with the HUD footer last.
7. WHEN a render has a Transition that is not `null`, THE Scenic_Renderer SHALL move keyboard focus to the Scene_Heading of the new Scene, except when `transition.from.kind` is `"ghost"`: then focus SHALL go to the start button of that ghost if `{ type: "start-ghost", path }` for its path is in Available_Actions and the button is shown, and otherwise to the Scene_Heading of the new Scene (the Floor_Scene heading when the judge leaves to a floor).
8. WHEN a render has `transition` `null`, THE Scenic_Renderer SHALL follow the rule of `focusAfterRender` (`src/view/simple/focus.ts`), reading "panel heading" as the Grimoire heading and "list heading" as the Scene_Heading: a new Grimoire screen moves focus to the Grimoire heading; on the same screen, focus stays on the same control if it is still offered, otherwise it goes to the Scene_Heading.
9. WHEN a render removes or replaces the element that had keyboard focus, THE Scenic_Renderer SHALL, before that render returns, put focus on an element that is still in the document and is not `body`.
10. IF the Scenic_Renderer uses the same pure focus rule as the Simple_Renderer, THEN that rule SHALL move to one shared file under `src/view/`, and the Simple_Renderer focus behaviour SHALL stay the same, with its existing focus tests passing unchanged in meaning.
11. WHEN an element of the Scenic_Renderer gets keyboard focus, THE Scenic_Renderer SHALL show around it a visible orange focus ring at least 2 px thick, with its colour taken from a Scenic_Tokens custom property and a contrast ratio of at least 3:1 against the colours next to it.
12. THE Scenic_Renderer SHALL draw all text of the HUD, the Answer_Button, the Phone_Bubble, the Nameplates, the Grimoire (including the Code_Block) and the Finale banner with a contrast ratio of at least 4.5:1 (WCAG AA) between the text colour and the solid backing colour directly behind that text. Both colours are Scenic_Tokens values, and the backing stays solid during a Lightning flash and the Finale (Requirement 4.18).
13. THE Scenic_Renderer SHALL give every button and every link that is not inside a sentence a rendered touch target of at least 44 CSS px by 44 CSS px at every viewport width from 360 px up. Links inside a sentence of text, such as the Licence_Notice link, are exempt (WCAG 2.5.8).
14. WHILE `scene.kind` is `"ghost"`, the house behind the room SHALL be inert, and WHILE the Intro plays, the scene controls under the facade SHALL be inert (Requirement 16.4).

#### Edge cases

- Mist `#6F7F92` on Night `#0B111B` is about 4.6:1, so it passes. Mist on Slate `#202D3B` is about 3.4:1 and fails, so Mist cannot be used for text on Slate.
- A Locked Nameplate has no Tab stop (Requirement 6.6); its locked line is always visible text (Requirement 6.4) and is in its accessible name (Requirement 6.5), so a screen reader reaches it while reading the page.
- The scores 0 and 100 read "difficulty 0 of 100" and "difficulty 100 of 100".
- The Telephone_Target is none: the Answer_Button stays in the tab order, in the same place (Requirements 9.7 and 9.10).
- In a Floor_Scene, the focused floor has no floor button (`go-to-floor` for it is not in Available_Actions), so the tab order goes from the dimmed floors' buttons to the start buttons.
- The judge leaves a ghost that ended in `failed`: its start button is shown again on its floor, so focus goes there (criterion 7). After an exorcised ghost, its start button is gone, so focus goes to the Floor_Scene heading.
- A screen reader user never hears the SVG. Every meaning (state, floor, Ringing) is also in HTML text or in an accessible name, in the Scene where it applies (the Card states on the Nameplates of each Floor_Scene).

### Requirement 18: Reduced motion

**User Story:** As a judge who is sensitive to motion, I want a calm version of the scene, so that I can use the demo without discomfort.

#### Acceptance Criteria

1. THIS requirement SHALL take precedence over every other requirement of this spec: WHILE Reduced_Motion is on, wherever another requirement states a motion, an animation or a duration, the rules of this requirement apply instead.
2. WHERE the Intro is built, WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL skip the Intro and show the open Cutaway_House from the first frame.
3. WHILE Reduced_Motion is on, WHEN a render has a Transition, THE Camera SHALL show the new framing with no movement and no zoom (an instant cut).
4. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL run no animation or transition that moves, rotates, scales or shakes an element. This means no shaking, no bobbing, no idle animation, no drifting fog, no falling rain (fog and rain are drawn still, D9), no Search_Beam sweep (Requirement 14.6), and no Telephone shake or vibration lines (Requirement 9.13).
5. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL show no Lightning, and the Lightning_Toggle SHALL follow Requirement 15.9.
6. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL limit every animation and transition to one opacity change that lasts 200 ms or less and does not repeat. An instant change with no animation (for example the "Missed it" size change) is allowed.
7. WHILE Reduced_Motion is on, WHEN a Reaction, the Exorcised_Moment, the Return_Glow or the Finale starts, THE Scenic_Renderer SHALL replace its motion with an opacity fade of 200 ms or less. The fade SHALL end in the same state as with Reduced_Motion off: for the Exorcised_Moment the ghost gone and the warm room, for the Return_Glow the Exorcised drawing of the slot and the new Haunt_Meter share, and for the Finale the stopped rain and dawn horizon.
8. WHILE Reduced_Motion is on, THE Web_Page SHALL show, for the same ViewModel, the same texts, the same controls with the same accessible names, and the same Card states as with Reduced_Motion off.
9. WHEN Reduced_Motion changes while the page is open, THE Scenic_Renderer SHALL apply the new setting within 1 s and without a reload. WHEN Reduced_Motion turns on, every one-shot animation already running (Intro, Camera move, Reaction, Exorcised_Moment, Return_Glow, Finale change) SHALL jump to its end state, and every looping animation (idle animations, fog, rain, Rings, Live_Call, Search_Beam) SHALL stop moving.
10. THE Scenic_Renderer SHALL show the Motion_Button, first in the footer so the Licence_Notice link stays the last Tab stop. WHEN it is pressed with motion on, every animation and transition of the Scenic view SHALL stop at its end state and its text SHALL become "Motion: off"; WHEN it is pressed again, looping animations SHALL start again and its text SHALL become "Motion: on". The choice SHALL NOT be stored, so a reload starts with motion on. WHILE Reduced_Motion is on, the Motion_Button SHALL be hidden.
11. WHILE the viewport is 64rem wide or more, Reduced_Motion is off and motion is on, THE Gate_Panel SHALL play the Gate_Rise once. While the pictures load (at most 2.5 s for the house picture and 2.5 s for the gate pictures) and while the gate rises, the HUD boxes SHALL be hidden with opacity only and SHALL NOT move, so the page height SHALL stay the same before, during and after the Gate_Rise. WHEN motion is turned off during the Gate_Rise, the gate and the texts SHALL be shown in place at once and SHALL NOT rise again. On narrow screens the Gate_Panel SHALL NOT rise and the gargoyle's eyes stay still. On every screen, the stage SHALL stay hidden with opacity only until the house picture has loaded (at most 2.5 s), so no control or ghost is drawn over an empty night.

#### Edge cases

- Under Reduced_Motion a Haunted ghost keeps its cold glow, and a Ringing Telephone keeps its "RING!" bubble and orange glow, both drawn still (Requirements 6 and 9.13).
- Under Reduced_Motion each Reaction becomes a fade of 200 ms or less, and "Missed it" makes the ghost bigger at once (Requirement 11).
- Under Reduced_Motion the Search_Beam is shown still while `live.busy` is true (Requirement 14.6).
- Reduced_Motion turns off while the page is open: looping animations start again within 1 s; the Lightning_Toggle becomes enabled and stays off (Requirement 15).

### Requirement 19: Responsive layout

**User Story:** As a judge on a laptop or a phone, I want the scene to fit my screen, so that I can play on either.

#### Acceptance Criteria

1. WHILE the viewport is 1440 px by 900 px at 100% browser zoom and `scene.kind` is `"house"`, THE Web_Page SHALL show the whole Cutaway_House, the whole HUD and every control of the House_Scene inside the viewport, with no vertical and no horizontal page scroll.
2. WHILE the viewport is 390 px by 844 px at 100% browser zoom and `scene.kind` is `"house"`, THE Camera SHALL frame the Cutaway_House so that the attic, the middle floor and the basement are all drawn, no part of the house is clipped, and the house is no wider than the viewport. The page MAY scroll vertically.
3. WHILE the viewport is 390 px wide at 100% browser zoom and `scene.kind` is `"ghost"`, THE Grimoire SHALL be placed under the Ghost_Scene drawing: its top edge is at or below the bottom edge of the drawing, and it does not cover any part of the drawing (the width where it moves is D10).
4. WHILE the viewport is 360 px wide or more, THE Web_Page SHALL have no horizontal page scroll in the House_Scene, the Floor_Scene and the Ghost_Scene (the page is no wider than the viewport). Only the Code_Block may scroll horizontally, inside its own box, for long code lines (web-demo Requirement 12.3).
5. THE director SHALL check criteria 1 to 3 by hand on the Shots_Script screenshots (1440 px by 900 px and 390 px by 844 px), and criterion 4 by hand at 360 px, as for web-demo Requirement 12.3. No automated layout test is added to the Check_Script.

#### Edge cases

- A landscape phone (844 px by 390 px): the design decides the framing. Criterion 4 still applies, so there is no horizontal page scroll.
- The browser zoom is 200% on a 1440 px by 900 px window (720 px by 450 px of CSS space): no text is clipped or covered by another element, every control can be reached by scrolling and with the keyboard, vertical page scroll is allowed, and criterion 4 still applies.
- 390 px by 844 px is the screenshot size; 360 px is the smallest width with the no-horizontal-scroll rule.

### Requirement 20: Performance and size budget

**User Story:** As a judge on an ordinary laptop or phone, I want smooth animation and a fast load, so that the scene does not stutter.

#### Acceptance Criteria

1. THE Scenic_Renderer CSS SHALL animate only the properties `transform` and `opacity` in every `@keyframes` rule and every `transition`. Every `transition` SHALL name its properties explicitly (no `all` and no shorthand without a property). The Source_Scan checks both rules.
2. THE Scenic_Renderer SHALL apply SVG filters (a CSS `filter` other than `none`, or an SVG `filter` attribute) only to elements where no animation targets the element itself or any of its descendants. A filtered static layer inside an animated ancestor, such as the Camera, is allowed. The Shots_Script checks this in every state it captures, using `element.getAnimations({ subtree: true })`.
3. THE Scenic_Renderer source (every non-test TypeScript file under `src/view/scenic/`) SHALL contain no `requestAnimationFrame` and no `setInterval`, checked by the Source_Scan.
4. WHEN the Shots_Script captures a state, THE Web_Page SHALL have at most 15 animations with `playState` `"running"`, as counted by `document.getAnimations()` at that moment.
5. THE root `package.json` SHALL have a script `size` that runs the Size_Check, a Node script, and THE Check_Script SHALL run `npm run size` right after `npm run build` and before `npm test`.
6. IF `packages/web/dist/` does not exist, THEN THE Size_Check SHALL fail with a non-zero exit code and a message that names `npm run build`.
7. IF the size total of the files in `packages/web/dist/` and all its subfolders is 500 KB (512,000 bytes) or more, THEN THE Size_Check SHALL fail with a non-zero exit code. The size total is the sum of the gzipped sizes of every `.js`, `.css`, `.svg`, `.woff2`, `.woff`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif` and `.ico` file, each file gzipped separately at the default level of Node's zlib.
8. WHEN the Size_Check runs, THE Size_Check SHALL print the measured total in bytes and the 512,000-byte limit, whether it passes or fails.
9. THE Size_Check SHALL also fail when a built file in `packages/web/dist/` contains an external address, by the rule of the Source_Scan (the SVG namespaces are allowed), but only for the built HTML, CSS and SVG files. THE Size_Check SHALL NOT check JavaScript or `.txt` files for external addresses.
10. THE Size_Check SHALL run on Windows PowerShell and on Linux using only Node.js built-in modules and the project's npm dependencies, with no shell-specific commands and no network access.

#### Edge cases

- The ghost texts of sirv are inlined in the JavaScript bundle (`?raw`), so they count in the budget.
- Both renderers are in `dist/`, so both count.
- woff2 fonts barely shrink with gzip, so their gzipped size is close to their file size.
- Image files in `dist/` count (criterion 7), even though the Scenic_Renderer adds none.
- A total of exactly 512,000 bytes fails.
- The built JavaScript bundle and `sirv-license.txt` hold `https://api.github.com`, `https://github.com/owner/repo` and `https://lukeed.com`. They are not checked for external addresses, so the Size_Check passes on them (criterion 9).
- Files with other extensions (`.html`, `.txt` such as `sirv-license.txt` and the font licences, `.map`) do not count in the size.
- `npm test` alone on a clean checkout does not need `dist/`, because the Size_Check is a separate script (web-demo Requirement 13.2 still holds).
- Under Reduced_Motion the same 15-animation limit applies. The count is expected to be lower.

### Requirement 21: Fonts

**User Story:** As the project director, I want two display fonts that fit the theme, bundled with the site, so that the look holds and nothing is loaded from outside.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL render the logo and the tagline of the HUD with Creepster as the first family of their `font-family`.
2. THE Scenic_Renderer SHALL render every heading element (`h1` to `h3`) other than the logo, and the Finale banner, with IM Fell English as the first family of its `font-family`.
3. THE Scenic_Renderer SHALL render the Code_Block and every file path with the monospace stack `--font-code`, and all other text with the system font stack `--font-body` (both as in the Simple_Renderer tokens), and SHALL never use Creepster for that text (D11).
4. THE Web_Package SHALL bundle both fonts as local files of the build output in `dist/`, taken from npm packages pinned at exact versions (for example `@fontsource/creepster` and `@fontsource/im-fell-english`; their current docs are checked in the design), and SHALL bundle only the Latin subset, regular weight, of each font (D11).
5. THE Web_Page SHALL load no font from another origin: every font source SHALL be a same-site path to a file in the build output, never `http:`, `https:` or `//` (web-demo Requirement 11.5).
6. THE Scenic_Tokens SHALL declare each display font as the bundled family followed by a system font stack that ends with a generic family.
7. IF a font file has not loaded yet or fails to load, THEN THE Web_Page SHALL keep the text visible in the system font stack that follows the font in Scenic_Tokens, with no invisible text at any time and no error shown to the judge.
8. THE repository SHALL credit each font in one committed file, giving the font name, its copyright holder and the SIL Open Font Licence, and THE Web_Package SHALL copy the full OFL text of each font into `packages/web/public/`, so that it ships in `dist/`.

#### Edge cases

- The font has not arrived yet when the first render runs: the text shows in the fallback font and then swaps to the bundled font once it loads (criterion 7).
- Creepster is hard to read in small sizes: it is used only for the logo and tagline, never for body text or code (criteria 1 and 3).
- A font file is missing from `dist/` or blocked by the browser: the page still works, and the text uses the system fallback stack.
- Nameplate labels, Grimoire choices and Bestiary titles use the body stack; their paths use `--font-code` (criterion 3).

### Requirement 22: Art as data and Scenic_Tokens

**User Story:** As the project director, I want the art described as plain data and the colours in one file, so that the art is safe, testable and easy to retune.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL describe every SVG element it creates as Shape_Data: plain data made only of shape kinds, numeric coordinates, class names and the keywords `transparent`, `currentColor`, `none` and `inherit`, with no other colour value (no hex value, no colour function and no CSS named colour).
2. THE Scenic_Renderer SHALL create every SVG element with `document.createElementNS` and the SVG namespace `http://www.w3.org/2000/svg`.
3. THE Scenic_Renderer SHALL use none of `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `createContextualFragment` or `setHTMLUnsafe`, and SHALL build no DOM node from a string of markup. THE Source_Scan raw-HTML pattern SHALL be extended with `DOMParser`, `createContextualFragment` and `setHTMLUnsafe` for every file it scans.
4. THE Scenic_Tokens file SHALL define each of these nine palette colours as the value of one CSS custom property, with the hex value exactly as listed (letter case ignored): Night `#0B111B`, Slate `#202D3B`, Mist `#6F7F92`, Bone `#D5D0C5`, Spectral `#B9CCE6`, Candle `#E6A25C`, Pumpkin `#FF7A1A` (the game accent), Brass `#C47B3D`, Rust `#6E2A1E`. It SHALL also define the named cold-blue and warm-orange colours used by Requirements 6 and 12.
5. THE Scenic_Tokens file SHALL define as CSS custom properties every colour, size and font family that the Scenic_Renderer CSS uses.
6. THE Source_Scan SHALL apply the Simple_Renderer CSS rules (no literal colour, no literal size, no `font-family` value without `var(`), with the same exemptions (comments, `@media` lines and the text inside `url(...)`), to every CSS file under `src/view/scenic/` except the Scenic_Tokens file. It SHALL fail and name each file that breaks a rule. It SHALL also check that the Scenic_Tokens file exists, is skipped by these rules, and would break the colour rule if it were scanned.
7. THE Source_Scan SHALL fail and name the file when a non-test TypeScript file under `src/view/scenic/` contains a string literal that holds a hex colour, holds a colour function (`rgb(`, `rgba(`, `hsl(`, `hsla(`, `hwb(`, `lab(`, `lch(`, `oklab(`, `oklch(` or `color(`), or is exactly a CSS named colour (letter case ignored). The keywords `transparent`, `currentColor`, `none` and `inherit` SHALL NOT be caught.
8. THE Source_Scan rules that already cover all of `src/view/**` (no browser storage, no raw HTML, no external address, Core imported only with `import type`, the word "Power" only in `powerTexts.ts`) SHALL cover `src/view/scenic/` as well. THE Source_Scan SHALL fail if it finds no `.ts` file or no `.css` file under `src/view/scenic/`.
9. THE Source_Scan SHALL include self-check cases: a hex value, a colour function and a named colour, each inside a TypeScript string, are caught; a class name such as `"ghost--red-eyes"` and the four allowed keywords are not caught; and `DOMParser`, `createContextualFragment` and `setHTMLUnsafe` are caught by the raw-HTML pattern.
10. THE Scenic_Renderer SHALL take every graphic except one from Shape_Data, which is code and not an asset. The one exception is the scene illustration (`house-scene.svg`, drafted with Claude and declared): the Scenic_Renderer SHALL show it as an `<image>` whose URL the entry file `src/view/scenicEntry.ts` resolves from the `scene.house` slot of the asset manifest (`src/view/assets/manifest.ts`) and passes in. No file under `src/view/scenic/` SHALL import `src/view/assets/` (Source_Scan item 15), and the Scenic_Renderer SHALL load no other graphic file.
11. THE Source_Scan SHALL fail if any `.svg` file exists under `src/view/scenic/`.

#### Edge cases

- The SVG namespace `http://www.w3.org/2000/svg` is already exempt from the external-address rule.
- A class name such as `ghost--red-eyes` is a name, not a colour, as long as no colour word stands alone as a CSS value or as a whole TypeScript string.
- A colour word inside a longer string (for example `"Golden key"` or `"tan-wall"`) is not a literal colour, because criterion 7 matches a named colour only when it is the whole string.
- Comments in scenic files must not contain the word "Power" (the existing rule matches whole words, case-sensitive).
- A `--gap: 8px` declaration outside the Scenic_Tokens file breaks the size rule, because the Simple_Renderer CSS rules also check custom property values.
- Numeric SVG coordinates in Shape_Data have no CSS unit and are not sizes under criterion 5.
- Scenic TypeScript may compute numeric transforms (for example the Camera transform); no rule forbids numbers in TypeScript.
- The fonts are files in `dist/` but not graphics; criterion 10 does not cover them (Requirement 21).

### Requirement 23: Properties of the scene layout

**User Story:** As the project director, I want the rules of the scene checked on many generated reports, so that a live repository never breaks the house.

#### Acceptance Criteria

1. THE Scene_Layout SHALL use no DOM API, so that its tests run in the Vitest Node environment with no jsdom or happy-dom installed (web-demo testing strategy).
2. FOR ALL ViewModels with a non-null `house` and `scene.kind` `"house"` or `"floor"`, THE Scene_Layout SHALL place every Card exactly once, on the floor given by that Card's `floor`. Cards are counted by their position in report order, not by path. FOR ALL ViewModels with `scene.kind` `"ghost"`, THE Scene_Layout SHALL place no Ghost_Slot (property-based test).
3. FOR ALL ViewModels with 1 to 5 Cards on one floor, THE Scene_Layout SHALL give each Ghost_Slot of that floor a rectangle that lies fully inside the rectangle of that floor, and no two Ghost_Slots of that floor SHALL share an area greater than zero. Touching edges are allowed (property-based test).
4. FOR ALL ViewModels built from `uniquePathReportArb`: WHILE `scene.kind` is `"floor"`, THE Scene_Layout SHALL give exactly one start control to each Card of the focused floor whose `canStart` is true, and no start control to any other Card; WHILE `scene.kind` is `"house"` or `"ghost"`, THE Scene_Layout SHALL give no start control to any Card (property-based test).
5. FOR ALL ViewModels, THE Scene_Layout SHALL choose each Card's Variant only from the Card's 0-based position, in report order, among all Cards of its floor, whatever their state. Two Cards at the same position on the same floor in two different ViewModels SHALL get the same Variant, and two Cards of the same floor SHALL get different Variants (property-based test). Core never returns more than 5 ghosts, so a floor never holds more than 5 Cards from a real report; the "different" part is checked with at most 5 Cards per floor.
6. FOR ALL ViewModels built from `uniquePathReportArb` with a non-null `house`, THE Scene_Layout SHALL set the Telephone_Target to the path of the first Card whose `canStart` is true, in floor order (attic, middle floor, basement), then report order inside each floor. IF no Card has `canStart` true, or `house` is null, THEN THE Scene_Layout SHALL set no Telephone_Target (property-based test).
7. FOR ALL ViewModels, THE Finale decision of Requirement 13.1 SHALL be true exactly when `house` is non-null, `house.source` is `"sample"`, no Card is Haunted, at least one Card is Exorcised and `scene.kind` is `"house"` or `"floor"` (property-based test).
8. THE property tests SHALL build ViewModels from the existing generators (`reportArb` of Core and the web test helpers, such as `uniquePathReportArb`). Each property SHALL run at least 100 times, and the generated ViewModels SHALL include both `house.source` values, all three Scene kinds and all three GhostStates.
9. WHEN a report has two Cards with the same path, THE Scene_Layout SHALL use the first of them, in floor order (attic, middle floor, basement), then report order inside each floor, for the Telephone_Target and for the start control of that path (unit test).

#### Edge cases

- Report order and floor order differ (for example a middle-floor ghost listed before an attic ghost): the Telephone_Target follows floor order (attic, middle floor, basement), then report order inside each floor, because the ViewModel groups the Cards by floor. Within a floor, Cards keep report order (web-demo Requirement 3.2), and that order sets each Card's Variant position.
- A report with repeated paths (possible in `reportArb`): the layout still places each Card once, because it counts Cards by position (criterion 2), and the first Card wins for path-keyed controls (criterion 9).
- A floor with no Cards: the Scene_Layout gives it no Ghost_Slot, and criteria 3 and 5 hold with nothing to check.
- A live report: no Card has `canStart` true, so no start control and no Telephone_Target come from the Cards, and the Finale decision is false.

### Requirement 24: Visual review tool

**User Story:** As the project director, I want screenshots of every scene and state, so that I can review the art without clicking through the demo by hand.

#### Acceptance Criteria

1. THE root `package.json` SHALL have a script `shots` that runs the Shots_Script.
2. THE Shots_Script SHALL use Playwright at an exact version (no `^` or `~`), added as a devDependency with `package-lock.json` updated in the same commit.
3. THE Check_Script, `npm test` and the CI workflow SHALL NOT run the Shots_Script.
4. WHEN the Shots_Script runs, THE Shots_Script SHALL drive the page through the sample flow and save one PNG for each of these 18 states: the House_Scene; the Floor_Scene of the attic; the Floor_Scene of the middle floor; the Floor_Scene of the basement (empty in the sample); the Ghost_Scene in step `explaining`; the Ghost_Scene in step `asking`; each of the four Reactions of Requirement 11 ("Got it", "Partly", "Missed it", "I don't know"); the Ghost_Scene in step `failed`; the Exorcised_Moment; the Finale; a live analysis with `live.busy` true; a live report shown after the analysis ends; and, with Reduced_Motion on, the House_Scene, one Floor_Scene and the Ghost_Scene in step `asking`.
5. THE Shots_Script SHALL save each state of criterion 4 twice, once at a viewport of 1440 px by 900 px and once at 390 px by 844 px, with a different file name for each state and size, and each file name SHALL name both the state and the size.
6. THE Shots_Script SHALL turn the Lightning_Toggle off before the first shot, SHALL capture the four Reactions and the Exorcised_Moment at their end state, and SHALL pause every other CSS animation and transition at a fixed point before each screenshot. No screenshot may be taken while an animation or transition is still running.
7. THE Shots_Script SHALL write the PNG files into `packages/web/shots/`, replacing any file with the same name from an earlier run, and `.gitignore` SHALL list that folder.
8. WHERE the Vite dev server runs, THE Web_Package SHALL serve the Gallery. The Gallery shows every Ghost_Type (Wisp, Lantern_Wraith, Chained_Brute) in every Variant, each in the Haunted, Locked and Exorcised states, side by side: 3 Ghost_Types × 5 Variants × 3 states.
9. THE built output in `packages/web/dist/` SHALL contain no Gallery HTML page and no JavaScript or CSS file that holds Gallery code.
10. WHEN the Shots_Script runs, THE Shots_Script SHALL also save one screenshot of the Gallery at 1440 px by 900 px and one at 390 px by 844 px.
11. THE Shots_Script SHALL run with `npm run shots` in Windows PowerShell and SHALL use only cross-platform Node tools, with no shell-only command (for example `rm -rf`).
12. WHEN every screenshot of criteria 4, 5 and 10 has been saved, THE Shots_Script SHALL exit with code 0 and print the number of PNG files written, provided every required check (Requirements 20.2 and 20.4) also passed. IF a required check failed, THEN THE Shots_Script SHALL write every file first, then exit with a non-zero code and print the check that failed.
13. IF a step of the Shots_Script does not reach its expected state within 10 s, or fails in another way, THEN THE Shots_Script SHALL stop, exit with a non-zero code and print a message that names the step that failed. The PNG files already written stay.
14. THE Shots_Script SHALL never call the real GitHub: Playwright SHALL intercept every request to a GitHub address and answer it with fixed data, reusing the fake data of the existing test utilities where possible. For the "live analysis busy" shot, the intercepted request SHALL be held without an answer until the shot is taken.
15. THE Shots_Script SHALL run the sample flow on the built page served by `vite preview`, and the Gallery on the Vite dev server. It SHALL start both servers itself and SHALL stop both when it ends, on success or failure, leaving no server process running (D12).

#### Edge cases

- The Playwright browser is not installed: the Shots_Script exits with a non-zero code and a message that names the install command.
- The Shots_Script fails half way: the PNG files written before the failure stay in `packages/web/shots/`, both servers are stopped, and nothing is committed.
- A second run on the same commit overwrites the PNG files of the first run that have the same names.
- `npm run lint` and `npm run format:check` pass when `packages/web/shots/` contains PNG files from a run (lint and Prettier ignore that folder).
- The sample has no basement ghost, so the basement Floor_Scene screenshot shows an empty basement (Requirement 8.6).
- The Finale shot needs both Scripted_Ghosts exorcised and a return to the House_Scene or a Floor_Scene (Requirement 13.1).
- The machine has no network: the run still works, because every GitHub request is intercepted (criterion 14).

### Requirement 25: Web-demo rules still hold

**User Story:** As the project director, I want the new view to keep every promise of the web demo, so that nothing that works today breaks.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL never read, send, log or store the Answer_Box text, and no Reaction, Scene_Layout result or dispatched UserAction SHALL depend on that text (web-demo Requirement 6.23).
2. THE Web_Package source SHALL use no `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie` in any file the Source_Scan scans: every non-test `.ts`, `.css` and `.svg` file under `src/` (including `src/view/scenic/`) plus `index.html` (web-demo Requirement 9.2).
3. THE Web_Page SHALL load every font, image, style sheet and script from its own site under the GitHub Pages `base` path, and SHALL load none from another origin or a CDN (web-demo Requirement 11.5; checked by the Source_Scan in `index.html` and `src/view/`, and on the built output by the Size_Check, Requirement 20.9).
4. THE whole word "Power" (case-sensitive) SHALL appear only in `src/logic/powerTexts.ts` among the files the Source_Scan scans, and THE Scenic_Renderer SHALL take every text that mentions the Kiro Power from the Power_Texts (web-demo Requirement 4.13).
5. WHILE the Code_Block is shown, THE Scenic_Renderer SHALL show the Licence_Notice in the Grimoire directly after the Code_Block, outside the Code_Block's own scroll, so that it stays visible however far the Code_Block is scrolled (web-demo Requirement 10.2).
6. WHEN the Web_Page loads, THE Logic_Layer SHALL make zero network requests (web-demo Requirement 2.2).
7. IF GitHub is unreachable, THEN THE Web_Page SHALL still show the sirv sample in the House_Scene and SHALL let the judge complete the exorcism of every Scripted_Ghost (web-demo Requirement 2).
8. THE Scenic_Renderer SHALL make no network request of its own. Its only fetches SHALL be the same-site static files of criterion 3, loaded by the browser.
9. THE Scenic_Renderer SHALL write every text from the ViewModel with `textContent` or an attribute, and SHALL use none of the raw-HTML calls of Requirement 22.3 (checked by the Source_Scan).
10. WHEN `npm run check` runs, every test of the Web_Package that existed before this spec SHALL pass with no assertion removed or weakened, and THE Check_Script, the Size_Check included, SHALL perform no network access. The Shots_Script is not part of the Check_Script.
11. WHILE `?view=simple` is used, THE Simple_Renderer SHALL show the same elements, texts and focus behaviour as before this spec, apart from the new Scenic_View_Link (Requirement 1.11), and no scenic style sheet SHALL apply (Requirement 1.9). Moving the pure focus rule to a shared file (Requirement 17.10) SHALL NOT change that behaviour.

#### Edge cases

- The Kiro Power is renamed before the code freeze: only `powerTexts.ts` changes, and both renderers follow.
- The scenic fonts fail to load: the page still works and stays readable with system fonts, because every font stack in the Scenic_Tokens ends with a generic family.
- GitHub is unreachable or rate-limited: the sample works fully. Only a live analysis fails, through the existing error and Fallback path.
- The judge types a very long answer: the text stays in the Answer_Box. No Reaction, Scene change or re-render reads it.

## Out of Scope

- Audio files, music or sound of any kind.
- Film characters, film quotes or logos (the Telephone is an original design).
- WebGL or canvas drawing.
- Animation libraries or any JavaScript animation loop.
- AI-generated images.
- Engine or Logic_Layer changes beyond new texts in `texts.ts` and `powerTexts.ts`.
- New ViewModel fields or new UserActions.
- Editing the web-demo spec (its relation to this spec is stated in the Introduction).
- The "Not yet" option 1 (a simpler explanation and the questions repeated once); it gets its own spec later.
- A multi-language page.
- The exorcism certificate.
- Exorcising a live repository on the web.
- Removing or restyling the Simple_Renderer (it only gets the Scenic_View_Link).
- Switching renderer without a page reload.
- Saving any setting (view choice, Lightning, Intro seen, Telephone answered) in the browser.
- Running the Shots_Script in CI or in `npm run check`, or letting it call the real GitHub.
- An automated layout test for Requirement 19 inside the Check_Script.

### Later optional idea (not in this spec)

- A synthesized ring sound for the Telephone, made with Web Audio and off by default.

## Names Checked Against the Code

| Name in the brief | Exists as | Where | Note |
| --- | --- | --- | --- |
| `TEXTS.emptyFloor` | yes, "No ghosts on this floor." | `src/logic/texts.ts` | The ViewModel carries it as `FloorView.emptyLine`. |
| `TEXTS.houseClean` | yes | `texts.ts` | The ViewModel carries it as `HouseView.houseClean`. |
| `TEXTS.pageTitle` | yes, "Haunted Repo" | `texts.ts` | Logo, and House_Scene heading when `house` is `null`. |
| `TEXTS.actionLabels["go-to-floor"]` | yes, "Go to this floor" | `texts.ts` | Part of the floor buttons' accessible name. |
| `POWER_TEXTS.lockedGhost` | yes | `src/logic/powerTexts.ts` | The ViewModel carries it as `GhostCardView.lockedLine`. |
| `POWER_TEXTS.liveReport` | yes | `powerTexts.ts` | The ViewModel carries it as `HouseView.powerLine`. |
| `canStart` | yes | `GhostCardView` in `viewModel.ts` | True exactly when `start-ghost` for that path is available. |
| `start-ghost`, `go-to-floor`, `go-to-house` | yes | `UserAction` in `actions.ts` | `go-to-floor` is not offered for the floor in focus, and none of them is offered in the Ghost_Scene. |
| `scene`, `transition` | yes | `ViewModel` in `viewModel.ts` | `transition` is set only in the render where the Scene changed. |
| ProgressView | yes, `ProgressView` | `viewModel.ts` | `null` for live reports (`buildHouse` in `houseView.ts`); `total` is 5 for sirv. |
| focus.ts rule | yes, `focusAfterRender` | `src/view/simple/focus.ts` | The Scenic_Renderer adds a Scene-change rule on top of it (Requirements 17.7 and 17.8). |
| `uniquePathReportArb` | yes | `src/logic/uniquePathReportArb.testutil.ts` | Used by Requirements 23.4 and 23.6. |
| "Got it", "Partly", "Missed it", "I don't know" | yes | `TEXTS.actionLabels.rate` and `["dont-know"]` | "Partly" is also the `self-check` `half` label. |
| "Start the exorcism", "Back to the house" | yes | `TEXTS.actionLabels["start-ghost"]`, `["go-to-house"]` | |
| ViewModel, UserAction | yes (code names) | `viewModel.ts`, `actions.ts` | The web-demo spec writes View_Model and User_Action. |
| Exorcism_Panel | yes (spec name) | web-demo glossary, `renderGhost` in `ghost.ts` | Here it is the Grimoire. |
| "Simple view", "Scenic view", "Answer the phone", the "call waiting" addition, "The line is quiet.", "Lightning: on/off", the Lightning reason, the tagline, the Finale lines, the Bestiary texts, the Nameplate accessible name | no | — | New texts to add to `texts.ts` (and `powerTexts.ts` for the Finale line that names the Power). |
| Telephone_Target for a live report | no | — | A live report has no Card with `canStart`, so there is never a target; the Live_Call (Requirement 9.5) covers it. |
| A "demo complete" field | no | — | Derived from Card states and the Scene (Requirement 13.6), no new field. |
| External addresses in the build | yes | `dist/` JS and `sirv-license.txt` (not checked, by the director's answer) | `https://api.github.com` (`githubClient.ts`), `https://github.com/owner/repo` (`repoUrl.ts` message) and `https://lukeed.com` (sirv copyright). Only built HTML, CSS and SVG files are checked (Requirement 20.9). |

## Left to the design

The director answered these on 17 Nov. They are constraints for `design.md`, not open questions.

- **D1.** The House_Scene heading when `house` is `null` is `TEXTS.pageTitle`. The accessible name of a floor button is the floor title followed by "Go to this floor" (`TEXTS.actionLabels["go-to-floor"]`).
- **D2.** The Bestiary ranges are literal texts in `texts.ts`, guarded by the test of Requirement 7.3. Whether the Bestiary folds on narrow screens is the design's choice. The Bestiary drawings are `aria-hidden`; its texts are not.
- **D3.** The Camera moves from the Ghost_Scene to a floor and from the Ghost_Scene to the house use the same 0.6 s to 0.8 s move. Dimmed floors are at about 35% brightness.
- **D4.** The Search_Beam makes one sweep in about 2.5 s and loops while `live.busy` is true.
- **D5.** A render that arrives during the Exorcised_Moment lets it keep playing; a Scene change makes it jump to its end state. The Haunt_Meter moves in about 0.8 s. Cold blue and warm orange are named Scenic_Tokens. The Exorcised drawing of a slot shows in the Floor_Scene too.
- **D6.** The order of the "Got it" Reaction and the Exorcised_Moment when both start in the same render; each keeps its own time limit (Requirements 11.10 and 12.4).
- **D7.** Lightning flashes only in the House_Scene and the Floor_Scene, never during the Intro or in the Ghost_Scene.
- **D8.** Whether Lightning still flashes while the Finale is shown.
- **D9.** Under Reduced_Motion, rain and fog are drawn still, at low opacity.
- **D10.** The viewport width at which the Grimoire moves under the Ghost_Scene drawing.
- **D11.** Code and paths use `--font-code`. Only the Latin subset, regular weight, of each font is bundled. Scenic text that is not an `h1` to `h3` uses the body stack, except the Finale banner (IM Fell English).
- **D12.** Whether the Shots_Script runs the build itself before `vite preview`, or stops with a message naming `npm run build` when `dist/` is missing.
- **D13.** Whether the Opening_Rings wait for the Intro to end ("one eye-catching anomaly at a time").
- **D14.** Where the Answer_Button sits when the Camera frames a floor other than the middle floor; it stays shown and reachable there (Requirements 9.7 and 17.5), like the floor buttons of dimmed floors.
