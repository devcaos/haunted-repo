# Implementation Plan: kiro-power

## Overview

This plan builds the Kiro Power of `design.md` in small steps. The biggest risk goes first: a bundled server file that Kiro can run from a plain copy of `packages/power/`, a stdio smoke test, and a CI step that fails when the committed bundle is stale. Then come the pure modules (data file, store, network guard), the `HauntedPower` class and one task per tool, the strict verdict flow with its properties, the Tutor_Skill and the manifest, the live test, and finally the manual check in Kiro.

Rules for every task:

- Language: TypeScript 6 (strict) on Node.js 24. Scripts work on Windows PowerShell. Exact dependency versions only.
- Check the current documentation of a library before using it (`@modelcontextprotocol/sdk` 1.32.2, `zod` 4.6.7, `esbuild` 0.28.2, `fast-check` 4.10.2).
- `packages/core/` is never changed (Requirement 11.1).
- Tests never touch the network, except `ghostText.live.test.ts` (`npm run test:live`).
- Every task ends with `npm run check` passing, then one commit (one commit = one thing). Before that commit, mark the task `[x]` in this file and include `tasks.md` in the same commit.
- Every task that changes code reachable from `src/server.ts` also commits the rebuilt `packages/power/bundle/server.mjs` in the same commit (`npm run check` rebuilds it; the CI step of task 1.4 fails otherwise).
- Property tests use fast-check with at least 100 runs and start with the comment `// Feature: kiro-power, Property <n>: <text>`.
- Before opening each PR, count changed lines without `package-lock.json` and `packages/power/bundle/` (`git diff --stat main`). If over 900, split it into stacked PRs (PR 3 and PR 4 are the likely ones).

The work is split into five pull requests of under about 900 lines each (lockfile and the generated bundle not counted), plus the final manual check.

## Tasks

### PR 1: Bundle first (biggest risk)

- [x] 1. Bundled server, smoke test and CI check
  - [x] 1.1 Add the dependencies, the bundle script and a stub server
    - In `packages/power/package.json`: dependencies `@haunted-repo/core` `0.0.0`, `@modelcontextprotocol/sdk` `1.32.2`, `zod` `4.6.7`; development dependency `esbuild` `0.28.2`; script `"build": "tsc --noEmit && node scripts/bundle.ts"` (design section 2).
    - Run `npm install` from the root and commit `package-lock.json`; check that the lockfile contains the Linux esbuild entry (`@esbuild/linux-x64`) so `npm ci` works in CI.
    - `packages/power/tsconfig.json`: remove `outDir` and `rootDir`, add `"noEmit": true`, include `src` and `scripts`.
    - `scripts/bundle.ts`: esbuild `build()` with `entryPoints: ["src/server.ts"]`, `bundle: true`, `platform: "node"`, `target: "node24"`, `format: "esm"`, `outfile: "bundle/server.mjs"`, `minify: false`, `legalComments: "none"`, `sourcemap: false`, `alias: { "@haunted-repo/core": "../core/src/index.ts" }` and the one-line `createRequire` banner.
    - `src/server.ts`: reads `PLUGIN_DATA` (unused for now), creates the MCP server and connects `StdioServerTransport`. `src/register.ts`: registers the six tools (`find_ghosts`, `continue_house`, `pick_ghost`, `send_event`, `judge_answer`, `house_status`) with their zod input schemas from design section 4 and stub handlers that answer `NO_SESSION` with `isError: true`. Each handler is wrapped in the `try/catch` that returns `INTERNAL` (design "Error Handling").
    - `eslint.config.js`: add `**/bundle/` to `globalIgnores`. `.prettierignore`: add `packages/power/bundle/`.
    - Commit the generated `packages/power/bundle/server.mjs`.
    - _Requirements: 1.3, 1.7, 1.9, 11.2_

  - [x] 1.2 Remove the spike leftovers and point `mcp.json` to the bundle
    - Delete `packages/power/src/spike/`, `packages/power/skills/haunted-spike/`, the placeholder `src/index.ts` and `src/index.test.ts` (`add`).
    - `mcp.json`: one stdio server `haunted-repo` with `"command": "node"`, `"args": ["${PLUGIN_ROOT}/bundle/server.mjs"]`, no `env`; remove the `spike-relative` entry.
    - The ignored local folder `packages/power/dist/` can be deleted by hand (not a commit).
    - _Requirements: 1.3, 1.6, 11.3_

  - [x] 1.3 Write the stdio smoke test `src/bundle.smoke.test.ts`
    - Start `bundle/server.mjs` with the SDK `Client` and `StdioClientTransport`, with `PLUGIN_DATA` set to a new temporary folder (`fs.mkdtemp` in `os.tmpdir()`).
    - Check that `listTools` returns exactly the six tool names, and that `house_status` answers `isError: true` with code `NO_SESSION`.
    - Check that the bundle text contains no test file names (`.test.`, `.testutil.`).
    - No network call.
    - _Requirements: 1.6, 1.7, 1.9, 9.3, 11.8_

  - [x] 1.4 Add the CI step that checks the committed bundle
    - In `.github/workflows/ci.yml`, after `npm run check`: `test -z "$(git status --porcelain -- packages/power/bundle)" || { git status --porcelain -- packages/power/bundle; exit 1; }`.
    - Determinism check (design doubt 12.4): on the PR, confirm the CI job passes with the bundle built on Windows. If it fails, compare the first different lines with `git diff` before changing any esbuild option (`charset: "utf8"` does not fix path differences). If it still differs, stop and ask the director (options in doubt 12.4).
    - _Requirements: 1.9_

  - [x] 1.5 Add the ESLint `no-console` rule for `packages/power/src`
    - One rule block in `eslint.config.js` for `packages/power/src/**/*.ts`, so nothing writes to the stdio output by mistake (design doubt 6). Logs, if any, use `process.stderr.write`.
    - _Requirements: 1.7, 4.7_

  - [x] 1.6 Quick check in Kiro (done by the director, not automatable)
    - Uninstall the spike Power, install with "Import power from a folder" from `packages/power/` of the PR 1 branch, check that the six tools appear and that `house_status` answers `NO_SESSION`.
    - Write two lines in `docs/spike-power.md`.
    - _Requirements: 1.5, 1.9_

- [x] 2. Checkpoint: PR 1
  - Ensure all tests pass, ask the user if questions arise.

### PR 2: Data file, store and network guard

- [x] 3. Pure modules and the store
  - [x] 3.1 Implement `src/dataFile.ts` (name, serialise, parse)
    - `dataFileName(owner, repo)`: `haunted-repo--<owner>@<repo>.json` in lowercase; re-checks owner `[a-z0-9-]+` and repo `[a-z0-9._-]+` and throws if one fails. `isOwnDataFile(name)` with `^haunted-repo--[a-z0-9-]+@[a-z0-9._-]+\.json$`.
    - `serialiseDataFile(report, progress)`: `{ format: 1, report, progress }` built from `JSON.stringify(report)` and `formatProgress(progress)`, no other keys.
    - `parseDataFile(text, fileName)`: `JSON.parse`, `format === 1`, `parseReport`, `parseProgress`, and owner/repo of the report (lowercase) equal to the file name; otherwise `INVALID_REPORT` or `INVALID_PROGRESS` with a message that names the file.
    - Unit tests: invalid JSON, wrong `format`, invalid report, invalid progress, owner mismatch, mixed-case names.
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.11_

  - [x]* 3.2 Write the property test for safe file names
    - **Property 5: Safe file names**
    - Owners and repos accepted by `parseRepoUrl` in any letter case; the name is lowercase, matches the own-file pattern, has no path separator, `path.join(folder, name)` stays inside `folder`, and references that differ in more than letter case give different names.
    - **Validates: Requirements 7.1, 7.11**

  - [x] 3.3 Implement `src/store.ts` with the folder store and the memory store
    - One `Store` interface (`read(name)`, `write(name, text)`); `read` distinguishes "does not exist" from other read errors.
    - Folder store: write to `<name>.<random>.tmp` in the same folder, then `rename` over the final name; on a failed write, try to delete the temporary file and leave the final file untouched. It only opens names that pass `isOwnDataFile` and never lists the folder.
    - Memory store: a `Map` of file name to text.
    - `openStore(pluginData)`: returns the folder store if `PLUGIN_DATA` is set, the folder can be created, and a probe file `haunted-repo--probe.tmp` can be written and deleted; otherwise the memory store and `storageOk: false`.
    - Unit tests with a temporary folder: write then read, no `.tmp` left after a write, a failed write keeps the old file, no `PLUGIN_DATA`, `PLUGIN_DATA` pointing to a file.
    - `store.ts` is the only module that imports `node:fs`.
    - _Requirements: 7.1, 7.6, 7.10, 7.11, 9.1_

  - [x] 3.4 Add the Windows rename retries to the folder store
    - When `rename` fails with `EPERM`, `EBUSY` or `EACCES`, retry up to 5 times, waiting 50, 100, 200, 400 and 800 ms, then report a failed save. Other error codes fail at once.
    - `rename` and the wait function are injectable, so tests do not really wait.
    - Unit tests: a rename that fails twice with `EPERM` and then works (save succeeds); a rename that always fails with `EBUSY` (6 attempts, then failure); an `ENOSPC` failure (no retry).
    - _Requirements: 7.6_

  - [x] 3.5 Write the property test for the save round-trip
    - **Property 3: Save round-trip**
    - `reportArb` and `progressArb` (through the `core-testutil/` alias) with a real temporary folder: save, read back, equal report and progress; the file has only the keys `format`, `report` and `progress`.
    - Add the `core-testutil/` alias here: root `vitest.config.ts` aliases `core-testutil/` to `packages/core/src/`, and `packages/power/tsconfig.json` has the same prefix in `paths` (design section 3).
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.8**

  - [x] 3.6 Implement `src/guardFetch.ts`
    - `guardFetch(fetch)` returns a `fetch` that parses the request URL with `new URL()` and throws, without calling the inner `fetch`, if it does not parse or its origin is not exactly `https://api.github.com`. It never adds an `Authorization` header.
    - Unit tests: `https://example.com/repos/a/b` and `https://api.github.com.evil.example/` are refused and the inner `fetch` is never called; a URL under `https://api.github.com/` reaches it unchanged.
    - _Requirements: 4.9, 7.7, 8.1, 8.2_

- [x] 4. Checkpoint: PR 2
  - Ensure all tests pass, ask the user if questions arise.

### PR 3: HauntedPower, find_ghosts, continue_house, house_status

- [x] 5. Session and house tools
  - [x] 5.1 Add the strict fake GitHub helper
    - The `core-testutil/` alias already exists (task 3.5).
    - `src/testGitHub.testutil.ts`: wraps the strict fake of `core-testutil/ghost-detection/fakeGitHub.testutil.js` and adds only `User-Agent: vitest`, like `detectGhosts.test.ts`; strict in every other way.
    - A small test that the wrapper still rejects what the fake rejects (for example an unknown path).
    - _Requirements: 11.1, 11.5_

  - [x] 5.2 Implement the `HauntedPower` skeleton and `src/messages.ts`
    - `src/power.ts`: class `HauntedPower` with constructor arguments `fetch`, `store` and `storageOk`; one in-memory session `{ owner, repo, report, state, invalidCount }`; one internal promise queue so public methods run one at a time.
    - The queue survives a failed call: chain each call so that a rejected promise never blocks the next one (for example `const run = this.queue.then(fn); this.queue = run.catch(() => {}); return run;`). Unit test: a call that throws, then a second call that still runs and answers.
    - Helpers that build the session answer `{ ok: true, step, allowedEvents, instructions, hauntedShare, message, warning? }` (with `instructions` equal to the `text` of `buildInstructions(state)` unchanged and `allowedEvents` equal to `ALLOWED_EVENTS[step]`) and the error answer `{ ok: false, code, message, step?, allowedEvents? }`.
    - `NO_SESSION` for every session tool when there is no session.
    - `src/messages.ts`: every English text the Power_Server writes.
    - `power.ts` imports neither the MCP SDK nor `node:fs`.
    - Unit tests: `NO_SESSION` for each session method; the queue runs two calls in order.
    - _Requirements: 4.1, 4.2, 9.3, 11.5_

  - [x] 5.3 Implement the `find_ghosts` tool
    - `parseRepoUrl`; read the Repository_Data_File before any network call; refuse with `DATA_EXISTS`, `INVALID_REPORT` or `INVALID_PROGRESS` (message names the file and says to ask the Student before `replace: true`) when a file exists and `replace` is not `true`.
    - Otherwise `detectGhosts`, save `{ report, progress }` with all ghosts `haunted`, `startSession(report, { profile: { knowsJava: knowsJava ?? false } })`, and return the ghosts (path, floor, score, reason, report order), `hauntedShare`, `suggested` (`suggestGhost`), and the `choosing` instructions. `partial` adds the incomplete-list warning; `fewFiles` adds the report `message`.
    - Detection errors return their code with the English message; `REPO_NOT_FOUND` says only public repositories work and the URL may be wrong, never asks for a token.
    - With `replace: true`, only the file of that repository is replaced.
    - Add `src/createPower.ts` (no MCP SDK, no `node:fs`): `createPower(pluginData, baseFetch)` calls `openStore(pluginData)` and returns `new HauntedPower({ fetch: guardFetch(baseFetch), store, storageOk })`. `server.ts` calls `createPower(process.env.PLUGIN_DATA, globalThis.fetch)` once and passes the Power to `register.ts`.
    - Wire the real handler in `register.ts` and rebuild the bundle.
    - Unit tests with the fake GitHub and a temporary folder: success, each detection error code, `partial`, `fewFiles`, `DATA_EXISTS`, broken files, `replace: true`, another repository's file unchanged.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.8, 7.2, 7.5, 8.1_

  - [ ]* 5.4 Write the property test for "no change without `replace`"
    - **Property 6: No change without `replace`**
    - Folder states: no file, a valid file, a file with arbitrary broken content. After `find_ghosts` without `replace: true`, every file is byte-identical and the recording fetch saw no request when a file existed.
    - **Validates: Requirements 2.2, 2.7, 7.5**

  - [x] 5.5 Implement the `continue_house` tool
    - No network. Read the Repository_Data_File, start a new session with `startSession(report, { progress, profile })`, drop any attempt in memory. `NO_DATA` when there is no file; `INVALID_URL`, `INVALID_REPORT`, `INVALID_PROGRESS` as in the design.
    - Wire the real handler in `register.ts` and rebuild the bundle.
    - Unit tests: exorcised ghosts stay exorcised; `NO_DATA`; broken file; the recording fetch sees no request.
    - _Requirements: 4.1, 4.8, 7.5, 7.9, 9.1, 9.2_

  - [x] 5.6 Implement the `house_status` tool
    - Return each ghost (path, floor, `haunted` or `exorcised`), `hauntedShare(report, progress)` as a number, and English text such as "3 of 5 ghosts still haunt this house".
    - Wire the real handler in `register.ts` and rebuild the bundle; update the smoke test only if its expectations change (it still expects `NO_SESSION` with no session).
    - Unit tests: share and text after `find_ghosts`; `NO_SESSION`.
    - _Requirements: 10.1, 10.2, 9.3_

  - [x] 5.7 Implement the `PLUGIN_DATA` memory fallback and the warning-once rule
    - `HauntedPower` keeps a `storageOk` flag: the first answer of a run that starts in memory mode carries `warning: "Your progress will not be saved: ..."`; no new warning while the state does not change; a failing save sets the flag to false and adds the warning once; a later successful save sets it back to true. The session continues in memory after a failed save.
    - Rebuild the bundle.
    - Unit tests: no `PLUGIN_DATA`; `PLUGIN_DATA` is a file; a save that fails after start-up (warning once, session kept); a later save that works clears the state; `continue_house` works within one run in memory mode.
    - _Requirements: 7.6, 7.10_

- [x] 6. Checkpoint: PR 3
  - Ensure all tests pass, ask the user if questions arise.

### PR 4: Exorcism tools and the strict verdict

- [ ] 7. Exorcism tools
  - [x] 7.1 Implement the `pick_ghost` tool
    - Check that the step allows `pick-ghost` and that `isPickable` is true **before** any request; else `INVALID_EVENT` with the allowed events.
    - Read the Ghost_Text with a new `createGitHubClient({ fetch })` and `getFileText(owner, repo, report.overview.ref, path)`; send `{ type: "pick-ghost", path, text }` to `advance` with the text unchanged.
    - Any read error returns `GHOST_TEXT_UNREADABLE` (with the core message when it has one), no crash, state unchanged.
    - Wire the real handler in `register.ts` and rebuild the bundle.
    - Unit tests: success (step `explaining`, text unchanged); 404; not text; the request budget error; pick from `failed`; queue test (start `pick_ghost` with a slow fake fetch, call `send_event` before it resolves, final state equals the two calls run one after the other).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.5_

  - [ ] 7.2 Implement the `send_event` tool
    - Build the event from `type`, `text` and `answer`, check it with `parseEvent`, call `advance`. `INVALID_EVENT` returns the Engine message and the allowed events, state unchanged.
    - Save rule: after every accepted `advance`, compare `formatProgress(state.progress)` with the saved text and save before answering if it changed.
    - Reset `invalidCount` to 0 after any accepted `advance`.
    - In `failed`, return the two options of the Engine; in `house-clean`, the Engine message and `hauntedShare: 0`.
    - Wire the real handler in `register.ts` and rebuild the bundle.
    - Unit tests: `explanation-done`, `self-check-answered` (progress saved), `retry-ghost`, `leave-ghost`, an event the step does not allow, `failed`, `house-clean`.
    - _Requirements: 4.4, 4.5, 4.10, 4.11, 4.12, 6.3, 6.4, 7.3, 9.4_

  - [ ] 7.3 Implement `src/verdictGate.ts` and the `judge_answer` tool
    - `MAX_VERDICT_RETRIES = 2`. The strict flow of design section 7: no session gives `NO_SESSION`; step not `asking` gives `INVALID_EVENT` before `parseVerdict` and leaves the count unchanged; `parseVerdict(judgement)` with the text exactly as received (no `trim`, no search, no default).
    - Accepted: count to 0; question is `pendingQuestion` when not `null`, otherwise the Tutor's text; send `answer-rated` (`right`, `half-right`, `wrong`) or `dont-know`; save if progress changed. A refusal by `advance` (blank question) gives `INVALID_EVENT`, state unchanged.
    - Rejected: count + 1; at most 2 gives a Verdict_Retry (`INVALID_VERDICT`, `retry: true`, `triesLeft = 3 - count`, the message of `parseVerdict`, the four allowed lines, "do not ask the Student again"); 3 gives a Verdict_Failure (`VERDICT_FAILED`, `retry: false`, count to 0, step, allowed events and instructions of the unchanged state).
    - The gate functions in `verdictGate.ts` are pure.
    - Wire the real handler in `register.ts` and rebuild the bundle.
    - Unit tests: table-driven invalid judgements of 5.10 (empty, only spaces, bold, leading space, full stop, two `VERDICT:` lines; trailing spaces accepted; an indented `VERDICT:` line is not a second line); first and second "I don't know" with the `pendingQuestion` check; retry texts and `triesLeft`; Verdict_Failure.
    - _Requirements: 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.10, 5.11, 6.2, 6.3, 6.4, 9.4_

  - [ ] 7.4 Write the property test for the strict verdict, and see it fail once
    - **Property 1: Strict verdict**
    - Drive `HauntedPower` directly with the `tinyRecording` report. Generator: valid judgements (random reason, then one of the four `VERDICT:` lines, optional trailing spaces, optional CRLF) mixed with near misses (leading space, bold, full stop, lowercase `verdict: right`, two `VERDICT:` lines with an invalid last one, empty, only spaces). The check compares the step and the ratings of the Session_State after the call with what `parseVerdict` returns for the same text; the return code alone is not enough.
    - Mutation check: temporarily add `.trim()` before `parseVerdict` in the gate, run the test and see Property 1 fail on a leading-space near miss; revert the change; write one line with the result in `docs/kiro-usage-log.md`.
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.8, 6.2**

  - [ ] 7.5 Write the property test for the bounded retry, and see it fail once
    - **Property 2: Bounded retry**
    - Random sequences of `judge_answer` calls (valid and invalid judgements) and calls when the step is not `asking`. Check: at most 2 Verdict_Retries in a row; the third consecutive rejection is a Verdict_Failure; the count is 0 after a Verdict_Failure or an accepted Verdict; after each rejected judgement the Session_State equals the one before and no Event was sent; a call outside `asking` leaves count and state unchanged.
    - Mutation check: temporarily remove the count reset after a Verdict_Failure, run the test and see Property 2 fail; revert the change; write one line with the result in `docs/kiro-usage-log.md`.
    - **Validates: Requirements 5.4, 5.6, 5.7, 5.9, 5.11, 9.4**

  - [ ] 7.6 Write the property test for the network allowlist
    - **Property 4: Network allowlist**
    - Wrap the fake `fetch` in a recorder and build the Power with `createPower(tempFolder, recorder)`, so `guardFetch` sits in front of it as in `server.ts`. Feed random sequences of tool calls with URL-like strings and arbitrary paths. Every request the recorder saw parses with `new URL()`, has origin exactly `https://api.github.com`, and has no `Authorization` header.
    - **Validates: Requirements 4.9, 7.7, 8.1, 8.2, 8.3, 8.4**

  - [ ]* 7.7 Write the property test for foreign files
    - **Property 7: Foreign files untouched**
    - Random other files in the temporary Power_Data_Folder whose names do not match the own-file pattern; after any sequence of tool calls (with and without `replace: true`) they are byte-identical.
    - **Validates: Requirements 7.11**

  - [ ] 7.8 Write the full-walk and restart tests
    - A full exorcism walk with the `tinyRecording` report through `find_ghosts`, `pick_ghost`, `send_event` and `judge_answer` until the ghost is exorcised, checking the saved file after each change of progress.
    - Restart: a second `HauntedPower` on the same folder; `continue_house` keeps exorcised ghosts; an unfinished attempt is not resumed and its ghost stays `haunted`; the saved file before the stop is unchanged.
    - _Requirements: 4.1, 7.3, 7.9, 9.1, 9.2_

- [ ] 8. Checkpoint: PR 4
  - Ensure all tests pass, ask the user if questions arise.

### PR 5: Tutor_Skill, manifest and live test

- [ ] 9. Skill, manifest and live test
  - [ ] 9.1 Write the Tutor_Skill `skills/exorcise-ghosts/SKILL.md`
    - Front matter `name: exorcise-ghosts` and the description of design section 8.
    - The order of calls (ask for the URL and Java, `find_ghosts`, `DATA_EXISTS` handling with `continue_house` or `replace: true` only after the Student says yes, `pick_ghost`, the loop with `send_event` and `judge_answer`, self-check, `failed`, `house-clean`, `house_status`, `continue_house` after a restart and ask about Java again).
    - The rules of design section 8, one line each (English only, one question per message, follow `instructions`, never show the model answer early, the exact four `VERDICT:` lines, "I don't know" in any language is `dont-know`, `INVALID_VERDICT` and `VERDICT_FAILED` handling, pass on a `warning` once, tools missing means check Node.js 24 and restart Kiro, keep the Judgement reason short).
    - _Requirements: 1.4, 1.8, 2.7, 4.3, 4.4, 4.8, 4.10, 4.11, 5.5, 6.1, 7.5, 9.2_

  - [ ] 9.2 Update `plugin.json` and write the manifest test
    - `plugin.json`: `$schema`, kebab-case `name`, `version` `0.1.0`, real `description`, `author.name`, keywords including `haunted`, `ghost`, `exorcise`, `exorcism`, `understand code`, and without `haunted spike`.
    - `src/manifest.test.ts`: reads `plugin.json`, `mcp.json` and the front matter of `SKILL.md`, and checks the fields of 1.1 to 1.4 (one stdio server, `${PLUGIN_ROOT}/bundle/server.mjs`, no `env`, skill `name` and `description` present).
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 9.3 Write the live test `src/ghostText.live.test.ts`
    - Matches `*.live.test.ts` of `vitest.live.config.ts`; uses the real `fetch` through `guardFetch` and a temporary folder.
    - `find_ghosts` for `https://github.com/lukeed/sirv`, then `pick_ghost` for the first ghost; the step is `explaining` and the Ghost_Text read is not empty. Same helpful rate-limit message as the core live test. About 9 requests.
    - Not part of `npm test` or `npm run check`; run it once with `npm run test:live` before the commit.
    - _Requirements: 3.1, 8.1, 11.6_

- [ ] 10. Checkpoint: PR 5
  - Ensure all tests pass, ask the user if questions arise.

### Final: manual check in Kiro (planned for about 22 Nov 2026)

- [ ] 11. Manual end-to-end check in Kiro IDE (done by the director with Kiro; not automatable)
  - [ ] 11.1 Install from the branch folder before merging and run the whole check
    - Install with "Import power from a folder" from `packages/power/` of the branch, before merging.
    - Run `find_ghosts` on `https://github.com/lukeed/sirv`, exorcise one ghost, answer "I don't know" once, and see at least one Verdict_Retry (the check may force one by asking the Tutor to end a judgement with a full stop).
    - Also check: the Tutor writes in English only, one question per message, does not leak the model answer, tells the Student about a `warning` once, and asks before sending `replace: true`.
    - Write the result in `docs/spike-power-e2e.md` (own docs commit).
    - _Requirements: 1.5, 1.8, 4.3, 5.4, 6.3, 11.7_

  - [ ] 11.2 Install from GitHub after merging and repeat one call
    - After the director merges, install again from `https://github.com/devcaos/haunted-repo/tree/main/packages/power` and repeat one `find_ghosts` call.
    - Add the result to `docs/spike-power-e2e.md` (own docs commit).
    - _Requirements: 1.5, 11.7_

## Notes

- Tasks marked with `*` are optional (Properties 5, 6 and 7) and can be cut first if the work runs late. Properties 1 to 4 are required by Requirement 11.4 and are not marked.
- Each task references the requirements it covers; every requirement of `requirements.md` is covered by at least one task (Requirement 0, the spike, is already done in `docs/spike-power.md`).
- Every task ends with `npm run check` passing and its own commit, which also marks the task `[x]` here. Every block that closes tasks also updates `PLAN.md` ("En curso", "Pendientes", "Para retomar").
- The design has no `node:fs` outside `store.ts` and no MCP SDK outside `register.ts` and `server.ts`; tasks keep that split.
- Not included (not in the approved design): the PLAN.md Lows about the SDK error -32602, a random suffix for the probe file, and a warning on every failed save. They stay in "Pendientes".
- Cut line (requirements): if late, cut first 2.7, 7.5, 9.2 and 10, which touch tasks 5.3 (the `replace` part), 5.4, 5.5 and 5.6.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["1.6"] },
    { "id": 5, "tasks": ["3.1", "3.6"] },
    { "id": 6, "tasks": ["3.2", "3.3"] },
    { "id": 7, "tasks": ["3.4"] },
    { "id": 8, "tasks": ["3.5"] },
    { "id": 9, "tasks": ["5.1"] },
    { "id": 10, "tasks": ["5.2"] },
    { "id": 11, "tasks": ["5.3"] },
    { "id": 12, "tasks": ["5.4", "5.5"] },
    { "id": 13, "tasks": ["5.6"] },
    { "id": 14, "tasks": ["5.7"] },
    { "id": 15, "tasks": ["7.1"] },
    { "id": 16, "tasks": ["7.2"] },
    { "id": 17, "tasks": ["7.3"] },
    { "id": 18, "tasks": ["7.4"] },
    { "id": 19, "tasks": ["7.5"] },
    { "id": 20, "tasks": ["7.6", "7.7"] },
    { "id": 21, "tasks": ["7.8"] },
    { "id": 22, "tasks": ["9.1", "9.3"] },
    { "id": 23, "tasks": ["9.2"] },
    { "id": 24, "tasks": ["11.1"] },
    { "id": 25, "tasks": ["11.2"] }
  ]
}
```
