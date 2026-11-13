# Implementation Plan: Exorcism

Working branch: `feat/exorcism`.

## Overview
The exorcism engine is a set of pure TypeScript functions in `packages/core/src/exorcism/`, plus one small fix in ghost detection (the Ghost_Sentence). The order follows the "Build Order" of the design: first the independent Ghost_Sentence fix, then the small pure modules (types, questions, file kind, rules, progress, suggestion, instructions, verdict, events), then the engine in small steps, then the model-based test driver and the mandatory properties, then recording and replay, then exports and the purity test, then docs and the pull request. The seven `aplazable` properties are at the end as optional tasks. Each task is one commit.

Rules for running these tasks:
- Kiro runs a task only when the project owner says so. Kiro asks permission before modifying code.
- Work on branch `feat/exorcism`, never on `main`. Never merge.
- Run every command from the repository root, in PowerShell.
- One task = one commit. A task is done only when its own tests and `npm run check` pass (exit code `0`; lint, format check, build and tests). Then Kiro marks the task `[x]` in this file and includes `tasks.md` in that same commit. If a commit message needs an "and", it is two commits.
- Do not touch `requirements.md` or `design.md` of this spec. The only edit outside `packages/core` and this file is the one-line pointer in task 1.5 and the docs of task 7.
- Relative imports inside core use the `.js` extension (NodeNext). Tests sit next to the code as `*.test.ts`; test helpers are `*.testutil.ts`.
- Exorcism code must not use Node-only APIs, `Date`, `Math.random`, `process`, `fetch` or `require` (Requirements 9.2, 9.3, 10.1). Only `null`, never `undefined`, in serialisable structures.
- Tests use Vitest 5.1.0 and fast-check 4.10.2. No test calls the network (Requirement 9.6). Before using an API of either library, check its current documentation.
- Every property test is one `fc.assert(fc.property(...), { numRuns: 100 })` with the comment `// Feature: exorcism, Property N: <title>`.
- In driver-based tests the input state and event of `advance` are deep-frozen, so any mutation fails.
- Each task is meant to stay under about 150 changed lines. If it does not, stop and ask the owner how to split it.
- The whole pull request is expected to be over 500 changed lines (tests are large). The owner accepted one pull request; the last task states the size in its description.

## Tasks

- [x] 1. Ghost_Sentence fix in ghost detection
  - [x] 1.1 Move `floorOf` to `ghost-detection/floor.ts`
    - Step 0: check the branch with `git branch --show-current`. If it is `main`, run `git checkout feat/exorcism` followed by `git pull`. The branch already exists and holds the spec; never create it with `git checkout -b`.
    - Create `packages/core/src/ghost-detection/floor.ts` with `floorOf` moved unchanged from `report.ts`.
    - In `report.ts` import it for its own use and add `export { floorOf } from "./floor.js";`, so `index.ts` and every existing import keep working. This avoids an import cycle with `factors.ts` in task 1.3.
    - Existing tests of `floorOf` keep passing without change (move them next to `floor.ts` only if that needs no edit of their content).
    - Verify: `npm run check` exits `0`.
    - Commit message: `refactor(core): move floorOf to its own file`
    - _Requirements: 8.8, 8.9 (design: "Import cycle")_

  - [x] 1.2 Make `Result` generic
    - In `ghost-detection/types.ts` change `Result<T>` to `Result<T, E = DetectErrorInfo>`, as in the design ("Ghost-detection change in `types.ts`").
    - No new test: the build (`tsc`) proves that every old use stays valid.
    - Verify: `npm run check` exits `0`.
    - Commit message: `refactor(core): make Result generic in the error type`
    - _Requirements: 7.5, 10.9, 11.5 (design: "Decisions")_

  - [x] 1.3 Write the new `reasonFor` sentences and update the tests
    - In `ghost-detection/factors.ts` change `reasonFor` to the sentence table of the design ("Ghost_Sentence", sentences 1 to 13). Keep the signature, the tie order (`lines`, `branches`, `maxIndent`, `imports`) and compute `floor = floorOf(difficultyScore(f))`, importing `floorOf` from `./floor.js`. Sentence 12 is implemented but has no example test (unreachable with the current weights).
    - In `factors.test.ts`, `describe("reasonFor")`: the 4 "names ... when it wins" tests use the new sentences 1 to 4 with N = 200, 30, 4, 10; the "all points are 0" test expects sentence 13; the tie-order test (`all = { lines: 100, branches: 20, maxIndent: 4, imports: 20 }`, then `lines: 0`, then `lines: 0, branches: 0`) now compares exact strings (sentence 5, 2, 3) so the floor is checked too.
    - Add the example tests of the design table (checked with the real `difficultyScore` and `floorOf`): `{200,0,0,0}`, `{0,30,0,0}`, `{0,0,4,0}`, `{0,0,0,10}`, `{400,0,0,0}`, `{50,60,0,0}`, `{100,20,8,0}`, `{99,19,3,20}`, `{400,60,0,0}`, `{290,60,4,0}`, `{199,39,8,20}` and the zero case `{0,0,0,0}` (the order of Factors is lines, branches, maxIndent, imports).
    - Add a test that a report saved with the old sentence (`It is hard mostly because ...`) still passes `parseReport` (Requirement 8.8).
    - `report.test.ts` compares with `reasonFor` itself, so it needs no change; check that it still passes.
    - Verify: `npm run check` exits `0`.
    - Commit message: `fix(core): make ghost sentences match the floor`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.8, 8.9_

  - [x] 1.4 Property test for the Ghost_Sentence floor wording
    - In `ghost-detection/factors.test.ts` add the property test.
    - **Property 11: Ghost sentence follows the floor wording**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.7**
    - Generator: `fc.oneof(fc.constant({ lines: 0, branches: 0, maxIndent: 0, imports: 0 }), fc.record(...))` with four integers 0 to 1000, so the all-zero case is always exercised. Checks as in the design: winner factor named with its value as a whole number; attic starts with `It is easy` and has no whole word "hard"; middle floor starts with `It is of` and has neither whole word "hard" nor "easy"; basement starts with `It is hard`; the three starts are different; all-zero gives exactly sentence 13, names no factor and has no number.
    - Test file: `packages/core/src/ghost-detection/factors.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check ghost sentence wording by floor`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

  - [x] 1.5 Add the pointer in the ghost-detection design
    - In `.kiro/specs/ghost-detection/design.md`, under the "Reason sentence" table, add one line saying that the table is replaced by the "Ghost_Sentence (Requirement 8)" section of `.kiro/specs/exorcism/design.md`. Change nothing else in that file.
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: point ghost sentence table to the exorcism design`
    - _Requirements: 8.9_

- [x] 2. Exorcism foundations: types, questions, file kind, rules, progress, suggestion, instructions, verdict
  - [x] 2.1 Add the exorcism types and error helpers
    - Create `exorcism/types.ts` with all types of the design "Data Models" (`ExorcismStep`, `Rating`, `Verdict`, `FileKind`, `SelfCheck`, `StudentProfile`, `ExorcismErrorCode`, `ExorcismErrorInfo`, `GhostProgress`, `ExorcismProgress`, `ExorcismEvent`, `CurrentGhost`, `SessionState`, `TutorInstructions`, `RecordedEvent`, `SessionRecording`). `TutorInstructions.rules` uses `RuleId`, imported as a type from `./rules.js`; create `rules.ts` with only `export type RuleId = never;` for now and fill it in task 2.4 (or define the full `RuleId` union already here if it is shorter; either way the build must pass).
    - Create `exorcism/errors.ts` with small helpers `ok(value)` and `fail(code, message)` for `Result<T, ExorcismErrorInfo>` (this file is not in the design layout; it only holds these two helpers).
    - Write `errors.test.ts` (unit tests): shapes of `ok` and `fail`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add exorcism types and error helpers`
    - _Requirements: 7.2, 10.2, 10.3, 11.1_

  - [x] 2.2 Add `QUESTION_SETS`
    - Create `exorcism/questions.ts` with `QUESTION_SETS` (3 objectives per kind, index 0 is the Core_Question) and `objectiveOf(kind, index)`, with the exact objectives of the design table.
    - Write `questions.test.ts` with **exhaustive** checks (not random): every kind has exactly 3 objectives; none contains a digit or the words "line" or "syntax" as a target; `data-shape` does not contain "what goes in and what comes out"; index 0 of each kind is the Core_Question objective.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add question sets for each file kind`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.11_

  - [x] 2.3 Add `classifyFileKind`
    - Create `exorcism/fileKind.ts` with `classifyFileKind(text, language)` following the design "File kind": uses `measureFactors` for `lines` and `branches`, scans code lines itself (comment rule as in `measureFactors`, lines cut to 500 characters), rules in the given order, one pattern table per language. For TypeScript, `type ...` lines and property signatures with function types do not count as function-likes.
    - Write `fileKind.test.ts`: one example per kind and per language; the two spike fixtures written as small inline strings (a types file from `docs/spike-explicacion.md` gives `data-shape`; a file with loops and conditions from the 11 Nov spike gives `logic`); empty and comment-only files give `general`; a barrel (`export ... from`) gives `entry-point`; a Java class with only fields and getters gives `logic` (the documented limit, as a test).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): classify the kind of a file`
    - _Requirements: 4.1, 4.2 (design: "File kind")_

  - [x] 2.4 Add the Tutor rules
    - Create (or complete) `exorcism/rules.ts` with the closed `RuleId` list and `RULE_SENTENCES` with the fixed English sentence of each rule, exactly as in the design table "Tutor rules" (including `ask-then-wait`, `java-allowed`, `java-forbidden`, `different-questions`, `same-question`, `new-analogy`, `verdict-format`, `one-verdict`, `dont-know-verdict`, `self-check-options`). Sentences with a gap (`different-questions`, `same-question`) are exported as small functions that take the question texts, or as a fixed prefix plus the texts added by the builder; pick one and keep it consistent.
    - Write `rules.test.ts`: every `RuleId` has a non-empty sentence; no sentence is repeated; `verdict-format` contains the four exact `VERDICT:` lines; no sentence contains a line number.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add the fixed rules for the tutor`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.11, 3.1, 3.2, 3.3, 3.4, 4.9, 4.10, 4.12, 5.1, 5.4, 5.5, 5.6, 6.1, 6.2, 6.5, 10.9, 10.13_

  - [x] 2.5 Add progress normalising, parsing and formatting
    - Create `exorcism/progress.ts` with `normaliseProgress(ghosts, progress)` (exactly one entry per ghost in report order, unknown paths dropped, missing ghosts `haunted` with no ratings and `selfCheck: null`), `parseProgress(jsonText)` (hand-written type guard as in the design: `ghosts` array; `path` string; `state` in the two values; `ratings` of length 0 or 3 of valid ratings; `selfCheck` in `yes | half | no | null`; no duplicate paths; `INVALID_PROGRESS` with an English message on any failure; never throws) and `formatProgress` (`JSON.stringify`). Export the type guard inside the package (not from the public index) for `parseRecording`.
    - Write `progress.test.ts` (unit tests): unknown path dropped, missing ghost becomes haunted, report order kept; `INVALID_PROGRESS` for invalid JSON, wrong types, ratings of length 2, a state not in the union, duplicate paths; a valid progress parses back equal.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): normalise and parse exorcism progress`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.10_

  - [x] 2.6 Add `hauntedShare`
    - In `progress.ts` add `hauntedShare(report, progress)`: normalise against the report ghosts, return `haunted / ghosts.length`, and `0` when there are no ghosts.
    - Extend `progress.test.ts` with examples: no ghost exorcised gives 1; all exorcised gives 0; half gives 0.5; 0 ghosts gives 0 (not `NaN`); unknown paths ignored; marking one more ghost exorcised does not raise the share.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): calculate the haunted share`
    - _Requirements: 7.7, 7.8, 7.9_

  - [x] 2.7 Add `suggestGhost` and `isPickable`
    - Create `exorcism/suggest.ts` as in the design "Suggestion": among `haunted` ghosts the lowest `difficultyScore`, ties by `path` ascending with `a < b` (not `localeCompare`); `null` if none is haunted. `isPickable` is true only for a `haunted` ghost that is in the list.
    - Write `suggest.test.ts` (unit tests): lowest score wins; tie broken by path; exorcised ghosts skipped; `null` when all are exorcised or the list is empty; `isPickable` is false for an exorcised ghost and for an unknown path.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): suggest the easiest haunted ghost`
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 2.8 Property test for the suggestion
    - **Property 1: Suggestion is the easiest haunted ghost**
    - **Validates: Requirements 1.1, 1.2, 1.6**
    - Create `exorcism/progressArb.testutil.ts` with `progressArb(ghosts)` (state per ghost, ratings of length 0 or 3, `selfCheck` or `null`; it may add extra unknown paths when asked) and `ratingsArb`. The optional properties 7, 8 and 9 reuse them.
    - Generator: the existing `reportArb` with unique paths and scores from a small range to force ties (map to unique paths by index), plus `progressArb`. Check: `suggestGhost` is `null` iff no ghost is haunted; otherwise it returns a haunted ghost with no haunted ghost of lower score and, among equal scores, the smallest path.
    - Test file: `packages/core/src/exorcism/suggest.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check the ghost suggestion rule`
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 2.9 Build the instructions for the steps without questions
    - Create `exorcism/instructions.ts` with `buildInstructions(state)` and the layout of the design (title line, `Ghost` block with path and Ghost_Text in a fence longer than any run of backticks in the text, step task, one bullet per rule in list order). In this task implement the steps `choosing`, `explaining`, `self-check`, `failed` and `house-clean`; for the other steps (`asking`, `simplifying`, `model-answer`) the function throws an `Error("not implemented yet")` that task 2.10 removes.
    - `explaining`: rules `simple-english`, `no-jargon`, `what-before-how`, `no-question`, `no-lines`, `max-words`, the Java rule (exactly one of `java-allowed` / `java-forbidden`, from `profile.knowsJava`), `probable-reasons`, `separate-what-why`, `admit-unknown`. When `current.explanation` is not empty (after `retry-ghost`), it also contains the previous explanation and the rule `new-analogy`.
    - `choosing`: short message with the suggested ghost (path, floor, ghost sentence) and the list of haunted ghosts; no Ghost_Text; rule `probable-reasons`. `failed`, `house-clean` and `self-check`: the fixed English messages of the design; `self-check` has `self-check-options`. `probable-reasons` is present in every step.
    - Write `instructions.test.ts` (unit tests, fixed inputs): the text contains the sentence of every rule in `rules`, the path and the Ghost_Text; `explaining` has no question rule; the fence is longer than any backtick run in the Ghost_Text; the retry case contains the previous explanation and `new-analogy`; Java rule present in `explaining` for both profile values (and a missing profile counts as `false`).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): build tutor instructions for explanation steps`
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.11, 3.1, 3.2, 3.3, 6.4, 6.5, 10.13_

  - [x] 2.10 Build the instructions for asking, simplifying and model answer
    - In `instructions.ts` implement `asking`, `simplifying` and `model-answer` and remove the temporary `throw`.
    - `asking`, new question (`pendingQuestion` is `null`): path, Ghost_Text, **only** the objective `QUESTION_SETS[kind][questionIndex]`; rules `one-question`, `concrete-file`, `ask-then-wait`, `no-lines`, `judge-behaviour`, `reason-then-verdict`, `verdict-format`, `one-verdict`, `dont-know-verdict`, `not-wrong-other-reason`, `admit-unknown`, `probable-reasons`, simple-language rules and the Java rule; `different-questions` only when `asked[path].slice(0, attemptStart)` is not empty, and then the text lists those questions.
    - `asking`, re-ask (`pendingQuestion` set): the pending question and `same-question`, plus `ask-then-wait` and the judging rules.
    - `simplifying`: path, Ghost_Text, the pending question, the explanation given before and the earlier simpler ones; rules `new-analogy`, `only-this-part`, `max-words`, `no-question`, `no-lines`, `separate-what-why`, Java rule. `model-answer`: path, Ghost_Text, the question and `model-answer-short`, `no-question`, `no-lines`, Java rule.
    - Extend `instructions.test.ts` with fixed-input examples: the text of a new question contains the objective and none of the other two; a second attempt lists the questions of the first; the re-ask contains the exact pending question; `ask-then-wait` sentence appears in the text of every `asking` instruction; `simplifying` contains the explanation given before.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): build tutor instructions for questions`
    - _Requirements: 3.1, 3.4, 4.9, 4.10, 4.11, 4.12, 4.13, 5.1, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 10.9_

  - [x] 2.11 Add `formatVerdict` and `parseVerdict`
    - Create `exorcism/verdict.ts` as in the design "Verdict format": `formatVerdict(reason, verdict)` (trailing whitespace of the reason removed, then `\nVERDICT: <verdict>`, or only the verdict line when the reason is empty); `parseVerdict(text)` accepts only a last non-empty line (trailing whitespace and `\r` removed) that is exactly one of the four verdict lines, and no other line starting with `VERDICT:`. Otherwise `INVALID_VERDICT` with the English messages of the design. It never throws.
    - Write `verdict.test.ts` (unit tests): the four accepted verdicts; rejected: no last line, unknown verdict, two `VERDICT:` lines, text after the verdict, empty text; accepted: trailing `\r`, trailing blank lines.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): format and parse tutor verdicts`
    - _Requirements: 5.2, 10.9_

  - [x] 2.12 Property test for the verdict round trip
    - **Property 14: Verdict round trip**
    - **Validates: Requirements 10.9, 10.10**
    - Generator: `fc.constantFrom` of the four verdicts and a reason from `fc.string()` filtered so that no line starts with `VERDICT:` (include `\r\n`, blank lines and trailing spaces in the generator). Check `parseVerdict(formatVerdict(reason, verdict))` returns the same verdict.
    - Test file: `packages/core/src/exorcism/verdict.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check verdict round trip`
    - _Requirements: 10.9, 10.10_

- [x] 3. Event parsing
  - [x] 3.1 Add `parseEvent` and `ALLOWED_EVENTS`
    - Create `exorcism/event.ts` with `parseEvent(raw: unknown)` (hand-written validation of the closed list of events and their fields as in "Data Models": `explanation-done` text not blank, `answer-rated` rating valid and question not blank, `dont-know` question not blank, `self-check-answered` in `yes | half | no`, `pick-ghost` path string and text string that may be `""`) and the table `ALLOWED_EVENTS` of Requirement 10.4. `parseEvent` copies only the known fields, so unknown fields (including `sampleAnswer`) are dropped. On failure it returns `INVALID_EVENT` with an English message; it never throws, for any `unknown` input.
    - Write `event.test.ts`: each valid event; each missing field, wrong type or blank text; a non-object; unknown fields dropped; `sampleAnswer` dropped; `ALLOWED_EVENTS` equals the table of Requirement 10.4 step by step (`house-clean` allows none); `parseEvent` never throws for `fc.anything()` (one plain property inside the same test file is fine, no number needed).
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): parse exorcism events`
    - _Requirements: 10.3, 10.4, 10.5, 11.8_

- [x] 4. Engine and the mandatory properties
  - [x] 4.1 Add `startSession`
    - Create `exorcism/engine.ts` with `StartOptions` and `startSession(report, options)` as in the design "Start": drop later ghosts that repeat a path (keep the first), copy the ghosts, `normaliseProgress`, `profile = { knowsJava: options?.profile?.knowsJava ?? false }`, step `house-clean` when `suggestGhost` is `null` (including 0 ghosts), otherwise `choosing`, `current = null`, `asked = {}`; return the state and `buildInstructions(state)`. Never throws.
    - Write `engine.test.ts` (first tests): start with and without progress and profile; start in `house-clean` when every ghost is exorcised and when the report has 0 ghosts; a repeated path keeps the first ghost; `fewFiles` and `partial` reports start normally; unknown paths in the given progress are dropped.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): start an exorcism session`
    - _Requirements: 1.1, 1.3, 1.5, 2.9, 7.6, 10.11_

  - [x] 4.2 Add `decide`
    - In `engine.ts` add `decide(ratings)`: true iff at least 2 ratings are `right` or `half-right` and `ratings[0]` is not `wrong`.
    - Add examples to `engine.test.ts`: all 27 combinations of three ratings checked against a hand-written table (exhaustive, not random); 2 good ratings with a `wrong` Core_Question is false.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): decide when a ghost is exorcised`
    - _Requirements: 6.3, 6.4, 6.6_

  - [x] 4.3 Add `advance`: validation, `pick-ghost` and the explanation
    - In `engine.ts` add `advance(state, event: unknown)` and the `Transition` type. Order: `parseEvent` (error gives `INVALID_EVENT`), `ALLOWED_EVENTS[state.step]` (error gives `INVALID_EVENT`), event checks (`pick-ghost` needs `isPickable`), then the effect. On error it returns `ok: false`, the error and the **same** state. It never mutates its input and never throws.
    - Implement the rows of the transition table: `choosing` and `failed` with `pick-ghost` (new attempt: `kind = classifyFileKind(text, language)`, `explanation = ""`, `simpler = []`, `attemptStart = asked[path].length`, index 0, counters 0, `pendingQuestion = null`, `ratings = []`) to `explaining`; `explaining` with `explanation-done` to `asking` at question 0. Events that are allowed in a step but not implemented yet hit a temporary `throw new Error("not implemented yet")`, removed in tasks 4.4 and 4.5.
    - Extend `engine.test.ts`: each row above; `INVALID_EVENT` for each event in a step that does not allow it (table-driven, from the spec table); `pick-ghost` of an exorcised ghost and of an unknown path gives `INVALID_EVENT` and the state is equal to the one before; blank explanation text is rejected; `asked` of a previous attempt is kept when the same ghost is picked again.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): advance the session on pick and explanation`
    - _Requirements: 1.4, 1.5, 1.6, 2.7, 4.1, 10.1, 10.3, 10.4, 10.5, 10.6, 10.14_

  - [x] 4.4 Add `advance`: asking, "I don't know", simplifying and model answer
    - In `engine.ts` implement the transition rows: `asking` + `answer-rated` (push the rating; add the question to `asked[path]` only if `pendingQuestion` is `null`; next question: `questionIndex + 1`, `dontKnowCount = 0`, `pendingQuestion = null`); `asking` + `dont-know` the first time (`dontKnowCount = 1`, `pendingQuestion = question`, question added to `asked`, step `simplifying`, no rating); `asking` + `dont-know` the second time (push `wrong`, step `model-answer`, question not recorded again); `simplifying` + `explanation-done` (push to `simpler`, back to `asking`, same question); `model-answer` + `explanation-done` (next question). After the 3rd rating (from `asking` or `model-answer`) the step is decided in task 4.5; until then those two paths keep the temporary `throw`.
    - Use `{ ...asked, [path]: [...] }` for `asked` (design "Record keys"); never `asked[path].push`.
    - Extend `engine.test.ts`: the edge cases of the requirements that live here: answer rated right/half-right/wrong; empty answer path (`dont-know`); `dont-know` once then answer; `dont-know` twice gives `wrong` and model answer; the re-asked question is the same text; the Core_Question is always the first question; the simplifying instruction contains the explanation given before.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): advance the session through questions`
    - _Requirements: 4.9, 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 10.3, 10.4_

  - [x] 4.5 Add `advance`: decision, self-check, failed, retry and leave
    - In `engine.ts` implement the end of the attempt: after the 3rd rating apply `decide`; pass marks the progress entry `exorcised` with the 3 ratings and goes to `self-check`; fail keeps it `haunted` with the ratings of the last attempt and goes to `failed`. Then `self-check` + `self-check-answered` (store `selfCheck` in the entry, `current = null`, step `choosing` with the new suggestion, or `house-clean` if no ghost is haunted); `failed` + `retry-ghost` (reset ratings, `simpler`, index, counters; keep `explanation`; update `attemptStart`; step `explaining`); `leave-ghost` in `explaining`, `asking`, `simplifying` and `model-answer` (`current = null`, progress unchanged, `asked` kept, step `choosing`). Remove every temporary `throw`.
    - Extend `engine.test.ts` with the remaining edge cases: pass with 3 `right`; pass with 2 good and a `wrong` third; 2 good ratings but `wrong` Core_Question stays haunted and goes to `failed`; `dont-know` twice on the last question then the decision; retry after `failed` keeps the old explanation and the instruction asks for a new analogy; `pick-ghost` in `failed`; leave halfway keeps the ghost haunted and keeps `asked`; the last self-check goes to `house-clean`; `leave-ghost` in `self-check` and `failed` gives `INVALID_EVENT`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): finish ghosts, retry and leave`
    - _Requirements: 1.2, 1.3, 5.6, 6.3, 6.4, 6.5, 10.8, 10.12, 10.13, 10.14_

  - [x] 4.6 Add the model-based test driver
    - Create `exorcism/sessionArb.testutil.ts` as in the design "Test helpers": `validEventsFor(state)` is an **independent oracle** written in the test helper (not taken from `ALLOWED_EVENTS`), per step: `choosing` gives `pick-ghost` for each haunted ghost with a fixed generated text; `explaining` gives `explanation-done` and `leave-ghost`; `asking` gives `answer-rated` with each of the 3 ratings, `dont-know` and `leave-ghost` (the pending question when there is one, else a new question text); `simplifying` and `model-answer` give `explanation-done` and `leave-ghost`; `self-check` gives the 3 answers; `failed` gives `retry-ghost` and `pick-ghost`; `house-clean` gives none. `driveSession(report, profile, choices)` starts a session and picks `validEventsFor(state)[choice % length]` until the list is empty or the choices run out, returning `states`, `instructions` and `events`.
    - Reports used by the driver have unique, non-empty ghost paths (build the path from the index). Choices come from `fc.array(fc.nat())`, so failing cases shrink.
    - Write `sessionArb.test.ts` (tests of the helper): every step of every driven state allows exactly the events of `validEventsFor` (`advance` returns `ok: true` for each of them); driving ends in `house-clean` or when the choices run out; every state and instruction survives `JSON.parse(JSON.stringify(x))` with `toStrictEqual` (Requirement 10.2).
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): add the session driver for property tests`
    - _Requirements: 10.2, 10.4, 10.6_

  - [x] 4.7 Property test for the bounded loop
    - **Property 5: Bounded loop**
    - **Validates: Requirements 5.7, 5.8**
    - Generator: `fc.array(fc.nat(), { maxLength: 200 })` into `driveSession`; counts computed from the trace. Checks per attempt: each question is asked at most twice; at most one simplification per question; at most 3 simplifications per attempt; the attempt leaves `explaining`, `asking`, `simplifying` and `model-answer` after at most 14 events.
    - Test file: `packages/core/src/exorcism/engine.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check the question loop is bounded`
    - _Requirements: 5.7, 5.8_

  - [x] 4.8 Property test for the decision
    - **Property 6: Decision**
    - **Validates: Requirements 6.3, 6.4, 6.6**
    - Two checks in one property: (1) for any list of 3 ratings (`fc.array(fc.constantFrom("right","half-right","wrong"), { minLength: 3, maxLength: 3 })`), `decide` is true iff at least 2 are `right` or `half-right` and the first is not `wrong`; (2) for any driven session, after the 3rd rating the engine goes to `self-check` and the ghost is `exorcised` iff `decide` is true, and otherwise goes to `failed` and the ghost stays `haunted`. (Placed here, after the driver, because part (2) needs it; the `decide` function itself was tested exhaustively in task 4.2.)
    - Test file: `packages/core/src/exorcism/engine.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check the exorcism decision rule`
    - _Requirements: 6.3, 6.4, 6.6_

  - [x] 4.9 Property test for the Java rule
    - **Property 2: Java rule**
    - **Validates: Requirements 2.8, 2.9, 2.10**
    - Generator: `fc.option(fc.boolean())` for the profile (none counts as `false`) and `fc.array(fc.nat())` for the driver. For every driven state in `explaining`, `asking`, `simplifying` or `model-answer`, the instruction `rules` contain `java-allowed` iff `knowsJava` is true, `java-forbidden` iff it is false, and never both.
    - Test file: `packages/core/src/exorcism/instructions.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check the Java comparison rule`
    - _Requirements: 2.8, 2.9, 2.10_

  - [x] 4.10 Property test for the instruction rules of a new question
    - **Property 4: Instruction rules for a new question**
    - **Validates: Requirements 4.9, 4.10, 4.11, 4.12, 4.13, 3.1**
    - Generator: driven states with `textArb` for the Ghost_Text (filtered so it contains none of the objective strings) and random non-blank question texts. For every driven state in `asking` with `pendingQuestion` null: `rules` contain `one-question`, `concrete-file`, `ask-then-wait`, `no-lines` and `probable-reasons`; `text` contains the path and the current objective and neither of the other two; `different-questions` is present iff `asked[path].slice(0, attemptStart)` is not empty, and then `text` contains every one of those questions. The "no objective contains a line number" part is the exhaustive check of task 2.2, not random.
    - Test file: `packages/core/src/exorcism/instructions.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check the rules for a new question`
    - _Requirements: 3.1, 4.9, 4.10, 4.11, 4.12, 4.13_

  - [x] 4.11 Property test for invalid events
    - **Property 12: Invalid events leave the state unchanged**
    - **Validates: Requirements 1.4, 1.6, 10.3, 10.4, 10.5, 10.6**
    - Create `eventLikeArb` in `sessionArb.testutil.ts`: events from `fc.anything()` mixed with real events in the wrong step, with missing or wrong-typed fields, blank text, and `pick-ghost` of an exorcised or unknown path. The oracle is `validEventsFor` plus a field check written separately in the test. For every driven state and every event not accepted: `advance` returns `ok: false`, code `INVALID_EVENT`, and a state equal (`toStrictEqual`) to the input. The input state and event are deep-frozen.
    - Test file: `packages/core/src/exorcism/engine.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check invalid events change nothing`
    - _Requirements: 1.4, 1.6, 10.3, 10.4, 10.5, 10.6_

  - [x] 4.12 Property test for determinism and JSON-safe state
    - **Property 13: Engine determinism and JSON-safe state**
    - **Validates: Requirements 10.1, 10.2, 10.7**
    - Generator: driver choices. For every driven state and every valid event, calling `advance` twice with the same state and event returns equal results; every state and instruction survives `JSON.parse(JSON.stringify(x))` with `toStrictEqual`.
    - Test file: `packages/core/src/exorcism/engine.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check the engine is deterministic`
    - _Requirements: 10.1, 10.2, 10.7_

- [x] 5. Recording and replay
  - [x] 5.1 Add `parseRecording` and `formatRecording`
    - Create `exorcism/recording.ts` with `parseRecording(jsonText)` as in the design "Recording and replay": `JSON.parse` in try/catch; the report is validated with `parseReport(JSON.stringify(report))` and a report with repeated ghost paths gives `INVALID_SESSION`; progress with the exported guard of `progress.ts` (or `null`); profile `{ knowsJava: boolean }` or `null`; each event with `parseEvent` plus the `sampleAnswer` rule (allowed only on `answer-rated` and `dont-know`, and it must be a string; the key is kept when present and never present with `undefined`). Any failure is `INVALID_SESSION` with an English message. `formatRecording` is `JSON.stringify`.
    - Write `recording.test.ts` (unit tests): a small valid recording written by hand parses back equal; invalid JSON; a bad report; repeated ghost paths; a bad event; a non-string `sampleAnswer`; `sampleAnswer` on a `retry-ghost` event; a recording with `sampleAnswer` round-trips strictly.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): parse and format session recordings`
    - _Requirements: 11.1, 11.2, 11.5, 11.6, 11.8_

  - [x] 5.2 Add `replay`
    - In `recording.ts` add `replay(recording)`: `startSession(report, { progress, profile })` (a `null` means "not given") gives `steps[0]`; each event runs through `advance`; on `ok: false` return `INVALID_SESSION` with `Event <i> (<type>) is not accepted in the step "<step>".` plus the engine message. `sampleAnswer` is never read.
    - Extend `recording.test.ts`: a short hand-written recording replays to the expected steps; an event in the wrong step gives `INVALID_SESSION` with its position; `replay` twice gives equal results; a recording with `sampleAnswer` replays the same as one without.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): replay a recorded session`
    - _Requirements: 11.3, 11.4, 11.8, 11.9_

  - [x] 5.3 Add the committed fixture and its end-to-end replay test
    - Create `exorcism/tinySession.testutil.ts` exporting a small `SessionRecording` (3 ghosts with texts, `report` valid for `parseReport`) as a TypeScript object and as a JSON string. Build it by running the engine, so the events are valid. It walks through: one ghost passed (with a self-check), one question answered with `dont-know` twice, one ghost failed, and a retry. Texts the Tutor wrote are short English fixed strings; include a `sampleAnswer` on at least one event.
    - In `recording.test.ts` add the end-to-end test: the JSON string passes `parseRecording`; `replay` succeeds; the expected steps are checked at fixed positions (for example the step after the second `dont-know`, the step after the failing decision, the step after `retry-ghost`); removing every `sampleAnswer` gives the same replay.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): add a recorded session fixture`
    - _Requirements: 11.1, 11.3, 11.7, 11.9_

  - [x] 5.4 Property test for replay
    - **Property 16: Replay equals the live session**
    - **Validates: Requirements 11.3**
    - Generator: driver choices, recorded as events (`recording = { report, progress: null, profile, events }`). Checks: `replay` called twice returns the same steps, and they equal the states and instructions the live driver produced (`steps[0]` is the start; `steps[i]` is the result of event `i`).
    - Test file: `packages/core/src/exorcism/recording.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check replay equals the live session`
    - _Requirements: 11.3_

- [x] 6. Public API and purity
  - [x] 6.1 Export the public API
    - Create `exorcism/index.ts` exporting: `startSession`, `advance`, `decide`, `parseEvent`, `ALLOWED_EVENTS`, `buildInstructions`, `formatVerdict`, `parseVerdict`, `classifyFileKind`, `QUESTION_SETS`, `suggestGhost`, `isPickable`, `normaliseProgress`, `parseProgress`, `formatProgress`, `hauntedShare`, `parseRecording`, `formatRecording`, `replay`, and all public types (`SessionState`, `ExorcismEvent`, `ExorcismProgress`, `SessionRecording`, `TutorInstructions`, `ExorcismStep`, `Rating`, `Verdict`, `FileKind`, `StudentProfile`, `ExorcismErrorInfo`, ...). Do not export test helpers.
    - In `packages/core/src/index.ts` add `export * from "./exorcism/index.js";` (keep the existing ghost-detection export). Check that no exported name clashes with a ghost-detection export (the design prefixes the names for this reason).
    - Extend `packages/core/src/index.test.ts`: importing from `./index.js` gives the exported functions, and a short session started from a report built with `buildReport` runs one `advance` step.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): export the exorcism API`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 6.2 Add the static purity test
    - Create `exorcism/purity.test.ts`. It reads the non-test source files of `packages/core/src/exorcism/` as text with `import.meta.glob("./*.ts", { query: "?raw", import: "default", eager: true })`, excluding `*.test.ts` and `*.testutil.ts` by file name, and starts with `/// <reference types="vite/client" />` (`vite` is already installed; no new dependency).
    - It fails on real uses only: `new Date`, `Date.now`, `Math.random`, `process.`, `fetch(`, `require(`, and imports from `node:`. It must not match the English rule sentences (use the patterns above, not loose words). Add one negative self-check in the same test: the pattern list matches a small inline string with each forbidden use, so the test cannot pass by matching nothing.
    - Fallback described in the design: if `npm run build` rejects the file (the `core` tsconfig has `types: []`), exclude `purity.test.ts` from the `core` tsconfig build so it still runs in Vitest, and say so in the final report.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check exorcism code stays pure`
    - _Requirements: 9.2, 9.3, 10.1_

- [x] 7. Docs and pull request
  - [x] 7.1 Update `PLAN.md`
    - Mark the exorcism spec as done in "Siguientes" and "Hecho"; add "Para retomar" notes: what exists in `packages/core/src/exorcism/`, how to start a session and replay a recording, that the Tutor text is only checked by manual spikes (`docs/spike-explicacion.md` and the 11 Nov spike), and that the next specs (Power, web) will use the engine and the committed fixture. Record the seven optional properties still pending in "Pendientes" (Low), and that `.kiro/specs/ghost-detection/design.md` has a pointer to the new Ghost_Sentence section. `PLAN.md` may stay in Spanish.
    - Verify: `npm run check` exits `0` and `git status --short` shows only `PLAN.md` and `tasks.md`.
    - Commit message: `docs: mark exorcism spec as done in the plan`
    - _Requirements: 9.4, 9.5_

  - [x] 7.2 Add the line to `docs/kiro-usage-log.md`
    - Append one line about the exorcism spec, in the same style as the previous lines of that file (`docs/*.md` may stay in Spanish).
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: log Kiro usage for the exorcism spec`
    - _Requirements: 9.5_

  - [x] 7.3 Final check and pull request
    - Run `npm run check` from a build-first state (`npm run build` before `npm test`); it must exit `0` with no network access needed. Check `git status --short` prints nothing.
    - Count the changed lines of the branch against `main` with `git diff --stat main...HEAD`, excluding `package-lock.json`, and write that number in the pull request description. The description also says that the pull request exceeds about 500 lines because the tests are large, that one single pull request is the owner's decision, and that it will be reviewed by task groups.
    - Mark this task `[x]`, commit `tasks.md` (commit message: `docs: close the exorcism task list`), and push with `git push -u origin feat/exorcism`.
    - Open the pull request with `gh pr create --body-file` using `.github/pull_request_template.md` filled in. Title under 70 characters, for example `feat: add exorcism engine`. The description says: what was built, that the Tutor text is covered only by manual spikes, that the seven `aplazable` properties may arrive later as extra commits, and that nothing was merged.
    - Never merge: Luis Miguel merges on GitHub.
    - Verify: `npm run check` exits `0`.
    - Commit message: `docs: close the exorcism task list`
    - _Requirements: 9.4, 9.5, 9.6_

- [ ] 8. Optional: deferred properties (only if time allows)
  - These are done after the pull request is opened, and only if time allows. Pull request #14 is already merged: if they are done, they go on a new branch feat/exorcism-properties created from an up-to-date main, one commit each, and a new pull request. They are not needed for the 20 Nov minimum. Their example-based unit tests are already part of the mandatory tasks above.
  - [ ]* 8.1 Property test for the file kind
    - **Property 3: File kind is a single stable label**
    - **Validates: Requirements 4.1, 4.2**
    - Generator: `textArb` (existing) and `fc.constantFrom` of the four languages. `classifyFileKind` returns one of the four kinds and the same kind when called twice with the same input.
    - Test file: `packages/core/src/exorcism/fileKind.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check file kind is stable`
    - _Requirements: 4.1, 4.2_

  - [ ]* 8.2 Property test for the progress round trip
    - **Property 7: Progress round trip**
    - **Validates: Requirements 7.4**
    - Generator: `progressArb` (task 2.8) with unique paths. `parseProgress(formatProgress(p))` returns an equal progress.
    - Test file: `packages/core/src/exorcism/progress.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check progress round trip`
    - _Requirements: 7.4_

  - [ ]* 8.3 Property test for the haunted share range
    - **Property 8: Haunted share range**
    - **Validates: Requirements 7.7, 7.8**
    - Generator: `reportArb` (including the empty list) and a progress that may contain extra paths. `hauntedShare` is a number from 0 to 1; it is 1 when the report has at least one ghost and none is exorcised; it is 0 when all report ghosts are exorcised; it is 0 (not `NaN`) when the report has no ghosts.
    - Test file: `packages/core/src/exorcism/progress.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check haunted share range`
    - _Requirements: 7.7, 7.8_

  - [ ]* 8.4 Property test for the haunted share monotonic rule
    - **Property 9: Haunted share is monotonic**
    - **Validates: Requirements 7.9**
    - Generator: as property 8, plus the index of a ghost to mark `exorcised`. Marking one more ghost does not raise `hauntedShare`.
    - Test file: `packages/core/src/exorcism/progress.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check haunted share never rises`
    - _Requirements: 7.9_

  - [ ]* 8.5 Property test for the sentence determinism
    - **Property 10: Ghost sentence is deterministic**
    - **Validates: Requirements 8.6**
    - Generator: `fc.record` of four non-negative integers (some above the caps). `reasonFor` called twice returns the same string.
    - Test file: `packages/core/src/ghost-detection/factors.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check ghost sentence is deterministic`
    - _Requirements: 8.6_

  - [ ]* 8.6 Property test for the recording round trip
    - **Property 15: Recording round trip**
    - **Validates: Requirements 11.1, 11.2**
    - Add `recordingArb` to `sessionArb.testutil.ts`: a `reportArb` with unique paths, a normalised or `null` progress, a profile or `null`, and the events of a driver session with random `sampleAnswer` strings on `answer-rated` and `dont-know` (the key absent when not generated). `parseRecording(formatRecording(r))` returns an equal recording.
    - Test file: `packages/core/src/exorcism/recording.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check recording round trip`
    - _Requirements: 11.1, 11.2_

  - [ ]* 8.7 Property test that sample answers are ignored
    - **Property 17: Sample answers are ignored**
    - **Validates: Requirements 11.8, 11.9**
    - Generator: `recordingArb` plus a function that rewrites `sampleAnswer` (remove, replace with another string, add to every eligible event). The replay gives the same states and instructions in every case.
    - Test file: `packages/core/src/exorcism/recording.test.ts`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): check sample answers are ignored`
    - _Requirements: 11.8, 11.9_

## Notes
- Mandatory tasks are 1 to 7. Group 8 is optional (marked with `*`) and is done only after the pull request is open and only if time allows.
- The ten properties labelled `mínimo` in the design (P1, P2, P4, P5, P6, P11, P12, P13, P14, P16) are mandatory tasks. P2, P4, P5, P6, P12 and P13 are placed after the driver (tasks 4.7 to 4.12) because they need `driveSession`; P6 also needs the full engine for its second check.
- The example tests of the criteria behind the seven `aplazable` properties stay mandatory inside the tasks of their code.
- The Tutor text cannot be tested by any automated test; it is covered by the manual spikes (`docs/spike-explicacion.md` and the 11 Nov spike). No live test is needed because the engine uses no external service.
- Drop-first order if time runs short: group 8 as a whole; then the extra edge-case examples in tasks 4.3 to 4.5 that are not tied to a table row; never cut the ten mandatory properties, the purity test or the replay fixture.
- Deadline for the minimum version: 20 Nov 2026.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["2.1"] },
    { "id": 6, "tasks": ["2.2"] },
    { "id": 7, "tasks": ["2.3"] },
    { "id": 8, "tasks": ["2.4"] },
    { "id": 9, "tasks": ["2.5"] },
    { "id": 10, "tasks": ["2.6"] },
    { "id": 11, "tasks": ["2.7"] },
    { "id": 12, "tasks": ["2.8"] },
    { "id": 13, "tasks": ["2.9"] },
    { "id": 14, "tasks": ["2.10"] },
    { "id": 15, "tasks": ["2.11"] },
    { "id": 16, "tasks": ["2.12"] },
    { "id": 17, "tasks": ["3.1"] },
    { "id": 18, "tasks": ["4.1"] },
    { "id": 19, "tasks": ["4.2"] },
    { "id": 20, "tasks": ["4.3"] },
    { "id": 21, "tasks": ["4.4"] },
    { "id": 22, "tasks": ["4.5"] },
    { "id": 23, "tasks": ["4.6"] },
    { "id": 24, "tasks": ["4.7"] },
    { "id": 25, "tasks": ["4.8"] },
    { "id": 26, "tasks": ["4.9"] },
    { "id": 27, "tasks": ["4.10"] },
    { "id": 28, "tasks": ["4.11"] },
    { "id": 29, "tasks": ["4.12"] },
    { "id": 30, "tasks": ["5.1"] },
    { "id": 31, "tasks": ["5.2"] },
    { "id": 32, "tasks": ["5.3"] },
    { "id": 33, "tasks": ["5.4"] },
    { "id": 34, "tasks": ["6.1"] },
    { "id": 35, "tasks": ["6.2"] },
    { "id": 36, "tasks": ["7.1"] },
    { "id": 37, "tasks": ["7.2"] },
    { "id": 38, "tasks": ["7.3"] },
    { "id": 39, "tasks": ["8.1"] },
    { "id": 40, "tasks": ["8.2"] },
    { "id": 41, "tasks": ["8.3"] },
    { "id": 42, "tasks": ["8.4"] },
    { "id": 43, "tasks": ["8.5"] },
    { "id": 44, "tasks": ["8.6"] },
    { "id": 45, "tasks": ["8.7"] }
  ]
}
```
