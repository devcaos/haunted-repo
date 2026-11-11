# Implementation Plan: Ghost detection

## Overview
Plain TypeScript functions in the new shared package `packages/core` (`@haunted-repo/core`), folder `packages/core/src/ghost-detection/`. The order goes from the package skeleton, to the pure modules (types, URL, eligibility, key files, factors, score, report, parser), then the network client with a strict fake GitHub, then the orchestrator, then the live test and the public exports. Each task is one commit.

Rules for running these tasks:
- Kiro runs a task only when the project owner says so. Kiro asks permission before modifying code.
- Work on branch `feat/ghost-detection`, never on `main`. Never merge.
- Run every command from the repository root, in PowerShell.
- One task = one commit. A task is done only when its own tests and `npm run check` pass (exit code `0`). Then make its commit. If a commit message needs an "and", it is two commits.
- Task 1.2 is not a commit: it is a manual check by the project owner (Luis Miguel).
- Relative imports inside core use the `.js` extension (NodeNext). Tests sit next to the code as `*.test.ts`.
- Core code must not use Node-only APIs (`node:*`, `process`, `Buffer`). Only the globals `fetch`, `TextDecoder` and `AbortSignal` (Requirement 7.9).
- Every property test is one `fc.assert(fc.property(...), { numRuns: 100 })` with the comment `// Feature: ghost-detection, Property N: <title>`. Property tests are normal tasks (not optional), because the testing rule asks for them.
- Before using a library API (fast-check 4, Vitest 5), check its current documentation.
- Each task is meant to stay under about 150 changed lines. If it does not, stop and ask the owner how to split it.

## Tasks

- [x] 1. Core package skeleton
  - [x] 1.1 Create `packages/core` and verify the build order
    - Step 0: check the branch with `git branch --show-current`. If it is `main`, create it with `git checkout -b feat/ghost-detection`.
    - Create `packages/core/package.json` and `packages/core/tsconfig.json` exactly as in the design ("Package `@haunted-repo/core`": `types: []`, `lib: ["ES2023", "DOM"]`, `declaration: true`).
    - Create `packages/core/src/index.ts` with only `export {};` and `packages/core/src/index.test.ts` with one smoke test (for example `expect(true).toBe(true)`), so the package has one test file.
    - Run `npm install` so the workspace is linked. Check that `package-lock.json` only changes by the new workspace entry.
    - Edit the root `package.json` script `build` (currently `npm run build --workspaces`) to `"npm run build -w @haunted-repo/core && npm run build -w @haunted-repo/power && npm run build -w @haunted-repo/web"`. Check the workspace package names first (`@haunted-repo/power` and `@haunted-repo/web` exist; `core` must be named `@haunted-repo/core`). The build order is now explicit in the script and does not depend on folder names.
    - Verify: `npm run build` prints the packages built in the order `core`, then `power`, then `web` (the script itself lists them in that order; no folder renaming is needed), and `Test-Path packages/core/dist/index.d.ts` prints `True`. `git status --short` does not list `dist/`.
    - Verify the Node-types override: temporarily add `const p = process.cwd();` to `packages/core/src/index.ts`, run `npm run build`, expect a TypeScript error (TS2591) and exit code not `0`, then remove the line again.
    - Verify: `npm run check` exits `0`.
    - Commit message: `chore: add core package with explicit build order`
    - _Requirements: 7.7, 7.8, 7.9_

  - [x] 1.2 Manual check of the PostTaskExec hook (project owner, no commit)
    - This closes the "Medium (hook de tests)" item in `PLAN.md`, "Pendientes". It is a manual step for Luis Miguel. Kiro cannot do it, because earlier attempts to trigger the hook by editing `tasks.md` did not work.
    - Step A, provoke a failure: before pressing "Start task" on task 1.1, ask Kiro to leave a deliberate failing test in `packages/core/src/index.test.ts` (for example `expect(1).toBe(2)`) in the working tree. Do not commit it.
    - Step B: press "Start task" on a task in this file and let Kiro finish it. Look at the chat and the Kiro hook output after the task ends.
    - Step C, write down what you see: did the command hook (`npm run check` output) reach Kiro, did the agent hook run `npm run check`, did either report the failing test?
    - Step D: remove the deliberate failure so `npm run check` passes again.
    - Step E: note the result in `PLAN.md` (Pendientes, hook de tests: "comprobado" or "no funciona") in the final documentation task (15.2). If the hook does not work, record it in `docs/decisiones.md` under "Rechazado" or as a new Low item.
    - Result is for the owner to decide; nothing here changes code on its own.
    - _Requirements: 7.7_

- [x] 2. Shared types and errors
  - [x] 2.1 Add types, `DetectError` and Result helpers
    - Create `ghost-detection/types.ts` with all the types of the design "Data Models" (`Language`, `Floor`, `ErrorCode`, `DetectErrorInfo`, `Result<T>`, `RepoReference`, `FileEntry`, `Factors`, `Ghost`, `SkippedFile`, `Overview`, `HauntedReport`). There is no "exorcised" field.
    - Create `ghost-detection/errors.ts` with the `DetectError` class (carries a `DetectErrorInfo`, plus the internal code `NOT_TEXT` that is not part of the public `ErrorCode`), `ok(value)`, `fail(code, message)` and `isCode(error, code)`.
    - Write `errors.test.ts` (unit tests): `ok` and `fail` shapes, `DetectError` keeps `code` and `message`, `isCode` is `false` for a plain `Error`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add ghost detection types and errors`
    - _Requirements: 6.6, 6.7, 6.10_

- [ ] 3. Repository URL
  - [ ] 3.1 Add `parseRepoUrl` and `formatRepoUrl`
    - Create `ghost-detection/repoUrl.ts` following the design "`parseRepoUrl` rules" (trim, drop query and hash, optional scheme and `www.`, owner and repo character sets, `.git` suffix, ignore extra path parts, no ref ever read from the URL). `formatRepoUrl` returns `https://github.com/{owner}/{repo}`.
    - Error `INVALID_URL` uses the English message from the design, with an example URL.
    - Write `repoUrl.test.ts`: a table of accepted forms (with and without `https://`, `www.`, `.git`, trailing `/`, `/tree/main/src`, `/issues`) and rejected ones (empty, `gitlab.com/...`, missing owner, missing repo, `..` as repo). `parseRepoUrl` never throws for any `fc.string()`.
    - **Property 1: Repository URL round trip** (generators from the design: owner `^[A-Za-z0-9-]{1,20}$`, repo `^[A-Za-z0-9._-]{1,20}$` filtered to not end in `.git` and not be `.` or `..`).
    - **Validates: Requirements 1.1, 1.6, 1.7**
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): parse and format GitHub repository URLs`
    - _Requirements: 1.1, 1.2, 1.6, 1.7_

- [ ] 4. Eligibility
  - [ ] 4.1 Add `isEligible`
    - Create `ghost-detection/eligibility.ts` with `isEligible(path)` following the design "Eligibility" (extensions, excluded folders, excluded names such as `.d.ts`, `.min.js`, `.generated.`, `.gen.`, `.config.`, `.eslintrc.`, `setup.py`, and test files). Folder and extension checks are case-insensitive. Also export `languageOf(path)` (`.ts .tsx` TypeScript, `.js .jsx .mjs .cjs` JavaScript, `.java` Java, `.py` Python).
    - Write `eligibility.test.ts`: a table of examples for each rule of Requirement 3 (including `.d.ts`, `.min.js`, `setup.py`, `FooTest.java`, `__tests__/`, `node_modules/`, upper-case `SRC/Index.TS`), and `languageOf` for each extension.
    - **Property 2: Eligible set does not depend on order** (generator `pathArb` from the design; permutation by sorting with a random key).
    - **Validates: Requirements 3.6**
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add file eligibility rules`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [ ] 5. Key files
  - [ ] 5.1 Add `keyScore` and `rankKeyFiles`
    - Create `ghost-detection/keyFiles.ts` with `keyScore` (name 40, location 30/20/10/0, size 0 to 30 linear between 200 and 20,000 bytes) and `rankKeyFiles` (filter with `isEligible`, sort by score descending, then path ascending with `a < b`, not `localeCompare`).
    - Write `keyFiles.test.ts`: score table with boundary sizes 199, 200, 10,100, 20,000 and 20,001; location cases with 0, 1 and 2 folder levels (`src`, `app`, `lib` and another folder name); a monorepo path such as `packages/x/src/index.ts` gets 0 location points; tie broken by path.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): score and rank key files`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.8_

  - [ ] 5.2 Add `pickKeyFiles` and its property test
    - In `keyFiles.ts` add `pickKeyFiles(entries, max = 5)` (`rankKeyFiles(entries).slice(0, max)`).
    - Add unit tests: fewer than 5 eligible files returns all of them; ignored non-eligible files; 0 eligible files returns an empty list.
    - **Property 3: Picking is deterministic and bounded** (generator: `fc.uniqueArray` of `{ path, size }` with size 0 to 200,000, max 30 items, plus a permutation). Checks: same result twice, same result for any permutation, at most 5 items, all eligible, and with 5 or more eligible files the picked ones have the 5 highest scores.
    - **Validates: Requirements 4.5, 4.6, 4.9**
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): pick the five key files`
    - _Requirements: 4.5, 4.6, 4.9_

- [ ] 6. Factors
  - [ ] 6.1 Add `measureFactors`
    - Create `ghost-detection/factors.ts` with `measureFactors(text)` following the design "Factors": remove a leading BOM, split on `/\r?\n/`, cut each line to its first 500 characters, drop empty lines, comment lines start with `//`, `#`, `/*` or `*`, count `lines`, `branches` (`/\b(if|elif|for|while|switch|case|catch)\b/g` on non-comment lines), `maxIndent` (`tabs + floor(spaces / 4)`) and `imports`.
    - Write `factors.test.ts` with hand-written snippets: one per factor; `else if` counts once; `elif` counts once; a bare `else` does not count; a comment-only file; a line of 600 characters counts as one line; CRLF and LF give the same result; a BOM at the start; an empty file gives all zeros; tabs and spaces for indentation; `import`, `from x import y` and `require(` lines.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): measure file factors`
    - _Requirements: 5.1, 5.2, 5.5_

- [ ] 7. Difficulty score
  - [ ] 7.1 Add `difficultyScore` and its property tests
    - In `factors.ts` add `difficultyScore(f)` using the design formula (`part(value, cap, weight)` with lines 400/40, branches 60/30, maxIndent 8/20, imports 20/10, summed and rounded).
    - Add unit tests: all zeros gives 0; all factors at or above their caps give 100; one example for each factor alone (for example 200 lines alone gives 20).
    - Create `ghost-detection/textArb.testutil.ts` with the shared `textArb`, `lineArb` and `branchLineArb` generators of the design (any string without `\r`/`\n`, keyword lines, random indentation, comment lines, import lines, lines over 500 characters, the empty array).
    - **Property 4: Difficulty score is an integer from 0 to 100** — **Validates: Requirements 5.3, 5.6**
    - **Property 5: Measuring is deterministic** — **Validates: Requirements 5.7**
    - **Property 6: Adding a branching line never lowers the score** (a non-comment line with a Branching_Keyword appended after `\n`) — **Validates: Requirements 5.8**
    - **Property 7: Line endings do not matter** (text without `\r`, replace `\n` by `\r\n`, same factors and same score) — **Validates: Requirements 5.5, 5.9**
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): compute the difficulty score`
    - _Requirements: 5.3, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ] 7.2 Add `floorOf` and `reasonFor`
    - In `factors.ts` add `reasonFor(f)` (the four English sentences of the design table, tie order `lines`, `branches`, `maxIndent`, `imports`, and `It is very short and simple.` when all points are 0).
    - Create `ghost-detection/report.ts` with only `floorOf(score)` for now (`<= 33` attic, `<= 66` middle floor, else basement).
    - Write unit tests: `reasonFor` for each winning factor, the tie order, and the empty file; `floorOf` at 0, 33, 34, 66, 67 and 100.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add floor labels and reason sentences`
    - _Requirements: 5.4, 6.2_

- [ ] 8. Report builder
  - [ ] 8.1 Add `buildReport`
    - In `report.ts` add `BuildInput` and `buildReport(input)`: for each scored file compute factors, score, floor and reason; sort ghosts by `difficultyScore` ascending, then `path` ascending (`a < b`); fill the overview (`owner`, `repo`, `ref`, `analysed`, `picked`, `truncated`, `partial`, `skipped`); set `fewFiles` and the message `This looks like a small project, so only N file(s) were picked.` when `picked` is 1 or 2, else `fewFiles: false` and `message: null`. Use `null`, never `undefined`.
    - Write `report.test.ts`: fields of each ghost, `fewFiles` for 0 (not applicable), 1, 2 and 3 ghosts, `partial` and `truncated` copied, `skipped` copied, ordering with a tie broken by path.
    - **Property 8: Report order does not depend on download order** (generator: `fc.uniqueArray` of `{ path, language, factors }` with factors from 0 to 500, plus a permutation). Checks: equal reports for any permutation, and ghosts sorted by score then path.
    - **Validates: Requirements 6.1, 6.5**
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): build the haunted report`
    - _Requirements: 4.7, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Report parser
  - [ ] 9.1 Add `parseReport` and its round-trip property
    - Create `ghost-detection/parseReport.ts` with `parseReport(jsonText)`: `JSON.parse` inside try/catch, then a hand-written type guard (root object with `overview` and `ghosts`; right primitive types for every field; `floor`, `language` and skipped `reason` in their unions; scores integers 0 to 100; factors non-negative integers). Any failure returns `INVALID_REPORT` with the English message of the design. It never throws.
    - Create `ghost-detection/reportArb.testutil.ts` with `reportArb` (from the design: `fc.record` with `fc.integer`, `fc.string()`, `fc.boolean()`, `fc.constantFrom` for unions, `fc.array` for ghosts and skipped; no NaN, no `-0`).
    - Write `parseReport.test.ts`: a valid report, invalid JSON, wrong types, a missing field, a floor not in the union, a score of 101, and `fc.jsonValue()` never throws.
    - **Property 9: Report JSON round trip** — **Validates: Requirements 6.7, 6.8**
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): parse reports from JSON`
    - _Requirements: 6.7, 6.8, 6.9_

- [ ] 10. GitHub client and strict fake
  - [ ] 10.1 Add the strict fake GitHub
    - Create `ghost-detection/fakeGitHub.testutil.ts` with `createFakeGitHub(repos)` returning a `fetch` function, as in the design "Strict fake GitHub": 404 for an unknown owner/repo, tree ref or contents path; 409 on the tree of an empty repo; 405 for methods other than GET; 400 when `User-Agent` or `Accept` is missing; real field names (`default_branch`, `tree[].path/mode/type/size`, `truncated`), `size` only for blobs; the contents route returns the JSON/base64 form unless the raw `Accept` header is sent. The fake adds a default `User-Agent` check only for its own test: because the real client does not set `User-Agent`, the fake must receive it from a wrapper in the tests (Node's fetch and browsers send one themselves). Options: answer 403 with `x-ratelimit-remaining: 0` and `x-ratelimit-reset` after N requests, invalid UTF-8 bytes for a file, hang until the abort signal fires, answer 5xx; and a request counter.
    - Write `fakeGitHub.test.ts` (tests of the fake itself): unknown ref gives 404, missing `User-Agent` gives 400, POST gives 405, non-raw contents returns JSON, rate-limit headers after N requests, counter increases.
    - Verify: `npm run check` exits `0`.
    - Commit message: `test(core): add strict fake GitHub`
    - _Requirements: 7.5_

  - [ ] 10.2 Add `createGitHubClient` with `getRepo` and `getTree`
    - Create `ghost-detection/githubClient.ts`: options `fetch` (default global) and `timeoutMs` (default 10,000), `AbortSignal.timeout(timeoutMs)` on every request, headers `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28` (no `User-Agent`, no auth header), `requestCount`, and a plain `Error` if a 9th request is attempted.
    - `getRepo` calls `GET /repos/{owner}/{repo}` and returns `{ defaultBranch: string | null }`. `getTree` calls `GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1` and returns `{ entries, truncated }`.
    - Response mapping from the design table, rate-limit check first: 403 or 429 with `x-ratelimit-remaining: 0` gives `RATE_LIMITED` with the UTC reset time from `x-ratelimit-reset`; 403 or 429 with `retry-after` or otherwise gives `RATE_LIMITED` with a generic text; repo 404 gives `REPO_NOT_FOUND`; tree 409 gives `EMPTY_REPO`; anything else (tree 404 or 422, 5xx, not JSON, fetch rejects, timeout) gives `NETWORK_ERROR`. All thrown as `DetectError` with English messages from the design.
    - Write `githubClient.test.ts` against the strict fake: default branch, tree entries, each mapped error, timeout with a small `timeoutMs`, a tree request with a wrong ref gives `NETWORK_ERROR`, request counter, 9th request throws.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add GitHub client for repo and tree`
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [ ] 10.3 Add `getFileText` with the UTF-8 check
    - In `githubClient.ts` add `getFileText(owner, repo, ref, path)`: `GET /repos/{owner}/{repo}/contents/{path}?ref={ref}` with `Accept: application/vnd.github.raw+json`; path parts encoded one by one with `encodeURIComponent` and joined with `/`; read `arrayBuffer()` and decode with `new TextDecoder("utf-8", { fatal: true })`. A decoding error, or a NUL byte in the text, throws `DetectError` with the internal code `NOT_TEXT`. Any non-200 gives `NETWORK_ERROR` (message mentions the file), rate limit mapping as in 10.2.
    - Write tests against the fake: a normal file, a path with spaces and non-ASCII characters, invalid UTF-8 gives `NOT_TEXT`, a NUL byte gives `NOT_TEXT`, 404 gives `NETWORK_ERROR`, rate limit gives `RATE_LIMITED`, the non-raw `Accept` is never sent.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): read file text from GitHub`
    - _Requirements: 2.7, 2.10, 2.11_

- [ ] 11. Orchestrator
  - [ ] 11.1 Add `detectGhosts` for the normal path and the simple errors
    - Create `ghost-detection/detectGhosts.ts` with `DetectOptions` (`GitHubClientOptions` plus the test-only `ref`) and `detectGhosts(url, opts)` following the design "Orchestrator": parse the URL, `getRepo`, use `opts.ref ?? defaultBranch` (`EMPTY_REPO` if there is none), `getTree`, cut to 5,000 entries and set `truncated`, keep only regular blobs (`type === "blob"`, mode starting with `100`), `rankKeyFiles`, read up to 5 files in order, measure, `buildReport`. Return `Result`, catch `DetectError` and return it as an error; rethrow anything else.
    - `NO_SUPPORTED_FILES` when there is no eligible file, with the English message listing the four languages and saying test files alone are not analysed.
    - Write `detectGhosts.test.ts` with the strict fake: a small repo with 5 or more files (check order, floors, `analysed`, `picked`, `ref` is the default branch); the test-only `ref` as commit SHA; `INVALID_URL`; `REPO_NOT_FOUND`; `RATE_LIMITED`; `NETWORK_ERROR`; `EMPTY_REPO` by 409 and by no default branch; docs-only repo and tests-only repo give `NO_SUPPORTED_FILES`; 5,001 entries give `truncated: true`; symlink and submodule entries are ignored; 1 and 2 files give `fewFiles: true`; `detectGhosts` never throws for any `fc.string()` URL.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): add detectGhosts orchestrator`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.5, 4.7, 4.8, 6.3, 6.4, 6.6_

  - [ ] 11.2 Add skips, partial reports and the request budget
    - In `detectGhosts.ts` add: a picked file larger than 102,400 bytes is skipped without a request and listed as `TOO_LARGE`; a `NOT_TEXT` file is skipped and listed; a skipped file is replaced by the next candidate while no more than 6 content requests are used; `RATE_LIMITED` after at least one file was read gives a report with `partial: true`; `RATE_LIMITED` before any file gives the error; if eligible files exist but every one was skipped, return `NO_SUPPORTED_FILES` with a message that lists the skipped paths and reasons (`skippedMessage`).
    - Add tests with the strict fake: a large file replaced by the next one; a binary file replaced by the next one; skipped files listed in `overview.skipped`; partial report after the limit hits on the third file; rate limit on the first file gives `RATE_LIMITED`; all eligible files too large gives `NO_SUPPORTED_FILES` with the paths in the message; the fake's request counter is never above 8 (worst case: 1 + 1 + 6) and a repo with many large files makes no content request for them; the report from a run passes `parseReport(JSON.stringify(report))`.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): skip unreadable files and limit requests`
    - _Requirements: 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 6.6, 6.7_

- [ ] 12. Live test setup
  - [ ] 12.1 Split live tests from `npm test`
    - In `vitest.config.ts` keep `include` and add `exclude: [...configDefaults.exclude, "**/*.live.test.ts"]` (`configDefaults` from `vitest/config`; check the Vitest 5 docs for the exact import).
    - Create `vitest.live.config.ts` with `include: ["packages/*/src/**/*.live.test.ts"]` and `testTimeout: 30_000`.
    - Add the root script `"test:live": "vitest run --config vitest.live.config.ts"`. Do not add it to `check`.
    - Verify: create a temporary `packages/core/src/tmp.live.test.ts` with one passing test. `npm test` does not run it. `npm run test:live` runs only it. Then delete the temporary file.
    - Verify: `npm run check` exits `0` and does not mention `*.live.test.ts`.
    - Commit message: `chore: add test:live script`
    - _Requirements: 7.3_

- [ ] 13. Checkpoint before the live test
  - Run `npm run check` and make sure it exits `0` (lint, format check, build and all unit and property tests). Check that `git status --short` prints nothing. Ask the owner if questions arise.

- [ ] 14. Live test against the real GitHub
  - [ ] 14.1 Add the live test for `lukeed/sirv`
    - Create `ghost-detection/detectGhosts.live.test.ts` with one call: `detectGhosts("https://github.com/lukeed/sirv", { ref: "1135207e92c40354543cbd15c763c7a61d79d432" })`, no token, no environment variable, default client timeout.
    - Assertions on that one result: it is `ok`; `overview.ref` equals the SHA; there are 1 to 5 ghosts; every score is an integer 0 to 100; ghosts are ordered by score then path; `parseReport(JSON.stringify(report))` gives an equal report.
    - If the result is an error, the test fails. For `RATE_LIMITED` the failure message is: `GitHub rate limit reached (60 requests per hour without a token). Wait until the limit resets (<reset time from the error>) and run npm run test:live again.` There is no skipping.
    - Manual step for the owner: run `npm run test:live` by hand (it uses up to 8 of the 60 requests per hour). Expect 1 passing test and exit code `0`. If GitHub changed the repository (for example it was deleted), stop and tell the owner.
    - Verify: `npm run check` still exits `0` and does not run the live test.
    - Commit message: `test(core): add live GitHub test for ghost detection`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 15. Public exports and wrap-up
  - [ ] 15.1 Export the public API and check browser safety
    - Create `ghost-detection/index.ts` exporting: `detectGhosts`, `parseReport`, `parseRepoUrl`, `formatRepoUrl`, `isEligible`, `pickKeyFiles`, `measureFactors`, `difficultyScore`, `floorOf`, `buildReport`, `createGitHubClient`, and all public types (`HauntedReport`, `Ghost`, `Overview`, `Result`, `ErrorCode`, ...). Do not export `DetectError`, test helpers or the internal `NOT_TEXT` code. Change `packages/core/src/index.ts` to `export * from "./ghost-detection/index.js";`.
    - Write `index.test.ts` (replace the smoke test): importing from `./index.js` gives the exported functions, and `parseReport(JSON.stringify(report))` works on a report built with `buildReport`.
    - Browser-safety check (how it is verified): (1) `npm run build` compiles core with `types: []`, so any Node global (`process`, `Buffer`) or Node module typing is a compile error; this was proven in task 1.1. (2) Run `Select-String -Path packages/core/src -Recurse -Include *.ts -Pattern 'node:|require\(|process\.|Buffer' -Exclude *.test.ts,*.testutil.ts` and expect no match outside strings in comments or messages (the factor regex for `require(` in `factors.ts` is an allowed match). (3) Check that no file in core imports a package other than `vitest` and `fast-check` (tests only): `Select-String -Path packages/core/src -Recurse -Include *.ts -Pattern '^import .* from "[^.]'` lists only test files. (4) The real browser run is part of the demo website spec and is not checked here; say so in the final report.
    - Verify: `npm run check` exits `0`.
    - Commit message: `feat(core): export ghost detection API`
    - _Requirements: 7.7, 7.8, 7.9_

  - [ ] 15.2 Update `PLAN.md` and hand off
    - Mark the ghost detection spec as done in `PLAN.md` ("Siguientes", item 4 and "Hecho"), add "Para retomar" notes (what exists in `packages/core`, how to run `npm run test:live`, that `power` and `web` do not depend on core yet and each later spec adds `"@haunted-repo/core": "0.0.0"` and a `package-lock.json` update), and record the result of the manual hook check from task 1.2 in "Pendientes". Keep the existing Low item about updating `product.md` and `tech.md` (the old hook idea is replaced). `PLAN.md` may stay in Spanish.
    - Verify: `npm run check` exits `0` and `git status --short` shows only `PLAN.md` (and `docs/decisiones.md` if the hook check needs a record).
    - Commit message: `docs: mark ghost detection spec as done`
    - Then report to the owner so the pull request can be created with `gh pr create` using `.github/pull_request_template.md` (never merged by Kiro). The total size is expected to be over 500 lines excluding the lockfile (tests are large), so warn the owner and propose splitting the pull request in two: tasks 1 to 9 (pure modules) and tasks 10 to 15 (client, orchestrator, live test, exports).
    - _Requirements: 7.7_

## Notes
- All tasks are required. There are no optional tasks, because the testing rule asks for the property tests and the live test.
- Property tests (1 to 9) are inside the task of the code they test, so there are no stand-alone test tasks.
- Task 1.2 and the manual run in 14.1 are steps for the project owner. They are not part of `npm run check`.
- `*.live.test.ts` calls the real GitHub API, uses no token and is never run by `npm test` or `npm run check`.
- The fake GitHub is never more permissive than the real API (testing rule). If the real API rejects something, the fake rejects it too.
- The root `build` script lists `core`, `power` and `web` in dependency order; a new package must be added there in the right place.
- Drop-first order if time runs short (from the design): tests of the fake itself and the `fc.jsonValue()` test; `retry-after` details; message variants; properties 2 and 8 as example tests. Never cut the live test, the 404/403/409 behaviour of the fake, the request budget, or properties 4 to 7.
- Deadline for the feature: 20 Nov 2026.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["7.2"] },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["9.1"] },
    { "id": 12, "tasks": ["10.1"] },
    { "id": 13, "tasks": ["10.2"] },
    { "id": 14, "tasks": ["10.3"] },
    { "id": 15, "tasks": ["11.1"] },
    { "id": 16, "tasks": ["11.2"] },
    { "id": 17, "tasks": ["12.1"] },
    { "id": 18, "tasks": ["14.1"] },
    { "id": 19, "tasks": ["15.1"] },
    { "id": 20, "tasks": ["15.2"] }
  ]
}
```
