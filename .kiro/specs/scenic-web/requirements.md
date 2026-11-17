# Requirements Document

## Introduction

This spec adds a second Renderer to the demo page in `packages/web`: the Scenic_Renderer, in `packages/web/src/view/scenic/`. It draws the demo as a Halloween video-game scene: a cutaway haunted house with three floors, a different ghost design for each floor, a game HUD in real HTML, a telephone that rings when there is a ghost to attend, and a close-up exorcism room with a Grimoire dialogue panel. The art is hand-built SVG, made from plain data and animated with modern CSS only.

The Scenic_Renderer implements the existing `Renderer` interface of `src/logic/viewModel.ts` (`render(model: ViewModel): void`) and sends the existing `UserAction` values. It becomes the default view. The current Simple_Renderer stays available at `?view=simple` and through a visible "Simple view" link. Both renderers use the same Logic_Layer, which this spec does not change, apart from new English texts (see Requirement 2).

This spec follows the plan written in the web-demo design ("Readiness for a scenic UI" and "How to replace the look"): a new folder under `src/view/`, one renderer choice in `main.ts`, and no change to `src/logic/**`, `src/sample/**`, the committed data or Core. It also takes the decisions of 16 Nov in `docs/decisiones.md`: an SVG with a video-game look (Halloween style, with animation) and a different ghost design for each floor. The tagline is the one decided on 17 Nov: "Your repo is haunted. Let's fix that."

Facts checked in the code on 17 Nov and respected here:

- Floors are exactly `"attic"` (easy, score 0 to 33), `"middle floor"` (34 to 66) and `"basement"` (hard, 67 to 100) (`packages/core/src/ghost-detection/floor.ts`).
- The committed sirv sample (`src/sample/report.json`) has 4 attic ghosts, 1 middle-floor ghost and 0 basement ghosts. Only `bench/static.js` and `builder.js` have Ghost_Content in the Demo_Script, so only those two can be exorcised on the page; the other 3 are Locked_Ghosts.
- The engine reaches `house-clean` only when no ghost is haunted (`suggestGhost` returns `null`, `packages/core/src/exorcism/engine.ts`). Locked_Ghosts stay haunted in the engine, so the sample can never reach `house-clean`.
- A live report has up to 5 ghosts, and all of them can be on one floor.
- The Logic_Layer already exposes `scene` (`house`, `floor`, `ghost`), `transition`, `go-to-floor` and `go-to-house`. The Simple_Renderer does not use them.
- A ghost becomes `exorcised` in the progress when its third answer is decided and the step becomes `self-check`, not after the self-check answer (`nextQuestion` in `engine.ts`). See Open question 5.

### Style guide (short note)

The full style guide goes in `design.md`. The rules that the requirements rely on are:

- Shadow-theatre silhouettes in 4 to 5 depth layers; farther layers are lighter and bluer.
- A thin rim light from the moon on the silhouettes.
- At least 40% of each scene is deep shadow.
- One main light per scene.
- Nothing symmetric: the composition is asymmetric.
- One eye-catching anomaly at a time.
- Colour meaning: cold blue means code you do not understand yet; warm orange means code that is yours.

### Size of the work

This spec will change far more than about 500 lines. Following `git-workflow.md`, the design must propose how to split it into stacked pull requests before any task starts, as was done for web-demo (decision of 14 Nov in `docs/decisiones.md`).

## Glossary

Names in `code font` are the exact names in the code (checked on 17 Nov). Names with underscores are the spec names used in the web-demo spec.

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
- **Scene**: the type `Scene` of the ViewModel field `scene`: `{ kind: "house" }`, `{ kind: "floor", floor }` or `{ kind: "ghost", floor, path }`.
- **Transition**: the ViewModel field `transition` (`SceneTransition | null`): `{ from, to }` only in the render where the Scene changed.
- **House_Scene**: what the Scenic_Renderer draws when `scene.kind` is `"house"`: the whole cutaway house.
- **Floor_Scene**: what the Scenic_Renderer draws when `scene.kind` is `"floor"`: the Camera framed on one floor.
- **Ghost_Scene**: what the Scenic_Renderer draws when `scene.kind` is `"ghost"`: the close-up exorcism room.
- **Cutaway_House**: the drawing of the house with its front removed, like an open doll's house, showing the attic, the middle floor (Entrance_Hall and Parlour) and the basement.
- **Entrance_Hall**: the left part of the middle floor, with the front door and the telephone table.
- **Parlour**: the right part of the middle floor.
- **Camera**: the CSS transform of the scene layers that frames the whole house or one floor.
- **HUD**: the game heads-up display: the real HTML layer over the scene with the logo, tagline, Haunt_Meter, Ghost_Icons, Live_Plaque, Status_Region, Bestiary, Lightning_Toggle, Licence_Notice and Simple_View_Link.
- **Haunt_Meter**: the HUD bar, drawn like a health bar, that shows the ViewModel `ProgressView` (`line` and `share`).
- **ProgressView**: the type `ProgressView` in `viewModel.ts`: `line`, `haunted`, `total`, `share`. It is set in `house.progress` only for the sample (`null` for a live report).
- **Ghost_Icons**: the row of small HUD icons, one per ghost of the shown report, each showing haunted or exorcised.
- **Live_Plaque**: the live form (web-demo Live_Form) drawn as a brass plaque. Same label (`TEXTS.formLabel`), same button text (`TEXTS.actionLabels["submit-live"]`) and same behaviour as the Simple_Renderer form.
- **Status_Region**: an element with `aria-live` where status and error messages appear (web-demo glossary).
- **Licence_Notice**: the sirv MIT notice: the copyright line plus a link to `sirv-license.txt` (`LicenceView` in `viewModel.ts`).
- **Ghost_Type**: one of the three ghost designs, one per floor: **Wisp** (attic), **Lantern_Wraith** (middle floor), **Chained_Brute** (basement).
- **Variant**: one of up to 5 visual versions of a Ghost_Type (size, tilt, eyes, accessory), chosen from the ghost's position among the ghosts of its floor.
- **Ghost_Slot**: the place on a floor where one ghost and its Nameplate are drawn.
- **Nameplate**: the brass label of one ghost on its floor: path, difficulty and state, plus the start control when `canStart` is true.
- **Card**: one `GhostCardView` of the ViewModel (`house.floors[i].ghosts[j]`), with `path`, `floor`, `score`, `reason`, `state`, `canStart` and `lockedLine`.
- **Haunted / Locked / Exorcised**: the three values of `GhostState` (`"haunted"`, `"locked"`, `"exorcised"`) of a Card.
- **Scripted_Ghost / Locked_Ghost**: a sample ghost with or without Ghost_Content in the Demo_Script (web-demo glossary).
- **Bestiary**: a small HUD panel that shows the three Ghost_Types with the floor and the difficulty range each one stands for.
- **Telephone**: an original antique desk telephone on the telephone table of the Entrance_Hall, with no logo, no film character and no sound.
- **Ringing**: the Telephone animation (shake, vibration lines, orange glow and a "RING!" bubble) that says there is a ghost to attend.
- **Answer_Button**: the real HTML button "Answer the phone" placed over the Telephone.
- **Telephone_Target**: the path of the first Card in report order whose `canStart` is true, or none.
- **Grimoire**: the dialogue panel of the Ghost_Scene. It holds the reading, the question, the Answer_Box, the model answer, the prompts, the judge line and the ghost actions as game-style choices, plus the Code_Block and the Licence_Notice next to it.
- **Answer_Box**: the text box where the judge may type an answer. Its text is never read, sent, logged or stored (web-demo Requirement 6.23; `createAnswerBox` in `src/view/simple/ghost.ts`).
- **Code_Block**: the block that shows the full Ghost_Text (`ghost.code`) with its own scroll and a maximum height (web-demo glossary).
- **Question_Candles**: three candles in the Ghost_Scene, one per question; each finished question lights one.
- **Reaction**: a short ghost animation in the Ghost_Scene that follows a UserAction the Scenic_Renderer itself dispatched.
- **Exorcised_Moment**: the animation played when a Card changes from Haunted to Exorcised between two renders.
- **Finale**: the "demo complete" scene change: the rain stops, the clouds part, the horizon turns dawn orange and a banner appears.
- **Search_Beam**: the visible searching animation shown while a live analysis runs (for example a lantern beam that sweeps the house).
- **Lightning**: a short flash that lights the house.
- **Lightning_Toggle**: the visible HUD button "Lightning: on" / "Lightning: off".
- **Intro**: the optional opening animation in which the facade of the house opens like two doors.
- **Reduced_Motion**: the user setting `prefers-reduced-motion: reduce`.
- **Scenic_Tokens**: the one CSS file of the Scenic_Renderer that holds every colour, size and font as CSS custom properties.
- **Shape_Data**: the plain data (lists of shapes with class names, coordinates and no colours) that describes each SVG piece.
- **Scene_Layout**: the pure functions of the Scenic_Renderer that turn a ViewModel into placed pieces (Ghost_Slots, Variants, Telephone_Target, Finale flag) without touching the DOM.
- **Source_Scan**: the test file `packages/web/src/source.test.ts`, which scans source text.
- **Size_Check**: the check that measures the gzipped size of the built files in `packages/web/dist/`.
- **Shots_Script**: the hand-run command `npm run shots` that drives the real page with Playwright and saves screenshots.
- **Gallery**: a dev-mode-only page that shows the three Ghost_Types with all Variants and states side by side.
- **Check_Script**: the root command `npm run check` (lint, format check, build, tests).

## Requirements

### Requirement 1: Renderer choice

**User Story:** As a judge, I want the scenic view by default and a way to switch to the simple view, so that I see the game look first and can still use a plain page.

#### Acceptance Criteria

1. WHEN the Web_Page loads with no `view` query parameter, THE View_Choice SHALL create the Scenic_Renderer.
2. WHEN the Web_Page loads with a `view` query parameter whose value is exactly `simple` (case-sensitive, nothing before or after it), THE View_Choice SHALL create the Simple_Renderer.
3. IF the `view` query parameter is empty or has any value other than exactly `simple`, THEN THE View_Choice SHALL create the Scenic_Renderer.
4. THE Main_Entry SHALL pass the chosen Renderer to one `createPage` call, and the `PageDeps` given in that call SHALL be the same for both renderers.
5. THE Main_Entry SHALL create exactly one Renderer per page load, before the first call to `render`. The page SHALL contain no element created by the other Renderer.
6. WHILE the Scenic_Renderer is shown, THE HUD SHALL show the Simple_View_Link in the House_Scene, the Floor_Scene and the Ghost_Scene. The link's address SHALL be the relative address `?view=simple`, so that it opens the Simple_Renderer under the Vite `base` path `/haunted-repo/`.
7. THE View_Choice SHALL read only the query string of the page address, and it SHALL NOT change the page address.
8. THE View_Choice SHALL store nothing in the browser: no cookie, no `localStorage`, no `sessionStorage` and no IndexedDB entry.
9. WHILE the Simple_Renderer is shown, THE Web_Page SHALL apply no CSS rule of the Scenic_Renderer.
10. WHILE the Scenic_Renderer is shown, THE Web_Page SHALL apply no CSS rule of the Simple_Renderer (see Open question 14).

#### Edge cases

- `?view=SIMPLE` and `?view=` give the Scenic_Renderer (criteria 2 and 3).
- `?view=simple&view=scenic`: see Open question 19.
- Following the Simple_View_Link reloads the page, so the in-memory Sample_Session starts again (see Open question 14).
- The address also has a hash or other query parameters: they do not change the choice.

### Requirement 2: Logic untouched

**User Story:** As the project director, I want the new look to change only presentation files, so that the tested logic, data and engine stay as they are.

#### Acceptance Criteria

1. THE pull requests of this spec SHALL leave every file under `packages/web/src/logic/`, its test files included, byte-for-byte unchanged compared with the base branch of each pull request, except `texts.ts` and `powerTexts.ts`. No file under `packages/web/src/logic/` SHALL be added, removed or renamed.
2. THE pull requests of this spec SHALL change `texts.ts` only by adding new keys with English texts to `TEXTS`, and `powerTexts.ts` only by adding new keys to `POWER_TEXTS` with English texts that name the Kiro Power. Every key that `TEXTS` or `POWER_TEXTS` has in the base branch, nested keys included, SHALL still exist with the same value (see Open question 10).
3. THE pull requests of this spec SHALL leave the following byte-for-byte unchanged compared with the base branch of each pull request: every file under `packages/web/src/sample/` (including the committed data `report.json`, `files.json` and `demo-script.json`), `packages/web/public/sirv-license.txt`, and every file under `packages/core/`. No file SHALL be added to, removed from or renamed in those folders.
4. THE pull requests of this spec SHALL leave the declarations of the types `ViewModel`, `Scene`, `SceneTransition`, `HouseView`, `GhostView`, `GhostCardView`, `ProgressView`, `UserAction`, `AvailableAction` and `Renderer` unchanged: the same fields, the same field types and the same union members. Every field SHALL keep the meaning the web-demo spec gives it.
5. IF a requirement of this spec can only be met with a new ViewModel field, a new UserAction or a new union member of a type listed in criterion 4, THEN THE spec SHALL record it as an open question, and THE implementation SHALL NOT add that field, action or member.
6. THE Scenic_Renderer SHALL import from Core only with `import type`, and the Source_Scan check "src/view imports Core only with import type" SHALL include every file under `src/view/scenic/` and pass.
7. WHEN the Scenic_Renderer dispatches a UserAction, THE Scenic_Renderer SHALL dispatch only one that matches an entry of Available_Actions of the last ViewModel passed to its `render`. A match means the same `type` and the same parameters; for `submit-live` any URL matches.
8. IF the Scenic_Renderer has not yet received a ViewModel, THEN THE Scenic_Renderer SHALL dispatch no UserAction.

#### Edge cases

- A new text is only a new key in `TEXTS` or `POWER_TEXTS`. Changing the wording of an existing text, or removing a key, is not allowed in this spec.
- `main.ts`, `index.html`, `source.test.ts`, `vite.config.ts` and the root and web `package.json` may change. They are not Logic_Layer files (see Open question 20 for `source.test.ts`).
- An animation or Reaction that ends after a newer render checks its UserAction against the newest ViewModel, not the one that was current when the animation started (criterion 7).
- A test file added under `src/view/scenic/` is a Presentation_Layer file and does not break criterion 1.

### Requirement 3: House scene

**User Story:** As a judge, I want to see the repository as a haunted house with its three floors, so that I understand at a glance where the easy and the hard ghosts live.

#### Acceptance Criteria

1. WHILE `scene.kind` is `"house"`, THE Scenic_Renderer SHALL draw the Cutaway_House with the Camera framing the whole house, so that the three floors are visible at once and stacked from top to bottom in this order: the attic under the roof, the middle floor, and the basement below a cut ground line.
2. THE Cutaway_House SHALL draw the middle floor with the Entrance_Hall in its left part (front door and telephone table) and the Parlour in its right part.
3. WHILE `scene.kind` is `"house"` and the Finale is not shown, THE House_Scene SHALL draw a night sky, a moon, fog, rain and foreground silhouettes. Requirement 13.3 covers the Finale, and Requirement 18 covers the motion of the fog and the rain.
4. THE House_Scene composition SHALL be asymmetric: the left half of the drawing SHALL NOT be a mirror image of the right half about the vertical centre line.
5. WHILE `scene.kind` is `"house"` and `house` is not `null`, THE House_Scene SHALL draw exactly one Ghost_Slot per Card of `house.floors`. Each Ghost_Slot SHALL lie inside the floor whose `floor` equals `card.floor`, and its content SHALL follow the Card state (Requirement 6; an Exorcised Card shows a candle instead of a ghost).
6. WHILE `scene.kind` is `"house"`, THE Scenic_Renderer SHALL show, for each `house.floors[i]` whose `{ type: "go-to-floor", floor: house.floors[i].floor }` is in Available_Actions, exactly one real HTML button whose visible label is `house.floors[i].title`. THE Scenic_Renderer SHALL show no floor button for a floor whose action is not in Available_Actions.
7. WHEN the judge activates a floor button, THE Scenic_Renderer SHALL dispatch `{ type: "go-to-floor", floor }` for the floor of that button.
8. WHILE `scene.kind` is `"house"` and `house` is not `null`, THE Scenic_Renderer SHALL show the heading of the House_Scene as real HTML text equal to `TEXTS.houseHeading(house.repoName)` ("Ghosts of owner/repo").
9. IF `house` is `null` (the sample failed to load), THEN THE Scenic_Renderer SHALL draw the Cutaway_House with no Ghost_Slot and no floor button, and SHALL show `status.text` in the Status_Region.

#### Edge cases

- The sample has no basement ghost: the basement is drawn empty (see Requirement 8.6) and the Bestiary still shows the Chained_Brute (Requirement 7).
- A live report with all 5 ghosts on one floor: all 5 fit in that floor (Requirement 23.3).
- A live report with 1 ghost: two floors are empty.
- A floor with no Cards still gets its floor button, because the Logic_Layer lists `go-to-floor` for every floor that is not in focus.
- `house` is `null`: Available_Actions is empty, so no floor button appears (criterion 9 agrees with criterion 6). Which heading the House_Scene shows then, and the accessible name of a floor button, are Open question 21.
- A live analysis is running (`live.busy` true): the floor buttons stay, because the Logic_Layer lists `go-to-floor` even while busy.

### Requirement 4: Game HUD

**User Story:** As a judge, I want a game HUD over the scene, so that I always see the name, my progress, the live form and the messages.

#### Acceptance Criteria

1. THE HUD SHALL be real HTML placed over the scene, outside the SVG, in the House_Scene, the Floor_Scene and the Ghost_Scene.
2. THE HUD SHALL show the logo text `TEXTS.pageTitle` ("Haunted Repo") and the tagline "Your repo is haunted. Let's fix that." (a new text in `texts.ts`; see Open question 10).
3. WHILE `house.progress` is not `null`, THE Haunt_Meter SHALL show `house.progress.line` as text, and a bar whose filled width divided by its full width equals `house.progress.share` (0 to 1) within 0.01.
4. WHILE `house.progress` is not `null`, THE HUD SHALL show exactly `house.progress.total` Ghost_Icons: `house.progress.haunted` of them shown as haunted and `house.progress.total - house.progress.haunted` shown as exorcised.
5. WHILE `live.formVisible` is true, THE HUD SHALL show the Live_Plaque with a field labelled `TEXTS.formLabel` and a submit button labelled `TEXTS.actionLabels["submit-live"]`.
6. WHILE `live.formVisible` is false, THE HUD SHALL hide the Live_Plaque.
7. WHEN the judge submits the Live_Plaque (by clicking the submit button or by pressing Enter in the field), THE Scenic_Renderer SHALL dispatch exactly one `{ type: "submit-live", url }`, where `url` is the field text as typed, with no trimming or other change.
8. WHILE `submit-live` is not in Available_Actions, THE Live_Plaque submit button SHALL be disabled, and pressing Enter in the field SHALL dispatch nothing.
9. THE Scenic_Renderer SHALL build the Live_Plaque once and keep the same field element and its typed text across all later renders, including renders where the Live_Plaque is hidden (web-demo Requirement 5.4).
10. THE HUD SHALL contain exactly one Status_Region (`aria-live="polite"`) from the first render. On every render, the Status_Region text SHALL equal `status.text`, and it SHALL be empty when `status.kind` is `"none"`.
11. WHILE `licence` is not `null`, THE HUD SHALL show the Licence_Notice inside a `footer` element: the `licence.copyright` line and a link with `href` `licence.href` and text `licence.linkText` (web-demo Requirement 10.1).
12. THE HUD SHALL show the Simple_View_Link, the Bestiary (Requirement 7) and the Lightning_Toggle (Requirement 15).
13. WHILE `house` is not `null` and (`house.warnings.lines` is not empty or `house.warnings.skippedTitle` is not `null`), THE HUD SHALL show every line of `house.warnings.lines` in its given order and, when `skippedTitle` is not `null`, that title followed by every entry of `house.warnings.skipped` with its path and reason (web-demo Requirement 17, which binds any renderer).
14. WHILE `house.powerLine` is not `null`, THE Scenic_Renderer SHALL show `house.powerLine` as visible text (web-demo Requirement 4.7; see Open question 2).
15. WHILE `show-sample` is in Available_Actions, THE HUD SHALL show a button labelled `TEXTS.actionLabels["show-sample"]`, and one click SHALL dispatch exactly one `{ type: "show-sample" }`.
16. WHILE `show-sample` is not in Available_Actions, THE HUD SHALL NOT show the `show-sample` button.

#### Edge cases

- A live report is shown: `house.progress` is `null`, so the Haunt_Meter and the Ghost_Icons have no data (see Open question 7).
- The sample failed to load: `house` and `licence` are `null`. The HUD shows the logo, the tagline, the Status_Region and the Simple_View_Link only (see Open question 22).
- The Ghost_Scene is open: the Live_Plaque is hidden (`live.formVisible` false) and the rest of the HUD stays. When the judge leaves the Ghost_Scene, the field still holds the text typed before (criterion 9).
- `status.kind` is `"none"`: the Status_Region stays in the page with empty text, so later messages are still announced.

### Requirement 5: Three ghost designs and their variants

**User Story:** As a judge, I want each floor to have its own kind of ghost, so that I can tell easy ghosts from hard ones by their look.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL draw every Card whose `floor` is `"attic"` as the Wisp: a round sheet body with no tail and no horns, two eyes, and a cobweb piece attached to it.
2. THE Scenic_Renderer SHALL draw every Card whose `floor` is `"middle floor"` as the Lantern_Wraith: a hood, a spiral tail, and a lantern held in front of the body whose orange light falls on the face.
3. THE Scenic_Renderer SHALL draw every Card whose `floor` is `"basement"` as the Chained_Brute: horns, drips hanging from the lower edge of the body, chains, and eyes in the orange glow colour.
4. THE Scenic_Renderer SHALL take every colour of criteria 1 to 3 from the Scenic_Tokens, and no colour from the Shape_Data (Requirement 22).
5. THE Scenic_Renderer SHALL use the same Ghost_Type for a ghost in every place it is drawn: the House_Scene, the Floor_Scene, the Ghost_Scene (from `ghost.floor`), the Bestiary and the Gallery.
6. THE three Ghost_Types SHALL have different outlines. The outline is the body shape filled in one flat colour, with no inner details such as eyes. Each outline SHALL contain at least one part the other two lack: the Wisp is round with no tail, the Lantern_Wraith has a hood and a spiral tail, and the Chained_Brute has horns. At the same Variant number, the Wisp SHALL have the smallest outline and the Chained_Brute the widest. At the same Variant number, the Wisp's eyes SHALL take a larger share of its body height than the eyes of the other two Ghost_Types (see Open question 24).
7. WHILE Reduced_Motion is off, THE Scenic_Renderer SHALL give each Ghost_Type one idle animation, defined as a named CSS animation that differs from the idle animations of the other two Ghost_Types in name and in keyframes. WHILE Reduced_Motion is on, idle animations are off (Requirement 18.3).
8. THE Scenic_Renderer SHALL give each ghost the Variant number equal to its position among the Cards of its floor, in report order, from 0 for the first Card of that floor to at most 4. Each floor counts from 0 on its own.
9. THE Scenic_Renderer SHALL define 5 Variants (numbers 0 to 4) for each Ghost_Type. Any two Variants of the same Ghost_Type SHALL differ in at least one of size, tilt, eyes and accessory, so two ghosts of one floor never look the same.
10. FOR ALL ViewModels, THE Scene_Layout SHALL give a Variant that depends only on the Card's floor and position, and not on its `path`, `score`, `reason`, `state` or `canStart`. This is checked by the property-based test of Requirement 23.5.

#### Edge cases

- The sirv sample has 4 attic ghosts: they get Wisp Variants 0, 1, 2 and 3.
- A live report with 5 ghosts on one floor gets Variants 0 to 4 of that floor's Ghost_Type.
- A floor with no Cards draws no ghost. The positions on the other floors do not change.
- A report with 1 attic ghost and 1 basement ghost: both get Variant 0, the first a Wisp and the second a Chained_Brute.
- A Card changes from Haunted to Exorcised, or is Locked: its Variant stays the same, because the Variant does not depend on `state`.
- The same path appears in the sample and, at another position, in a live report: it may get another Variant, because the Variant is not tied to the path.
- The Lantern_Wraith and the Chained_Brute appear in a Ghost_Scene only when their ghost has Ghost_Content. With the committed Demo_Script only Wisps can be exorcised; the Gallery shows the other two (Requirement 24).
- Which Variant the Ghost_Scene and the Bestiary draw: see Open question 23.

### Requirement 6: Ghost states

**User Story:** As a judge, I want to see at once which ghosts are haunting, which are locked and which are gone, so that I know what I can still do.

#### Acceptance Criteria

1. WHILE a Card is Haunted, THE Scenic_Renderer SHALL draw its ghost in its Ghost_Slot with a cold blue glow whose colour comes from a Scenic_Tokens custom property.
2. WHILE Reduced_Motion is off, WHILE a Card is Haunted, THE Scenic_Renderer SHALL play its ghost's idle animation.
3. WHILE a Card is Locked, THE Scenic_Renderer SHALL draw its ghost in its Ghost_Slot sealed inside a padlocked glass lantern or behind bars (see Open question 25).
4. WHILE a Card is Locked, THE Scenic_Renderer SHALL show `card.lockedLine` (which equals `POWER_TEXTS.lockedGhost`) as visible text only while its Nameplate is hovered by the pointer or has keyboard focus.
5. WHILE a Card is Locked, THE Scenic_Renderer SHALL give its Nameplate an accessible name that contains `card.lockedLine`, whether or not the Nameplate is hovered or focused.
6. WHILE a Card is Locked, THE Scenic_Renderer SHALL make its Nameplate reachable with the Tab key and focusable by a tap, even though the Card has no start control (see Open question 25).
7. WHILE a Card is Exorcised, THE Scenic_Renderer SHALL draw no ghost in its Ghost_Slot.
8. WHILE a Card is Exorcised, THE Scenic_Renderer SHALL draw a lit candle and a warm orange light in its Ghost_Slot, with the light colour coming from a Scenic_Tokens custom property.
9. THE Scenic_Renderer SHALL give every Nameplate it draws a `data-ghost-state` attribute whose value equals the Card's `state` (`haunted`, `locked` or `exorcised`) in every render, and that does not depend on CSS, Variant or Reduced_Motion.
10. WHEN a Card's `state` changes between two renders, THE Scenic_Renderer SHALL update that Nameplate's `data-ghost-state` in the same render, and SHALL end with the drawing of the new state in its Ghost_Slot (for the timing of the Exorcised_Moment, see Open question 5).

#### Edge cases

- A live report: every Card is Haunted (`buildLiveHouse`), so no lantern, no bars and no candle appear.
- A Locked Card on a touch screen has no hover: the locked line shows when a tap on the Nameplate gives it focus, and hides when the Nameplate loses focus.
- Under Reduced_Motion a Haunted ghost has no idle animation but keeps its cold glow (criteria 1 and 2).
- When the Demo_Script is invalid (`script: null`), every sample Card is Locked, so every Ghost_Slot shows a sealed ghost and every Nameplate carries `data-ghost-state="locked"` (see Open question 6 for the Finale).
- Where Nameplates are drawn (House_Scene, Floor_Scene or both) is not decided here (see Open question 4). Criteria 4 to 6 and 9 apply to every Nameplate the Scenic_Renderer draws.

### Requirement 7: Bestiary

**User Story:** As a judge, I want a small guide to the three kinds of ghost, so that I know what the basement ghost looks like even when the sample basement is empty.

#### Acceptance Criteria

1. THE Bestiary SHALL show exactly three entries, one per Ghost_Type, in the order Wisp, Lantern_Wraith, Chained_Brute, in every render of the Scenic_Renderer in which the HUD is shown (Requirement 4.12).
2. THE Bestiary SHALL show in each entry the Ghost_Type name, the floor title of its floor from `TEXTS.floorTitles` (Wisp: attic, Lantern_Wraith: middle floor, Chained_Brute: basement) and its difficulty range: Attic 0 to 33, Middle floor 34 to 66, Basement 67 to 100.
3. THE Bestiary difficulty ranges SHALL match the boundaries of `floorOf` in Core: for each range, `floorOf` of its lowest and its highest number returns the floor of that entry.
4. THE Bestiary SHALL draw each Ghost_Type in the Haunted look and never in the Locked or Exorcised look. This holds for any shown report, any Card states and any Scene, including the case where every Card is Locked (`script: null`) or every Card is Exorcised.
5. THE Bestiary SHALL show its names, floor titles and ranges as real HTML text (not text inside an SVG and not an image), taken from `texts.ts` (new Bestiary texts are additions only, Requirement 2.2; see Open question 10).

#### Edge cases

- The sample basement is empty: the Chained_Brute entry is still shown, in the Haunted look.
- A live report with no ghost on one or two floors: all three entries are still shown.
- On a screen 390 px wide or narrower, the Bestiary may be folded behind a real HTML button. If it is folded, that button is reachable with Tab and opens it with Enter or Space, and every entry text is reachable with the keyboard after it opens. At 360 px the folded or open Bestiary causes no horizontal scroll (Requirement 19.4; see Open questions 15 and 26).
- Under Reduced_Motion the Bestiary drawings do not move but keep the Haunted look (same rule as Requirement 6).

### Requirement 8: Floor scene and Camera

**User Story:** As a judge, I want to walk into one floor and read each ghost's nameplate, so that I can pick a ghost to exorcise.

#### Acceptance Criteria

1. WHILE Reduced_Motion is off, WHEN a render has `transition.to.kind` `"floor"`, THE Camera SHALL move, in one animation lasting between 0.6 s and 0.8 s, to a framing in which the whole floor `transition.to.floor` is inside the scene area (Requirement 18.2 covers Reduced_Motion; see Open question 27).
2. WHILE `scene.kind` is `"floor"`, THE Scenic_Renderer SHALL keep the two floors other than `scene.floor` drawn, with lower opacity or brightness than `scene.floor` (see Open question 4).
3. WHILE `scene.kind` is `"house"` or `"floor"`, THE Scenic_Renderer SHALL show one Nameplate per Card of the focused floors, in report order, as real HTML. Each Nameplate SHALL contain `card.path` unchanged, the difficulty as `TEXTS.scoreLine(card.score)` ("Difficulty: N of 100") and the state label `TEXTS.ghostStateLabels[card.state]` (see Open questions 3 and 4).
4. WHILE a Card has `canStart` true, THE Nameplate of that Card SHALL hold exactly one real HTML button labelled `TEXTS.actionLabels["start-ghost"]`. Activating it by click or keyboard SHALL dispatch `{ type: "start-ghost", path: card.path }`.
5. WHILE a Card has `canStart` false, THE Nameplate of that Card SHALL hold no start button.
6. WHILE `scene.kind` is `"house"` or `"floor"` and a floor's `emptyLine` is not `null`, THE Scenic_Renderer SHALL draw a chained door on that floor and show `emptyLine` (which equals `TEXTS.emptyFloor`) unchanged as real HTML text.
7. WHILE `go-to-house` is in Available_Actions, THE Scenic_Renderer SHALL show exactly one real HTML button labelled `TEXTS.actionLabels["go-to-house"]` ("Back to the house") that dispatches `go-to-house`. WHILE `go-to-house` is not in Available_Actions, THE Scenic_Renderer SHALL show no such button.
8. WHILE Reduced_Motion is off, WHEN a render has `transition.to.kind` `"house"` and `transition.from.kind` `"floor"`, THE Camera SHALL move, in one animation lasting between 0.6 s and 0.8 s, back to a framing in which the whole Cutaway_House is inside the scene area.
9. WHILE `scene.kind` is `"floor"`, THE Floor_Scene SHALL carry a `data-floor` attribute whose value equals `scene.floor` (`attic`, `middle floor` or `basement`) and stays the same across renders of that Scene.
10. WHEN a render has `transition` `null`, THE Camera SHALL keep its current framing and start no Camera animation.
11. WHEN a render with a new `transition` arrives while a Camera animation is still running, THE Camera SHALL drop that animation and end on the framing of the newest render's `scene`.

#### Edge cases

- A new report (live result, fallback, "Show the sample again") always sets the Scene to `house` (`page.ts`). If the judge was on a floor, the Camera goes back to the whole house (criterion 8).
- The judge clicks two floors quickly: the Camera ends on the floor of the last render (criterion 11).
- The judge is on a floor while a live analysis ends: the Logic_Layer sets the Scene to `house` (known Low in `PLAN.md`, "go-to-floor sigue disponible durante un análisis en vivo"), and the Camera follows the model.
- In a Floor_Scene, `go-to-floor` for the focused floor is not in Available_Actions, so that floor has no floor button.
- The first render has `transition` `null` and `scene.kind` `"house"`: the Camera starts on the whole Cutaway_House with no animation.
- A floor of a live report can have no Cards. The chained door and `TEXTS.emptyFloor` show the same way as for the sample.

### Requirement 9: Telephone

**User Story:** As a judge, I want an old telephone that rings when a ghost is waiting, so that I know what to do next without reading instructions.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL draw the Telephone on the telephone table of the Entrance_Hall as an original antique desk telephone, with no logo, no film character and no sound.
2. WHILE `house.source` is `"sample"` and the Telephone_Target exists, THE Telephone SHALL be Ringing.
3. WHEN the Scenic_Renderer receives a ViewModel with `house.source` `"live"` and `status.kind` `"done"`, and the ViewModel it received just before had `status.kind` `"busy"`, THE Telephone SHALL start Ringing. It SHALL keep Ringing until the judge activates the Answer_Button or a later ViewModel shows a different report, meaning a different `house.source` or a different list of Card paths (see Open question 8).
4. WHILE neither criterion 2 nor criterion 3 applies, THE Telephone SHALL be still: no shake, no vibration lines, no orange glow and no "RING!" bubble.
5. WHILE `scene.kind` is `"house"` or `"floor"`, THE Scenic_Renderer SHALL show the Answer_Button over the Telephone. The Answer_Button is a real HTML button with the visible label "Answer the phone" (a new text in `texts.ts`), and the label is the same whether the Telephone is Ringing or still.
6. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL NOT show the Answer_Button and SHALL NOT include it in the tab order.
7. WHEN the judge activates the Answer_Button while `house.source` is `"sample"` and the Telephone_Target exists, THE Scenic_Renderer SHALL dispatch exactly one `{ type: "start-ghost", path }`, with the path of the Telephone_Target.
8. WHEN the judge activates the Answer_Button while `house.source` is `"live"`, THE Scenic_Renderer SHALL show `house.powerLine` (which equals `POWER_TEXTS.liveReport`) as the caller's words and SHALL dispatch no UserAction.
9. WHEN the judge activates the Answer_Button while the Telephone is still, THE Scenic_Renderer SHALL show the text "The line is quiet." (a new text in `texts.ts`) and SHALL dispatch no UserAction (see Open question 28).
10. WHILE Reduced_Motion is on and the Telephone is Ringing, THE Telephone SHALL show the "RING!" bubble and the orange glow, both without movement, pulsing or fading, and SHALL show no shake and no vibration lines.
11. WHILE the Telephone is Ringing, THE accessible name of the Answer_Button SHALL start with "Answer the phone" and SHALL also say that the telephone is ringing. WHILE the Telephone is still, the accessible name SHALL start with "Answer the phone" and SHALL NOT say that it is ringing. The accessible name SHALL update in the same render in which the Telephone changes between Ringing and still.

#### Edge cases

- At load the sample has 2 Cards with `canStart`, so the Telephone rings at once.
- While a live analysis runs (`status.kind` `"busy"`), every `canStart` is false (`startAllowed` is false while busy), so the sample Telephone stops Ringing, and answering shows "The line is quiet."
- After both Scripted_Ghosts are exorcised, no Card has `canStart`: the Telephone is still and answering shows "The line is quiet."
- A Scripted_Ghost ended in `failed` and the judge went back to the list: its Card has `canStart` true again (step `failed` accepts `pick-ghost`), so the Telephone rings again.
- A live analysis ends with a show-message error (`status.kind` `"error"`) or the fallback (`status.kind` `"fallback"`): criterion 3 does not apply. After the fallback, the sample rule of criterion 2 applies.
- The sample cannot be loaded (`status.text` is `TEXTS.sampleBroken`, `available` is empty): neither criterion 2 nor criterion 3 applies, so the Telephone is still, and answering shows "The line is quiet." and dispatches nothing.
- The judge activates the Answer_Button with the keyboard (Enter or Space): the result is the same as a pointer activation (criteria 7 to 9).

### Requirement 10: Exorcism scene and Grimoire

**User Story:** As a judge, I want the exorcism to look like a close encounter with the ghost, so that answering questions feels like a game while all the text stays readable.

#### Acceptance Criteria

1. WHILE `scene.kind` is `"ghost"`, THE Scenic_Renderer SHALL draw a close-up room with one large ghost on one side and the Grimoire on the other side. The ghost's Ghost_Type comes from `ghost.floor`: Wisp for the attic, Lantern_Wraith for the middle floor, Chained_Brute for the basement (see Open question 23).
2. WHILE `scene.kind` is `"ghost"`, THE Grimoire SHALL show the following as real HTML text (not SVG text): the heading `TEXTS.ghostHeading(ghost.path)`; `ghost.judgeLine`; `ghost.reading.text` under the title `TEXTS.readingTitles[ghost.reading.kind]`; `ghost.question` under the title `TEXTS.questionTitle(ghost.questionNumber)`; `ghost.revealedAnswer` under the title `TEXTS.revealedTitle`; and `ghost.prompt`. A field that is `null` is shown with no title (see Open question 29).
3. WHILE `ghost.showAnswerBox` is true, THE Grimoire SHALL show the Answer_Box with an HTML label `TEXTS.answerLabel` linked to it. WHILE `ghost.showAnswerBox` is false, THE Grimoire SHALL show no Answer_Box.
4. WHILE `scene.kind` is `"ghost"`, THE Grimoire SHALL show one real HTML button, drawn as a game-style choice, for each ghost action in Available_Actions (`explanation-continue`, `show-model-answer`, `dont-know`, `retry`, `back-to-list`, `leave-ghost`, `rate`, `self-check`), in the order of Available_Actions. Each button is labelled `TEXTS.actionLabels[type]`, or `TEXTS.actionLabels.rate[rating]` for `rate`, or `TEXTS.actionLabels["self-check"][answer]` for `self-check`. THE Grimoire SHALL show no button for a ghost action that is not in Available_Actions.
5. WHEN the judge activates a ghost-action button, THE Scenic_Renderer SHALL dispatch exactly the UserAction of that Available_Actions entry, once.
6. WHILE `ghost.code` is not `null`, THE Grimoire SHALL show the Code_Block with the full `ghost.code` text, unchanged and not cut short, with `tabindex="0"`, a maximum height taken from the Scenic_Tokens, and its own vertical scroll when the text is taller than that height. WHILE `ghost.code` is `null`, THE Grimoire SHALL show no Code_Block.
7. WHILE `ghost.licenceNextToCode` is true and `licence` is not `null`, THE Grimoire SHALL show the Licence_Notice inside the Grimoire, directly after the Code_Block (web-demo Requirement 10.2).
8. WHILE `scene.kind` is `"ghost"`, THE Ghost_Scene SHALL draw exactly three Question_Candles.
9. WHILE `scene.kind` is `"ghost"`, THE Ghost_Scene SHALL draw this number of lit Question_Candles, with all the other candles unlit: 0 when `ghost.step` is `explaining`; `ghost.questionNumber - 1` when it is `asking` or `simplifying`; `ghost.questionNumber` when it is `model-answer`; 3 when it is `self-check`; 0 when it is `failed`.
10. WHEN two renders in a row both have `ghost.showAnswerBox` true with the same `ghost.path` and `ghost.questionNumber`, THE Scenic_Renderer SHALL keep the same Answer_Box element, so the typed text stays. WHEN a render has `ghost.showAnswerBox` true and the previous render had a different ghost path, a different question number, or no Answer_Box, THE Scenic_Renderer SHALL show a new, empty Answer_Box. This is the same rule as the Simple_Renderer.
11. THE Scenic_Renderer SHALL never read the `value` of the Answer_Box and SHALL never add an `input` or `change` listener to it (web-demo Requirement 6.23).

#### Edge cases

- In `self-check` and `failed`, `ghost.code` is `null`, so there is no Code_Block and no Licence_Notice next to it. The Licence_Notice in the HUD stays.
- A very long Ghost_Text scrolls inside the Code_Block. The Code_Block never grows taller than its maximum height, and the full text can be reached by scrolling.
- An empty Ghost_Text gives an empty Code_Block, and the reading still shows.
- After a second "I don't know" the step is `model-answer`. The current question counts as finished, so its candle is lit.
- A retry starts again with 0 lit candles and, on question 1, a new empty Answer_Box.
- After `simplifying`, going back to `asking` for the same question shows a new empty Answer_Box, because `simplifying` has no Answer_Box. The Simple_Renderer behaves the same way.
- `ghost.revealedAnswer` appears in `asking` after "show model answer", and the Answer_Box stays visible next to it.

### Requirement 11: Ghost reactions

**User Story:** As a judge, I want the ghost to react to my answers, so that the exorcism feels alive.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL start a Reaction only in the Ghost_Scene and only for a UserAction that the Scenic_Renderer itself dispatched while that action was in Available_Actions.
2. WHEN the Scenic_Renderer dispatches `{ type: "rate", rating: "right" }` ("Got it"), THE ghost SHALL recoil and SHALL end the Reaction with a lower opacity than before the action, never below 40 %.
3. WHEN the Scenic_Renderer dispatches `{ type: "rate", rating: "half-right" }` ("Partly"), THE ghost SHALL shudder and SHALL end the Reaction with the same size and opacity as before the action.
4. WHEN the Scenic_Renderer dispatches `{ type: "rate", rating: "wrong" }` ("Missed it"), THE ghost SHALL laugh and SHALL end the Reaction at a larger size than before the action, never above 130 % of its starting size.
5. WHEN the Scenic_Renderer dispatches `{ type: "dont-know" }` ("I don't know"), THE ghost SHALL tilt its head and a smoke "?" SHALL appear and be gone by the end of the Reaction, with the ghost's size and opacity unchanged.
6. WHEN a render has `ghost.step` `"failed"` and the previous render did not, THE Question_Candles SHALL show 0 lit candles (Requirement 10.9) and THE ghost SHALL return to 100 % of its starting size.
7. WHEN the Scenic_Renderer dispatches `start-ghost` or `retry`, THE Scenic_Renderer SHALL set the ghost to 100 % of its starting size and 100 % opacity before any later Reaction.
8. WHEN a Reaction ends, THE Ghost_Scene SHALL show the drawing that the latest ViewModel describes (step and Question_Candles), with the size and opacity set by criteria 2 to 7.
9. THE Scenic_Renderer SHALL keep every Reaction as visual state of the Scenic_Renderer only, like the Answer_Box: a Reaction SHALL NOT dispatch a UserAction, change the ViewModel, move focus, or delay or change the texts and controls of the Grimoire, which SHALL show the latest ViewModel in the same render and stay usable while the Reaction plays.
10. THE Scenic_Renderer SHALL end each Reaction within 1,000 ms of the dispatch that started it.
11. IF the Scenic_Renderer dispatches a new UserAction while a Reaction plays, THEN THE Scenic_Renderer SHALL jump the playing Reaction to its end state and start the Reaction of the new action, if it has one.

#### Edge cases

- The label "Partly" is used both by `rate` `half-right` and by `self-check` `half` (`TEXTS.actionLabels`). Only the `rate` action starts the shudder Reaction.
- No UserAction other than those in criteria 2 to 5 starts a Reaction. `start-ghost` and `retry` only reset the ghost (criterion 7).
- An action that is not in Available_Actions starts no Reaction, even if a stale control sends it.
- Repeated "Missed it" or "Got it" answers in one attempt stop at the 130 % size limit and the 40 % opacity limit (proposed values, see Open question 30).
- The third rating moves the step to `self-check` or `failed` in the same render. The Grimoire shows the new step at once (criterion 9). The ghost plays the Reaction and then shows the end state of the new step (criterion 8). For `self-check`, see Open question 5.
- Under Reduced_Motion, each Reaction is replaced by an opacity fade of 200 ms or less, and the smoke "?" fades in and out (Requirement 18). The end size and opacity are the same as with Reduced_Motion off.
- A reload or switching the view loses the Reaction state and the ghost's size and opacity, because they are visual only.

### Requirement 12: Exorcised moment

**User Story:** As a judge, I want a clear reward when I exorcise a ghost, so that I feel the code is now mine.

#### Acceptance Criteria

1. WHEN two consecutive renders have the same `house.source`, and a Card with the same `path` has state `"haunted"` in the first render and `"exorcised"` in the second, THE Scenic_Renderer SHALL start the Exorcised_Moment for that Card in the second render (see Open question 5).
2. IF the previous render has a different `house.source`, or has no Card with that `path`, or that Card's state in the previous render is not `"haunted"`, THEN THE Scenic_Renderer SHALL show the Card as Exorcised without playing the Exorcised_Moment.
3. WHILE Reduced_Motion is not set, THE Exorcised_Moment SHALL show the ghost drawing moving upward in a spiral and then splitting into orange spark shapes, after which that ghost drawing is no longer shown (Reduced_Motion behaviour is in Requirement 18).
4. THE Exorcised_Moment SHALL change the light of the area where it plays from the cold blue colour of the Scenic_Tokens to the warm orange colour of the Scenic_Tokens in 1.0 s to 1.4 s, measured from the render that starts it, and the warm orange light SHALL stay after the moment ends (see Open question 5 for which area).
5. WHILE the House_Scene is shown, THE Scenic_Renderer SHALL draw the window of the Ghost_Slot of every Exorcised Card lit in the warm orange colour of the Scenic_Tokens, and the window of every Haunted or Locked Card unlit.
6. WHEN `house.progress` is not `null` in two consecutive renders and `house.progress.share` differs between them, THE Haunt_Meter SHALL animate its filled part from the old `share` to the new `share` and end at exactly the new `share`.
7. IF `house.progress` was `null` in the previous render, THEN THE Haunt_Meter SHALL show the new `house.progress.share` without animating from any earlier value.
8. THE Scenic_Renderer SHALL start the Exorcised_Moment at most once per Haunted-to-Exorcised change of a Card: later renders in which that Card stays Exorcised SHALL NOT start it again, and neither SHALL a Scene change or a Transition.

#### Edge cases

- The change happens in the render where the step becomes `self-check`, while the Ghost_Scene is open (`engine.ts`, `nextQuestion`).
- The judge answers "Not yet" in the self-check: the ghost stays Exorcised (the engine only records the self-check answer). No second Exorcised_Moment plays, and the window stays lit.
- "Show the sample again" after a live report: the sample Cards come back already Exorcised. This is not a change from Haunted (the previous render had `house.source` `live`), so no Exorcised_Moment plays. Their windows are lit at once, and the Haunt_Meter shows the share without animating (criteria 2, 5 and 7).
- A live report: `house.progress` is `null` and no live Card can become Exorcised, so neither the Exorcised_Moment nor the Haunt_Meter animation plays (see Open question 7).
- Locked Cards never change to Exorcised, so they never play the Exorcised_Moment.
- A render arrives while the Exorcised_Moment still plays: see Open question 31.

### Requirement 13: Demo complete finale

**User Story:** As a judge, I want an ending when I have done everything the demo allows, so that I know the demo is complete and what to do next.

#### Acceptance Criteria

1. WHILE `house` is not `null`, `house.source` is `"sample"` and every Card of `house.floors` is Locked or Exorcised (no Card is Haunted), THE Scenic_Renderer SHALL show the Finale (see Open question 6).
2. WHILE the condition of criterion 1 is false, THE Scenic_Renderer SHALL NOT show the Finale or its banner, and SHALL draw the sky, rain and horizon of the House_Scene as in Requirement 3.3.
3. WHILE the Finale is shown, THE Scenic_Renderer SHALL draw no rain, SHALL draw the clouds moved apart from the moon and the horizon, and SHALL paint the horizon with a dawn orange colour defined in Scenic_Tokens.
4. WHILE the Finale is shown and `house.houseClean` is `null`, THE Finale SHALL show a banner as real HTML text (not text inside the SVG) with two lines: one saying that the demo is complete (a new text in `texts.ts`), and one saying that the other ghosts wait for the user's own Kiro (a new text in `powerTexts.ts`, because it names the Power).
5. WHILE `house.houseClean` is not `null`, THE Scenic_Renderer SHALL show the same Finale as criteria 3 and 4, with the banner text `house.houseClean` (which equals `TEXTS.houseClean`) in place of the two lines of criterion 4 (see Open question 32).
6. THE Scenic_Renderer SHALL decide whether the Finale is shown from the current ViewModel only (the Finale flag of Scene_Layout): two equal ViewModels SHALL give the same decision, whatever was rendered before, and no new ViewModel field SHALL be added (property test in Requirement 23.7).

#### Edge cases

- The committed sample: after both Scripted_Ghosts are exorcised, 2 Cards are Exorcised and 3 are Locked, so the Finale shows; `house-clean` is never reached.
- A live report: every Card is Haunted, so no Finale.
- The Finale is shown and the judge runs a live analysis: when the live report arrives, `house.source` is `"live"`, so the Finale goes away and the rain comes back (criterion 2).
- After that, "Show the sample again": the sample Cards come back already Exorcised, so the Finale shows again.
- An invalid Demo_Script makes every sample Card Locked at load, so the condition of criterion 1 is true before anything was done (see Open question 6).
- `house` is `null` (no report shown yet): no Finale.
- `house-clean` is reached only in tests with a generated Demo_Script for every ghost. `house.houseClean` is not `null` only when no Card is Haunted, so criterion 5 never shows a banner without the Finale scene of criterion 3.
- Reduced_Motion: the Finale appears as a fade, with the same end state (Requirement 18).

### Requirement 14: Live analysis in the scene

**User Story:** As a judge, I want to see that the page is searching my repository, so that I wait without thinking the page froze.

#### Acceptance Criteria

1. WHILE `live.busy` is true, THE Scenic_Renderer SHALL show the Search_Beam in the House_Scene or Floor_Scene that `scene` describes.
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
- The analysis ends with `status.kind` `"done"`. The Search_Beam is gone. For the Telephone and the Power line, see Open questions 2 and 8.
- The Ghost_Scene cannot be open while busy. `live.formVisible` is false there, so no analysis can start from it, and `canStart` is false for every Card while busy, so no ghost can be opened.
- How long one sweep of the Search_Beam takes and whether it loops: see Open question 33.

### Requirement 15: Lightning

**User Story:** As a judge, I want lightning that makes the house feel alive, and a way to turn it off, so that it adds mood without bothering me.

#### Acceptance Criteria

1. WHILE the Lightning_Toggle is on and Reduced_Motion is off, THE Scenic_Renderer SHALL show a Lightning flash over the Cutaway_House, with each new flash starting 10 s to 15 s (inclusive) after the previous one started. A new render of the ViewModel SHALL NOT restart or skip this interval (see Open question 34).
2. WHEN the Lightning_Toggle turns on, or the Web_Page loads with the Lightning_Toggle on, while Reduced_Motion is off, THE Scenic_Renderer SHALL start the first Lightning flash 10 s to 15 s (inclusive) later.
3. THE Lightning SHALL flash at most 3 times in any period of 1 s (WCAG 2.3.1). Each light-to-dark change counts as one flash.
4. THE HUD SHALL show the Lightning_Toggle as a real HTML `button` element. Its visible text SHALL be exactly "Lightning: on" when the Lightning_Toggle is on and exactly "Lightning: off" when it is off (new texts in `texts.ts`). Its `aria-pressed` SHALL be `"true"` when it is on and `"false"` when it is off.
5. WHEN the judge activates the Lightning_Toggle by pointer, Enter or Space, THE Scenic_Renderer SHALL flip it from on to off or from off to on, update its text and `aria-pressed` in the same frame, keep focus on the Lightning_Toggle, and dispatch no UserAction.
6. WHEN the Lightning_Toggle turns off, THE Scenic_Renderer SHALL start no new Lightning flash, and any flash already showing SHALL end within 1 s.
7. THE Scenic_Renderer SHALL keep the Lightning_Toggle state only in memory: no storage, cookie or page address change. WHEN the Web_Page loads, THE Lightning_Toggle SHALL be on (for the case where Reduced_Motion is on, see Open question 16).
8. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL show no Lightning flash, whatever the Lightning_Toggle state (see Open question 16).

#### Edge cases

- A reload turns the Lightning on again, because nothing is saved (web-demo Requirement 9).
- The judge acts every few seconds, so renders happen often. Flashes still come every 10 s to 15 s (criterion 1).
- The judge turns the Lightning_Toggle off during a flash. The flash ends within 1 s and no new flash starts (criterion 6).
- Reduced_Motion turns on while the page is open. From that moment no new flash starts (criterion 8). What the Lightning_Toggle shows is Open question 16.
- The Finale is shown: the rain has stopped. The design decides whether Lightning still flashes.

### Requirement 16: Intro (optional priority)

**User Story:** As a judge, I want the house to open like a doll's house when I arrive, so that the first moment feels like the start of a game.

#### Acceptance Criteria

1. WHERE the Intro is built, WHEN the Scenic_Renderer draws the House_Scene for the first time after a page load, THE Scenic_Renderer SHALL open the facade of the house like two doors in a time between 1.3 s and 1.7 s and then show the open Cutaway_House with no part of the facade left over the scene.
2. WHERE the Intro is built, WHEN the House_Scene is shown again later in the same page load (for example after the judge comes back from a Floor_Scene), THE Scenic_Renderer SHALL show the open Cutaway_House at once and SHALL NOT play the Intro again.
3. WHERE the Intro is built, WHEN the judge presses any key, clicks or taps anywhere on the page during the Intro, THE Scenic_Renderer SHALL end the Intro within 100 ms with no closing animation, show the open Cutaway_House, and let that same key, click or tap have its normal effect (for example Tab moves focus, a click on a HUD control activates it) (see Open question 35).
4. WHERE the Intro is built, WHILE the Intro plays, THE HUD SHALL stay visible and not covered by the facade, and every HUD control SHALL be focusable and work as it does after the Intro.
5. WHERE the Intro is built, WHEN the Logic_Layer calls `render` during the Intro, THE Scenic_Renderer SHALL apply that ViewModel to the HUD and the Status_Region in that same call, so that the Intro never delays a render of the Logic_Layer (web-demo Requirement 18.4).
6. WHERE the Intro is built, WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL skip the Intro and show the open Cutaway_House in the first render.

#### Edge cases

- The page loads with a broken sample: the Intro still plays once, or the first key, click or tap ends it.
- The first key press is Tab: the Intro ends and focus moves normally (criterion 3).
- The judge clicks the facade itself, not a control: the Intro ends and nothing else happens.
- Reduced_Motion turns on while the Intro plays: the Intro ends at once and the open Cutaway_House is shown.
- The Intro plays once per page load only. Nothing is stored, so a reload plays it again (Out of Scope: saving "Intro seen").

### Requirement 17: Accessibility

**User Story:** As a judge who uses a keyboard or a screen reader, I want to do everything the mouse can do, so that the game look never locks me out.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL place every interactive control (button, link, form control, and the focusable Locked Nameplate) as a real HTML element outside every `svg` element, and SHALL place no link, form control, button or element with a `tabindex` attribute inside any `svg` element.
2. THE Scenic_Renderer SHALL set `aria-hidden="true"` on every `svg` element it inserts in the Web_Page.
3. THE Scenic_Renderer SHALL give each Nameplate an accessible name made of the Card's path, its floor value (`attic`, `middle floor` or `basement`), its difficulty and its state label, in this order and in the form "bench/static.js, attic, difficulty 7 of 100, haunted" (a new text template in `texts.ts`), where N in "difficulty N of 100" is `card.score` (an integer from 0 to 100).
4. WHILE `scene.kind` is `"house"` or `"floor"`, THE Scenic_Renderer SHALL put the focusable elements in this keyboard tab order: the HUD controls, then the Answer_Button, then the floor buttons, then each Nameplate followed by its start button (if it has one), in report order. The tab order SHALL come from document order alone, with no `tabindex` value greater than 0 (see Open questions 4 and 36).
5. WHEN an element of the Scenic_Renderer gets keyboard focus, THE Scenic_Renderer SHALL show around it a visible orange focus ring at least 2 px thick, with its colour taken from a Scenic_Tokens custom property and a contrast ratio of at least 3:1 against the colours next to it.
6. WHEN a render removes or replaces the element that had keyboard focus, THE Scenic_Renderer SHALL, before that render returns, put focus on an element that is still in the document and is not `body`.
7. WHEN a render has a Transition that is not `null`, THE Scenic_Renderer SHALL move keyboard focus to the target picked by the focus rule of Open question 1. The brief's version of that rule is: the heading of the new Scene, keeping the rule of `focusAfterRender` in `src/view/simple/focus.ts`.
8. THE Scenic_Renderer SHALL draw all text of the HUD, the Answer_Button, the Nameplates, the Grimoire (including the Code_Block) and the Finale banner with a contrast ratio of at least 4.5:1 (WCAG AA) between the text colour and the solid background colour directly behind that text. Both colours are Scenic_Tokens values.
9. THE Scenic_Renderer SHALL give every button and link a rendered touch target of at least 44 CSS px by 44 CSS px at every viewport width from 360 px up.

#### Edge cases

- Mist `#6F7F92` on Night `#0B111B` is about 4.6:1, so it passes. Mist on Slate `#202D3B` is about 3.4:1 and fails, so Mist cannot be used for text on Slate.
- A Locked Nameplate has no action, but the keyboard must still reach it so its locked line can be read (Requirement 6.4). Its accessible name keeps the criterion 3 form and also contains `card.lockedLine` (Requirement 6.5).
- The scores 0 and 100 read "difficulty 0 of 100" and "difficulty 100 of 100".
- The Telephone_Target is none: the Answer_Button stays in the tab order, in the same place (Requirement 9.5 and 9.9).
- In a Floor_Scene, the focused floor has no floor button (`go-to-floor` for it is not in Available_Actions), so the tab order goes straight from the other floor buttons to the Nameplates.
- A screen reader user never hears the SVG. Every meaning (state, floor, Ringing) is also in HTML text or in an accessible name.

### Requirement 18: Reduced motion

**User Story:** As a judge who is sensitive to motion, I want a calm version of the scene, so that I can use the demo without discomfort.

#### Acceptance Criteria

1. WHERE the Intro is built, WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL skip the Intro and show the open Cutaway_House from the first frame (Requirement 16.6).
2. WHILE Reduced_Motion is on, WHEN a render has a Transition, THE Camera SHALL show the new framing with no movement and no zoom, instead of the 0.6 s to 0.8 s move of Requirements 8.1 and 8.8.
3. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL run no animation or transition that moves, rotates, scales or shakes an element. This means no shaking, no bobbing, no idle animation, no drifting fog, no falling rain, no Search_Beam sweep (Requirement 14.6), and no Telephone shake or vibration lines (Requirement 9.10).
4. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL show no Lightning, whatever the state of the Lightning_Toggle (Requirement 15.8; see Open question 16).
5. WHILE Reduced_Motion is on, THE Scenic_Renderer SHALL limit every animation and transition to one opacity change that lasts 200 ms or less and does not repeat.
6. WHILE Reduced_Motion is on, WHEN the Exorcised_Moment or the Finale starts, THE Scenic_Renderer SHALL replace its motion with an opacity fade of 200 ms or less. The fade SHALL end in the same state as with Reduced_Motion off: the lit candle and warm orange area of the Exorcised_Moment (instead of the 1.0 s to 1.4 s change of Requirement 12.4), and the stopped rain, parted clouds and dawn horizon of the Finale.
7. WHILE Reduced_Motion is on, THE Web_Page SHALL show, for the same ViewModel, the same texts, the same controls with the same accessible names, and the same Card states as with Reduced_Motion off.
8. WHEN Reduced_Motion changes while the page is open, THE Scenic_Renderer SHALL apply the new setting within 1 s and without a reload. This covers every looping animation (idle animations, fog, rain, Ringing) and every animation that starts after the change.

#### Edge cases

- Reduced_Motion changes while the page is open: looping animations follow the new setting (criterion 8), and the next one-shot animation follows it too.
- Under Reduced_Motion a Haunted ghost keeps its cold glow, and a Ringing Telephone keeps its "RING!" bubble and orange glow, both drawn still (Requirements 6 and 9.10).
- Under Reduced_Motion each Reaction becomes a fade of 200 ms or less (Requirement 11).
- Under Reduced_Motion the Search_Beam is shown still while `live.busy` is true (Requirement 14.6).
- The Lightning_Toggle under Reduced_Motion: see Open question 16.
- Motion stated in other requirements without a Reduced_Motion guard: see Open question 37.

### Requirement 19: Responsive layout

**User Story:** As a judge on a laptop or a phone, I want the scene to fit my screen, so that I can play on either.

#### Acceptance Criteria

1. WHILE the viewport is 1440 px by 900 px at 100% browser zoom and `scene.kind` is `"house"`, THE Web_Page SHALL show the whole Cutaway_House, the whole HUD and every control the House_Scene shows (see Open question 4) inside the viewport, with no vertical and no horizontal page scroll.
2. WHILE the viewport is 390 px by 844 px at 100% browser zoom and `scene.kind` is `"house"`, THE Camera SHALL frame the Cutaway_House so that the attic, the middle floor and the basement are all drawn, no part of the house is clipped, and the house is no wider than the viewport (see Open question 38).
3. WHILE the viewport is 390 px wide at 100% browser zoom and `scene.kind` is `"ghost"`, THE Grimoire SHALL be placed under the Ghost_Scene drawing: its top edge is at or below the bottom edge of the drawing, and it does not cover any part of the drawing.
4. WHILE the viewport is 360 px wide or more, THE Web_Page SHALL have no horizontal page scroll in the House_Scene, the Floor_Scene and the Ghost_Scene (the page is no wider than the viewport). Only the Code_Block may scroll horizontally, inside its own box, for long code lines (web-demo Requirement 12.3; see Open question 15).

#### Edge cases

- A landscape phone (844 px by 390 px): the design decides the framing. Criterion 4 still applies, so there is no horizontal page scroll.
- The browser zoom is 200% on a 1440 px by 900 px window (720 px by 450 px of CSS space): no text is clipped or covered by another element, every control can be reached by scrolling and with the keyboard, vertical page scroll is allowed, and criterion 4 still applies (no horizontal page scroll).

### Requirement 20: Performance and size budget

**User Story:** As a judge on an ordinary laptop or phone, I want smooth animation and a fast load, so that the scene does not stutter.

#### Acceptance Criteria

1. THE Scenic_Renderer CSS SHALL animate only the properties `transform` and `opacity` in every `@keyframes` rule and every `transition`. Every `transition` SHALL name its properties explicitly (no `all` and no shorthand without a property). The Source_Scan checks both rules.
2. THE Scenic_Renderer SHALL apply SVG filters (a CSS `filter` other than `none`, or an SVG `filter` attribute) only to elements where no animation targets the element or any of its descendants. The Shots_Script checks this in every state it captures, using `element.getAnimations({ subtree: true })` (see Open question 39).
3. THE Scenic_Renderer source (every non-test TypeScript file under `src/view/scenic/`) SHALL contain no `requestAnimationFrame` and no `setInterval`, checked by the Source_Scan.
4. WHEN the Shots_Script captures a state, THE Web_Page SHALL have at most 15 animations with `playState` `"running"`, as counted by `document.getAnimations()` at that moment.
5. IF the size total of the files in `packages/web/dist/` and all its subfolders is 300 KB (307,200 bytes) or more, THEN THE Size_Check SHALL fail with a non-zero exit code. The size total is the gzipped size of each `.js`, `.css` and `.svg` file, each file gzipped separately at the default level of Node's zlib, plus the raw file size of each `.woff2` and `.woff` file (see Open questions 12 and 39).
6. WHEN the Size_Check runs, THE Size_Check SHALL print the measured total in bytes and the 307,200-byte limit, whether it passes or fails.
7. THE Size_Check SHALL run on Windows PowerShell and on Linux using only Node.js built-in modules and the project's npm dependencies, with no shell-specific commands.

#### Edge cases

- The ghost texts of sirv are inlined in the JavaScript bundle (`?raw`), so they count in the budget.
- Both renderers are in `dist/`, so both count.
- woff2 fonts barely shrink with gzip, so they count at their full file size, with no gzip.
- A total of exactly 307,200 bytes fails.
- Files with other extensions (`.html`, `.txt` such as `sirv-license.txt`, `.map`) do not count.
- Under Reduced_Motion the same 15-animation limit applies. The count is expected to be lower.

### Requirement 21: Fonts

**User Story:** As the project director, I want two display fonts that fit the theme, bundled with the site, so that the look holds and nothing is loaded from outside.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL render the logo and the tagline of the HUD with Creepster as the first family of their `font-family`.
2. THE Scenic_Renderer SHALL render every heading element (`h1` to `h3`) other than the logo with IM Fell English as the first family of its `font-family`.
3. THE Scenic_Renderer SHALL render all other text, apart from the logo, the tagline and headings, with the system font stack of `--font-body` of the Simple_Renderer tokens, and SHALL never use Creepster for that text (see Open question 40).
4. THE Web_Package SHALL bundle both fonts as local files of the build output in `dist/`, taken from npm packages pinned at exact versions (for example `@fontsource/creepster` and `@fontsource/im-fell-english`, which exist on npm; their current docs are checked in the design).
5. THE Web_Page SHALL load no font from another origin: every font source in the built CSS SHALL be a relative path to a file in the build output, with no `http:`, `https:` or `//` address (web-demo Requirement 11.5).
6. THE Scenic_Tokens SHALL declare each display font as the bundled family followed by a system font stack.
7. IF a font file has not loaded yet or fails to load, THEN THE Web_Page SHALL keep the text visible in the system font stack that follows the font in Scenic_Tokens, with no invisible text at any time and no error shown to the judge.
8. THE repository SHALL credit each font in one committed file, giving the font name, its copyright holder and the SIL Open Font Licence (see Open question 18).

#### Edge cases

- The font has not arrived yet when the first render runs: the text shows in the fallback font and then swaps to the bundled font once it loads (criterion 7).
- Creepster is hard to read in small sizes: it is used only for the logo and tagline, never for body text or code (criteria 1 and 3).
- A font file is missing from `dist/` or blocked by the browser: the page still works, and the text uses the system fallback stack.

### Requirement 22: Art as data and Scenic_Tokens

**User Story:** As the project director, I want the art described as plain data and the colours in one file, so that the art is safe, testable and easy to retune.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL describe every SVG element it creates as Shape_Data: plain data made only of shape kinds, numeric coordinates and class names, with no colour value (no hex value, no colour function and no CSS named colour).
2. THE Scenic_Renderer SHALL create every SVG element with `document.createElementNS` and the SVG namespace `http://www.w3.org/2000/svg`.
3. THE Scenic_Renderer SHALL use none of `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`, and SHALL build no DOM node from a string of markup.
4. THE Scenic_Tokens file SHALL define each of these nine palette colours as the value of one CSS custom property, with the hex value exactly as listed (letter case ignored): Night `#0B111B`, Slate `#202D3B`, Mist `#6F7F92`, Bone `#D5D0C5`, Spectral `#B9CCE6`, Candle `#E6A25C`, Pumpkin `#FF7A1A` (the game accent), Brass `#C47B3D`, Rust `#6E2A1E`.
5. THE Scenic_Tokens file SHALL define as CSS custom properties every colour, size and font family that the Scenic_Renderer CSS uses.
6. THE Source_Scan SHALL apply the Simple_Renderer CSS rules (no literal colour, no literal size, no `font-family` value without `var(`), with the same exemptions (comments, `@media` lines and the text inside `url(...)`), to every CSS file under `src/view/scenic/` except the Scenic_Tokens file. It SHALL fail and name each file that breaks a rule. It SHALL also check that the Scenic_Tokens file exists, is skipped by these rules, and would break the colour rule if it were scanned.
7. THE Source_Scan SHALL fail and name the file when a non-test TypeScript file under `src/view/scenic/` contains a string literal that holds a hex colour, holds a colour function (`rgb(`, `rgba(`, `hsl(`, `hsla(`, `hwb(`, `lab(`, `lch(`, `oklab(`, `oklch(` or `color(`), or is exactly a CSS named colour (letter case ignored).
8. THE Source_Scan rules that already cover all of `src/view/**` (no browser storage, no raw HTML, no external address, Core imported only with `import type`, the word "Power" only in `powerTexts.ts`) SHALL cover `src/view/scenic/` as well. THE Source_Scan SHALL fail if it finds no `.ts` file or no `.css` file under `src/view/scenic/`.
9. THE Source_Scan SHALL include self-check cases for the rule of criterion 7: a hex value, a colour function and a named colour, each inside a TypeScript string, are caught, and a class name such as `"ghost--red-eyes"` is not caught.
10. THE Scenic_Renderer SHALL take graphics only from Shape_Data and from files served by the Web_Page itself, and SHALL load no graphic from an address outside the Web_Page (see Open questions 11 and 41).

#### Edge cases

- The SVG namespace `http://www.w3.org/2000/svg` is already exempt from the external-address rule.
- A class name such as `ghost--red-eyes` is a name, not a colour, as long as no colour word stands alone as a CSS value or as a whole TypeScript string.
- A colour word inside a longer string (for example `"Golden key"` or `"tan-wall"`) is not a literal colour, because criterion 7 matches a named colour only when it is the whole string.
- Comments in scenic files must not contain the word "Power" (the existing rule matches whole words, case-sensitive).
- A `--gap: 8px` declaration outside the Scenic_Tokens file breaks the size rule, because the Simple_Renderer CSS rules also check custom property values.
- Numeric SVG coordinates in Shape_Data have no CSS unit and are not sizes under criterion 5.

### Requirement 23: Properties of the scene layout

**User Story:** As the project director, I want the rules of the scene checked on many generated reports, so that a live repository never breaks the house.

#### Acceptance Criteria

1. THE Scene_Layout SHALL use no DOM API, so that its tests run in the Vitest Node environment with no jsdom or happy-dom installed (web-demo testing strategy).
2. FOR ALL ViewModels with a non-null `house`, THE Scene_Layout SHALL place every Card exactly once, on the floor given by that Card's `floor`. Cards are counted by their position in report order, not by path (property-based test).
3. FOR ALL ViewModels with 1 to 5 Cards on one floor, THE Scene_Layout SHALL give each Ghost_Slot of that floor a rectangle that lies fully inside the rectangle of that floor, and no two Ghost_Slots of that floor SHALL share an area greater than zero. Touching edges are allowed (property-based test).
4. FOR ALL ViewModels whose `scene.kind` is `"house"` or `"floor"`, THE Scene_Layout SHALL give exactly one start control to each Card whose `canStart` is true and no start control to each Card whose `canStart` is false (property-based test; see Open questions 4 and 42).
5. FOR ALL ViewModels, THE Scene_Layout SHALL choose each Card's Variant only from the Card's 0-based position, in report order, among all Cards of its floor, whatever their state. Two Cards at the same position on the same floor in two different ViewModels SHALL get the same Variant, and two Cards of the same floor SHALL get different Variants (property-based test).
6. FOR ALL ViewModels with a non-null `house`, THE Scene_Layout SHALL set the Telephone_Target to the path of the first Card in report order, across all floors, whose `canStart` is true. IF no Card has `canStart` true, or `house` is null, THEN THE Scene_Layout SHALL set no Telephone_Target (property-based test; see Open questions 8 and 42).
7. FOR ALL ViewModels, THE Finale decision of Requirement 13.1 SHALL be true exactly when `house` is non-null, `house.source` is `"sample"` and no Card is Haunted. IF `house` is null, THEN the Finale decision SHALL be false (property-based test; see Open question 6).
8. THE property tests SHALL build ViewModels from the existing generators (`reportArb` of Core and the web test helpers, such as `uniquePathReportArb`). Each property SHALL run at least 100 times, and the generated ViewModels SHALL include both `house.source` values, all three Scene kinds and all three GhostStates.

#### Edge cases

- Report order and floor order differ (for example a middle-floor ghost listed before an attic ghost): the Telephone_Target follows report order across all floors, which is the order of `report.ghosts`. Within a floor, Cards keep report order (web-demo Requirement 3.2), and that order sets each Card's Variant position.
- A report with repeated paths (possible in `reportArb`): the layout still places each Card once, because it counts Cards by position.
- A floor with no Cards: the Scene_Layout gives it no Ghost_Slot, and criteria 3 and 5 hold with nothing to check.
- A live report: no Card has `canStart` true, so no start control and no Telephone_Target come from the Cards, and the Finale decision is false.

### Requirement 24: Visual review tool

**User Story:** As the project director, I want screenshots of every scene and state, so that I can review the art without clicking through the demo by hand.

#### Acceptance Criteria

1. THE root `package.json` SHALL have a script `shots` that runs the Shots_Script.
2. THE Shots_Script SHALL use Playwright at an exact version (no `^` or `~`), added as a devDependency with `package-lock.json` updated in the same commit.
3. THE Check_Script, `npm test` and the CI workflow SHALL NOT run the Shots_Script.
4. WHEN the Shots_Script runs, THE Shots_Script SHALL drive the real page through the sample flow and save one PNG for each of these 16 states: the House_Scene; the Floor_Scene of the attic; the Floor_Scene of the middle floor; the Floor_Scene of the basement (empty in the sample); the Ghost_Scene in step `explaining`; the Ghost_Scene in step `asking`; each of the four Reactions of Requirement 11 ("Got it", "Partly", "Missed it", "I don't know"); the Ghost_Scene in step `failed`; the Exorcised_Moment; the Finale; a live analysis with `live.busy` true; a live report shown after the analysis ends; and Reduced_Motion (see Open questions 13 and 43).
5. THE Shots_Script SHALL save each state of criterion 4 twice, once at a viewport of 1440 px by 900 px and once at 390 px by 844 px, with a different file name for each state and size, and each file name SHALL name both the state and the size.
6. THE Shots_Script SHALL pause every CSS animation and transition at a fixed point before each screenshot. No screenshot may be taken while an animation or transition is still running.
7. THE Shots_Script SHALL write the PNG files into `packages/web/shots/`, replacing any file with the same name from an earlier run, and `.gitignore` SHALL list that folder.
8. WHERE the Vite dev server runs, THE Web_Package SHALL serve the Gallery. The Gallery shows every Ghost_Type (Wisp, Lantern_Wraith, Chained_Brute) in every Variant, each in the Haunted, Locked and Exorcised states, side by side: 3 Ghost_Types × up to 5 Variants × 3 states.
9. THE built output in `packages/web/dist/` SHALL contain no Gallery HTML page and no JavaScript or CSS file that holds Gallery code.
10. WHEN the Shots_Script runs, THE Shots_Script SHALL also save one screenshot of the Gallery at 1440 px by 900 px and one at 390 px by 844 px.
11. THE Shots_Script SHALL run with `npm run shots` in Windows PowerShell and SHALL use only cross-platform Node tools, with no shell-only command (for example `rm -rf`).
12. WHEN every screenshot of criteria 4, 5 and 10 has been saved, THE Shots_Script SHALL exit with code 0 and print the number of PNG files written.
13. IF a step of the Shots_Script fails (for example the page does not reach the expected state), THEN THE Shots_Script SHALL stop, exit with a non-zero code and print a message that names the step that failed. The PNG files already written stay.

#### Edge cases

- The Playwright browser is not installed: the Shots_Script exits with a non-zero code and a message that names the install command.
- The Shots_Script fails half way: the PNG files written before the failure stay in `packages/web/shots/`, and nothing is committed.
- A second run on the same commit overwrites the PNG files of the first run that have the same names.
- `npm run lint` and `npm run format:check` pass when `packages/web/shots/` contains PNG files from a run (lint and Prettier ignore that folder).
- The sample has no basement ghost, so the basement Floor_Scene screenshot shows an empty basement (Requirement 5 edge cases, Requirement 8.6).

### Requirement 25: Web-demo rules still hold

**User Story:** As the project director, I want the new view to keep every promise of the web demo, so that nothing that works today breaks.

#### Acceptance Criteria

1. THE Scenic_Renderer SHALL never read, send, log or store the Answer_Box text, and no Reaction, Scene_Layout result or dispatched UserAction SHALL depend on that text (web-demo Requirement 6.23).
2. THE Web_Package source SHALL use no `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie` in any file the Source_Scan scans: every non-test `.ts`, `.css` and `.svg` file under `src/` (including `src/view/scenic/`) plus `index.html` (web-demo Requirement 9.2).
3. THE Web_Page SHALL load every font, image, style sheet and script from its own site under the GitHub Pages `base` path, and SHALL load none from another origin or a CDN (web-demo Requirement 11.5; external addresses checked by the Source_Scan in `index.html` and `src/view/`; see Open question 44).
4. THE whole word "Power" (case-sensitive) SHALL appear only in `src/logic/powerTexts.ts` among the files the Source_Scan scans, and THE Scenic_Renderer SHALL take every text that mentions the Kiro Power from the Power_Texts (web-demo Requirement 4.13; see Open question 2).
5. WHILE the Code_Block is shown, THE Scenic_Renderer SHALL show the Licence_Notice in the Grimoire directly after the Code_Block, outside the Code_Block's own scroll, so that it stays visible however far the Code_Block is scrolled (web-demo Requirement 10.2).
6. WHEN the Web_Page loads, THE Logic_Layer SHALL make zero network requests (web-demo Requirement 2.2).
7. IF GitHub is unreachable, THEN THE Web_Page SHALL still show the sirv sample in the House_Scene and SHALL let the judge complete the exorcism of every Scripted_Ghost (web-demo Requirement 2).
8. THE Scenic_Renderer SHALL make no network request of its own. Its only fetches SHALL be the same-site static files of criterion 3, loaded by the browser.
9. THE Scenic_Renderer SHALL write every text from the ViewModel with `textContent` or an attribute, and SHALL use no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write` (checked by the Source_Scan).
10. WHEN `npm run check` runs, every test of the Web_Package that existed before this spec SHALL pass with no assertion removed or weakened, and THE Check_Script SHALL perform no network access, including the Size_Check (see Open question 12) and excluding the Shots_Script.
11. WHILE `?view=simple` is used, THE Simple_Renderer SHALL show the same elements, texts and focus behaviour as before this spec, and no scenic style sheet SHALL apply. The only exceptions are those decided in Open questions 1 and 14.

#### Edge cases

- The Kiro Power is renamed before the code freeze: only `powerTexts.ts` changes, and both renderers follow.
- The scenic fonts fail to load: the page still works and stays readable with system fonts, because every font stack in the Scenic_Tokens ends with a generic family.
- GitHub is unreachable or rate-limited: the sample works fully. Only a live analysis fails, through the existing error and Fallback path.
- The judge types a very long answer: the text stays in the Answer_Box. No Reaction, Scene change or re-render reads it.

## Out of Scope

- Audio files or music of any kind.
- Film characters, film quotes or logos (the Telephone is an original design).
- WebGL or canvas drawing.
- Animation libraries or any JavaScript animation loop.
- AI-generated images.
- Engine or Logic_Layer changes beyond new texts in `texts.ts` and `powerTexts.ts`.
- New ViewModel fields or new UserActions (any need is an open question).
- The "Not yet" option 1 (a simpler explanation and the questions repeated once); it gets its own spec later.
- A multi-language page.
- The exorcism certificate.
- Exorcising a live repository on the web.
- Removing or restyling the Simple_Renderer.
- Saving any setting (view choice, Lightning, Intro seen) in the browser.
- Running the Shots_Script in CI or in `npm run check`.

### Later optional idea (not in this spec)

- A synthesized ring sound for the Telephone, made with Web Audio and off by default.

## Names Checked Against the Code

| Name in the brief | Exists as | Where | Note |
| --- | --- | --- | --- |
| `TEXTS.emptyFloor` | yes, "No ghosts on this floor." | `src/logic/texts.ts` | The ViewModel carries it as `FloorView.emptyLine`. |
| `TEXTS.houseClean` | yes | `texts.ts` | The ViewModel carries it as `HouseView.houseClean`. |
| `POWER_TEXTS.lockedGhost` | yes | `src/logic/powerTexts.ts` | The ViewModel carries it as `GhostCardView.lockedLine`. |
| `POWER_TEXTS.liveReport` | yes | `powerTexts.ts` | The ViewModel carries it as `HouseView.powerLine`. |
| `canStart` | yes | `GhostCardView` in `viewModel.ts` | True exactly when `start-ghost` for that path is available. |
| `start-ghost`, `go-to-floor`, `go-to-house` | yes | `UserAction` in `actions.ts` | `go-to-floor` is not offered for the floor in focus. |
| `scene`, `transition` | yes | `ViewModel` in `viewModel.ts` | `transition` is set only in the render where the Scene changed. |
| ProgressView | yes, `ProgressView` | `viewModel.ts` | `null` for live reports (`buildHouse` in `houseView.ts`). |
| focus.ts rule | yes, `focusAfterRender` | `src/view/simple/focus.ts` | It is a Simple_Renderer file and does not move focus on a house/floor change (Open question 1). |
| "Got it", "Partly", "Missed it", "I don't know" | yes | `TEXTS.actionLabels.rate` and `["dont-know"]` | "Partly" is also the `self-check` `half` label. |
| "Start the exorcism", "Back to the house" | yes | `TEXTS.actionLabels["start-ghost"]`, `["go-to-house"]` | |
| ViewModel, UserAction | yes (code names) | `viewModel.ts`, `actions.ts` | The web-demo spec writes View_Model and User_Action. |
| Exorcism_Panel | yes (spec name) | web-demo glossary, `renderGhost` in `ghost.ts` | Here it is the Grimoire. |
| "Simple view", "Answer the phone", "The line is quiet.", "Lightning: on/off", the tagline, the Finale lines, the Bestiary texts, the Nameplate accessible name | no | — | New texts to add to `texts.ts` (and `powerTexts.ts` for the line that names the Power). |
| Telephone_Target for a live report | no | — | A live report has no Card with `canStart`, so there is never a target (Open question 8). |
| A "demo complete" field | no | — | Derived from Card states (Requirement 13.6), no new field. |

## Open Questions

1. **Focus rule.** The brief asks focus to move to the scene heading on every Scene change, "keeping the rule of focus.ts". `focusAfterRender` (`src/view/simple/focus.ts`) moves focus to the panel heading only when a ghost screen opens or changes; when the judge leaves a ghost it moves focus to that ghost's start button (or the list heading), not to a scene heading; and on a `house` ↔ `floor` change it keeps the same button or falls back to the list heading. The file is also part of the Simple_Renderer, and the web-demo design says those names are the Simple_Renderer's contract only. Options: (A) the Scenic_Renderer reuses `focusAfterRender` unchanged (moved to a shared `src/view/` file, or imported from `view/simple/`); (B) a scenic focus rule: the heading of the new Scene on every Scene change, otherwise the rule of `focus.ts`; (C) (B) but, when leaving a ghost, the start button of that ghost as today.
2. **Power line of a live report.** The brief shows `POWER_TEXTS.liveReport` as the caller's words only after the judge answers the Telephone. Web-demo Requirement 4.7 ("WHILE the Ghost_List shows a live report, THE Web_Page SHALL show one short line … from the Power_Texts") is not in the list of sober-layout requirements of the web-demo design, so it binds any renderer. Requirement 4.14 of this spec keeps it visible. Options: (A) always visible in the HUD and repeated by the Telephone; (B) only through the Telephone, and amend web-demo 4.7 for the Scenic_Renderer.
3. **Ghost reason on the Nameplate.** The brief's Nameplate has path, difficulty and state, but not the reason sentence (`GhostCardView.reason`). `product.md` says each ghost has "one plain sentence that says why", and the Simple_Renderer shows it (web-demo 3.3, a sober-layout requirement). Requirement 8.3 does not include it yet. Options: (A) on the Nameplate; (B) shown on hover and focus, like the locked line; (C) not shown in the Scenic_Renderer.
4. **Start controls in the House_Scene.** The brief puts Nameplates and "Start the exorcism" in the Floor_Scene, but its property "every card with canStart has exactly one start control" and its tab order ("floors, ghosts") suggest start controls in the House_Scene too. Also, in a Floor_Scene the other floors are dimmed, not removed. Requirement 8.3 says "the focused floors" and Requirement 23.4 covers both scenes, so this must be decided. Options: (A) every Card has its Nameplate and start control in both House_Scene and Floor_Scene; (B) Nameplates and start controls only for the floor in focus in a Floor_Scene, and in the House_Scene only the floor buttons and the Telephone (then Requirement 23.4 is limited to the focused floor).
5. **When the Exorcised_Moment plays.** The engine sets the ghost to `exorcised` when the third answer passes and the step becomes `self-check` (`nextQuestion` in `engine.ts`), so the Card changes while the Ghost_Scene is still open with the self-check prompt, and "Not yet" does not undo it. The brief describes the moment with the window lighting in the house view. Options: (A) play it in the Ghost_Scene at the start of `self-check`, and light the window when the judge comes back; (B) wait and play it in the Floor_Scene after the self-check answer (the renderer remembers the change); (C) both: sparks in the room, window and meter on return.
6. **Finale condition.** "No card is haunted" is true (a) at load when the Demo_Script is invalid (`script: null` makes every sample Card Locked), and (b) in the render where the last Scripted_Ghost enters `self-check`, while the Ghost_Scene is still open. Options: (A) also require at least one Exorcised Card, and show the Finale only in the House_Scene or Floor_Scene; (B) the brief's condition as written.
7. **Haunt meter and ghost icons for a live report.** `house.progress` is `null` for a live report (`buildHouse` in `houseView.ts`), so the Haunt_Meter has no `line` or `share`. The brief also says "five ghost icons", but a live report can have 1 to 5 ghosts. Options: (A) hide the Haunt_Meter and the Ghost_Icons for a live report; (B) show a full meter and one haunted icon per Card, computed by the renderer from the Cards (no new field, but a number not taken from ProgressView); (C) add a logic field (not allowed by Requirement 2).
8. **Telephone for a live report.** A live report has no Card with `canStart`, so the Telephone_Target is always none, yet the brief makes the Telephone ring "after a live analysis finishes". The ring is renderer state, not a ViewModel fact. Requirement 9.3 uses "`house.source` `live` and `status.kind` `done`" and rings until answered or the report changes. To decide: does it ring again after the judge walks to a floor and back (the status stays `done`)? Does a show-message error after a live report stop it? Options: (A) as in 9.3; (B) ring only in the first render after the analysis ends, for a fixed time.
9. **Web-demo Requirement 11 and Out of Scope.** Web-demo 11.4 ("system font stacks only"), 11.6 ("no drawing of a house, a building or an illustration"), 11.1 and 11.2 (one Tokens_File with a fixed palette) and its Out of Scope ("Any drawing of the house, illustration, … animation or sound") are written for THE Web_Page, not only the Simple_Renderer. The web-demo design says they "will need a new decision in the scenic spec", and `docs/decisiones.md` (16 Nov) already chose an animated SVG. Options: (A) amend web-demo 11.1, 11.2, 11.4 and 11.6 to say Simple_Renderer, in a docs change; (B) state in this spec that Requirements 3, 5, 21 and 22 replace them for the Scenic_Renderer, and add a line to `docs/decisiones.md`.
10. **New texts in `texts.ts` and `powerTexts.ts`.** The web-demo design ("How to replace the look") says a redesign MUST NOT change `src/logic/**` or any page text, and that text changes are a separate decision. The brief allows new texts. Requirement 2.2 allows additions only. Confirm that this spec is that separate decision, and that no existing text changes.
11. **Asset manifest.** Web-demo Requirement 18.5 asks every graphic asset slot to be declared in one manifest (`src/view/assets/manifest.ts`, slots such as `scene.house`, `ghost.haunted`, `prop.door`, `prop.candle`), and the web-demo design's Renderer contract says a renderer "takes graphics only through the asset manifest and from local files". The brief builds the SVG from Shape_Data in TypeScript, which is not a file layer of the manifest, and the fonts come from npm packages, not from `src/view/assets/files/`. Options: (A) Shape_Data counts as code, not as an asset; the manifest stays for image files and is not used by the Scenic_Renderer; (B) register each Shape_Data piece under a manifest slot id (needs a new layer kind in the manifest, a Presentation_Layer change); (C) amend web-demo 18.5 and the design contract.
12. **Size_Check and `npm test`.** The brief says "a test after the build" checks the 300 KB budget. `npm run check` builds before testing, but `npm test` alone on a clean checkout has no `dist/` (web-demo Requirement 13.2 wants web tests to run with no build). Options: (A) a separate Node script (for example `npm run size`) added to `check` after `build`; (B) a Vitest test that fails when `dist/` is missing; (C) a Vitest test that skips when `dist/` is missing (risk: a silent pass).
13. **Shots_Script and the network.** The "live busy" and "live done" screenshots need a live analysis, which calls the real GitHub API (60 requests per hour without an account, up to 8 per run). Also, the Gallery exists only in dev mode, while "the real page" could mean the built page. Options for the network: (A) intercept the GitHub requests in Playwright with a fixed answer; (B) call the real GitHub (the run may hit the limit). Options for the server: (A) the Vite dev server for everything; (B) `vite preview` of the built page for the flow, and the dev server only for the Gallery.
14. **Simple view link and progress.** The Simple_View_Link reloads the page, so in-memory progress is lost (allowed by web-demo 9.3, but it may surprise a judge). The brief does not say whether the Simple_Renderer gets a link back to the scenic view; adding one changes `src/view/simple/`. Also, `main.ts` imports `simple.css` at the top today, so both style sheets would apply unless the CSS import follows the View_Choice (Requirement 1.10). Options: (A) reload and lose progress, no link back; (B) reload, plus a "Scenic view" link in the Simple_Renderer; (C) switch renderer without reload (needs a way to remove a Renderer, which the `Renderer` interface does not have).
15. **Narrow width.** The brief asks for 390 px by 844 px; web-demo Requirement 12.3 asks for no horizontal scroll at 360 px, and the web-demo design says Requirement 12 binds a scenic renderer too. Requirement 19.4 keeps 360 px. Confirm.
16. **Lightning_Toggle under Reduced_Motion.** Reduced_Motion turns all Lightning off. Is the Lightning_Toggle then hidden, disabled, or shown as "Lightning: off"? Options: (A) shown, set to off and disabled, with a short reason; (B) hidden; (C) shown and working, but flashes never happen.
17. **`tech.md` stack table.** `tech.md` is the source of truth for the stack and does not list Playwright or `@fontsource` packages; it says "Check current documentation before using any library" and "exact versions only". Options: (A) update `tech.md` in this spec's first docs commit; (B) a separate docs branch, as for the existing Low about the Power format in `tech.md`.
18. **OFL text in the build output.** The SIL Open Font Licence asks that copies of the font carry the copyright and licence. The brief only asks for credit in the repository. Options: (A) also copy each OFL text to `packages/web/public/` so it ships next to the fonts in `dist/`; (B) credit in the repository only.

The questions from 19 on are numbered to match the references in the requirements. Questions 21, 26, 33, 34, 40 and 41 are listed separately at the end, because the design may decide them without the director. A "(design)" mark inside another question means only that part may be left to the design.

- **19. Repeated `view` parameter.** Requirement 1.2 does not say which value counts in `?view=simple&view=scenic`. Options: (A) the first value (`URLSearchParams.get`); (B) the last value; (C) `simple` only if every value is `simple`. Also: the relative link `?view=simple` (1.6) drops the hash and the other query parameters. Is that acceptable? (R1)
- **20. Source_Scan changes.** `source.test.ts` may change (Requirement 2 edge cases). Confirm that this spec may only add or extend Source_Scan checks (to cover `src/view/scenic/`), and never remove or weaken one. (R2, R22, R25)
- **22. HUD when the sample failed to load.** The R4 edge case says the HUD shows only the logo, tagline, Status_Region and Simple_View_Link, but 4.12 always shows the Bestiary and the Lightning_Toggle, and 4.5 shows the Live_Plaque whenever `live.formVisible` is true. Which wins? Also confirm that Enter in the Live_Plaque field submits (4.7), as in the Simple_Renderer form. (R4)
- **23. Variant with no floor position.** Which Variant is drawn for the large ghost of the Ghost_Scene (options: the same Variant as its Ghost_Slot, or one fixed close-up per Ghost_Type) and for each Bestiary entry (options: Variant 0, or a neutral drawing)? (R5, R7, R10)
- **24. Testable ghost looks.** Confirm the testable reading of 5.6 (the Wisp has the smallest outline, the Chained_Brute the widest, and the Wisp's eyes take the largest share of body height), and that the brief's "playful" was dropped because it cannot be tested. (R5)
- **25. Locked look.** (a) Padlocked glass lantern or bars (6.3): pick one, the same for every Locked Card. (b) Does a Locked ghost still show its Ghost_Type and Variant? (c) Does the Locked Nameplate get its own Tab stop (6.6), and where does it go in the tab order of 17.4? (R6, R17)
- **27. Camera moves the brief does not describe.** Ghost → floor (leaving a ghost gives `transition.to.kind` `"floor"`, so 8.1 applies) and ghost → house (a new report while a ghost is open). Do both use the same 0.6 s to 0.8 s move? (design) How much the other floors are dimmed (8.2). (R8)
- **28. Telephone details.** After the judge answers a live ring, 9.8 and 9.9 overlap (live source and a still Telephone): which wins? Where do the caller's words and "The line is quiet." appear (a bubble, the Status_Region or both), are they announced, and how long do they stay? Is the Telephone drawn, or Ringing, in the Ghost_Scene? (R9; linked to Open questions 2 and 8)
- **29. Grimoire order.** Must the Grimoire keep the Simple_Renderer order (heading, judge line, reading, question, Answer_Box, revealed answer, prompt, actions, Code_Block, licence), or may it use its own? Confirm adding `ghost.revealedAnswer` under `TEXTS.revealedTitle` (10.2), as the Simple_Renderer does. (R10)
- **30. Reaction limits.** 11.2, 11.4 and 11.10 propose values the brief does not give: each Reaction ends within 1,000 ms, the "Got it" fade never goes below 40 % opacity, and the "Missed it" growth never goes above 130 %. Does `failed` also reset opacity (11.6)? Under Reduced_Motion, may the "Missed it" size change be an instant jump? Confirm that the Grimoire updates at once and only the ghost drawing waits (11.9). (R11)
- **31. Render during the Exorcised_Moment.** A render can arrive while the moment plays (the judge answers the self-check or leaves within about 1.2 s). Options: (A) keep playing; (B) jump to the end; (C) stop. (design) The Haunt_Meter animation duration (12.6); cold blue and warm orange as named Scenic_Tokens; whether windows are also lit in the Floor_Scene (12.5). (R12; linked to Open question 5)
- **32. Finale banner.** Does `house.houseClean` replace the two banner lines (assumed in 13.5) or add to them? Is the banner announced through the Status_Region? Does the Finale animate only when its condition turns true, or also at the first render and after "Show the sample again"? (R13; linked to Open question 6)
- **35. Intro details.** Does the key, click or tap that ends the Intro also have its normal effect (assumed in 16.3)? The brief's edge case "the page loads on the fallback" was wrong (the Fallback only follows a failed live analysis) and is removed from Requirement 16; confirm. Can controls under the facade take focus during the Intro (screen reader users)? 16.6 and 18.1 say the same thing; keep one. (R16)
- **36. Accessibility gaps.** The tab order in the Ghost_Scene (HUD, Grimoire choices, Answer_Box, Code_Block, licence) is not set. Where does "Back to the house" go in 17.4? Can the keyboard reach the controls of dimmed floors, or of the house behind the Ghost_Scene? Does HUD text always have a solid backing, so that its contrast holds over a Lightning flash or the dawn sky (17.8)? Does the 44 px rule of 17.9 apply to the inline licence link (WCAG 2.5.8 exempts inline links)? (R17)
- **37. Reduced_Motion precedence.** Some criteria state motion without their own "WHILE Reduced_Motion is off" guard and rely on Requirement 18 or on an edge case: 3.3 (fog and rain), 11.2 to 11.5 (Reactions), 12.4 (colour change) and 13.3 (Finale). Criteria 8.1, 8.8, 12.3 and 15.1 have the guard (12.3 writes it as "is not set"). Options: (A) add the guard to each; (B) one sentence saying that Requirement 18 takes precedence over every other requirement. What happens to a one-shot animation that is already running when Reduced_Motion turns on? (design) Rain and fog drawn still, or hidden. (R18)
- **38. Phone layout.** At 390 px by 844 px, must the HUD and the whole house fit with no vertical scroll, or may the page scroll? (design) The breakpoint where the Grimoire moves under the scene. How is Requirement 19 checked: only by the hand-run Shots_Script, or also by a test in `npm run check`? (R19)
- **39. Size and filters.** Is a filter allowed on a static layer inside the animated Camera (its ancestor moves) under 20.2? Is 300 KB 307,200 bytes (assumed in 20.5) or 300,000 bytes? Do image files (`.png`, `.jpg`, `.webp`) in `dist/` count? (R20; linked to Open questions 11 and 12)
- **42. Repeated paths.** Start controls and the Telephone_Target are keyed by path. With repeated paths (possible in `reportArb`), which Card wins? Should 23.4 and 23.6 use `uniquePathReportArb`? Do Ghost_Slots and start controls exist while `scene.kind` is `"ghost"`? (R23)
- **43. Shots_Script details.** Which frame is captured for the Reactions and the Exorcised_Moment: the end state, a fixed delay, or the middle? Does the script turn Lightning off for stable shots? Which Scenes are captured under Reduced_Motion? Does the script start and stop the server itself (so no process is left running), or does the director start it? Is there a time limit per step (for example 10 s)? (R24; linked to Open questions 6 and 13)
- **44. Built output check.** The `@fontsource` CSS comes from `node_modules`, which the Source_Scan never sees. Should "nothing loaded from outside" (25.3, 21.5) also be checked on the built `dist/`? If yes, does that check join the Size_Check? (R25)

### Smaller questions the design may decide

- **21. House heading and floor button names.** The House_Scene heading when `house` is `null` (no `repoName`, 3.8 and 3.9): none, `TEXTS.pageTitle`, or a new text. The accessible name of a floor button (3.6): the floor title only, or the title plus `TEXTS.actionLabels["go-to-floor"]` ("Go to this floor"). (R3)
- **26. Bestiary details.** The range numbers 0, 33, 34, 66, 67 and 100: literal texts in `texts.ts` (guarded by the check of 7.3), or built from Core (Core does not export the bounds)? Is folding at 390 px required, or left to the design? Are the Bestiary drawings hidden from assistive technology? (R7)
- **33. Search_Beam timing.** How long one sweep takes and whether it loops (14.1). (R14)
- **34. Lightning scenes.** In which Scenes Lightning flashes (all, House_Scene and Floor_Scene, or House_Scene only), and whether it flashes during the Intro (15.1). (R15)
- **40. Font details.** Whether `--font-code` is used for code and paths. Which Fontsource subsets and styles are bundled (they count in the budget of 20.5). Which font is used for scenic text that is not an `h1` to `h3` element (Nameplates, Grimoire choices, Bestiary titles, Finale banner) (21.3). (R21)
- **41. Art rules.** Are `.svg` files allowed under `src/view/scenic/` (22.1 against 22.10)? Do `transparent`, `currentColor`, `none` and `inherit` count as literal colours in Shape_Data? May scenic TypeScript build literal CSS sizes (for example the Camera transform)? The raw-HTML scan does not catch `DOMParser`, `createContextualFragment` or `setHTMLUnsafe`; should it be extended (22.3)? (R22)
