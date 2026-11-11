# Implementation Plan: Project skeleton

## Overview
Eight tasks, one commit each, in the order of the design ("Size and commits"). A final verification task runs after everything is committed.

Rules for running these tasks:
- Kiro runs a task only when the project owner says so. Kiro asks permission before modifying code.
- Work on branch `feat/project-skeleton`, never on `main`.
- Run every command from the repository root, in PowerShell.
- A task is done only when its verification commands pass. Then make its commit. If a commit message needs an "and", it is two commits.
- Never use `git restore .`. Never merge.

## Tasks

- [x] 1. Root package and dependencies
  - [x] 1.1 Add the root package setup
    - Step 0, before creating files: check the branch with `git branch --show-current`. If it is `main`, create the branch with `git checkout -b feat/project-skeleton`.
    - Step 1, re-check versions with `npm view <package> version` for all 10 packages in the design versions table: typescript, eslint, @eslint/js, typescript-eslint, eslint-config-prettier, prettier, vitest, vite, fast-check, @types/node. Also re-check `peerDependencies` and `engines` (for example `npm view typescript-eslint@8.72.2 peerDependencies`, `npm view vitest@5.1.0 peerDependencies engines`).
    - Step 2, read the current docs: ESLint 10 flat config (`defineConfig`, `globalIgnores` from `eslint/config`), typescript-eslint flat config, and Vitest 5 config (`include`, `passWithNoTests`).
    - STOP and report to the owner if anything differs from the design (a version, a peer range, an import name, a default). Do not continue until the owner decides.
    - Step 3, create `package.json` (private, `"type": "module"`, `engines` node `>=24`, `workspaces` `["packages/*"]`, scripts `lint`, `format`, `format:check`, `build`, `test`, devDependencies with the exact versions of the design). Do not add the `check` script yet.
    - Create `.npmrc` with `save-exact=true` and `.gitattributes` with `* text=auto eol=lf`.
    - Run `npm install`. This creates `package-lock.json`.
    - Verify: `npm ls --depth=0` shows no errors, `Select-String -Path package.json -Pattern '[\^~]'` prints nothing (no `^` or `~`), and `git status --short` shows `package.json`, `package-lock.json`, `.npmrc`, `.gitattributes` and not `node_modules`.
    - Commit message: `chore: set up root package`
    - _Requirements: 1.1, 5.1, 6.1, 6.2, 6.4, 6.5, 6.6, 7.1_

  - [x] 1.2 Add the TypeScript config and the two packages
    - Create `tsconfig.base.json` as in the design (strict on).
    - Create `packages/power/package.json`, `packages/power/tsconfig.json`, `packages/power/src/index.ts` (`add`), and the same three files in `packages/web` (`double`, package name `@haunted-repo/web`).
    - Run `npm install` so the workspaces are linked. Check that `package-lock.json` only changes by the workspace entries.
    - Verify: `npm run build`, then `echo $LASTEXITCODE` prints `0`. `Test-Path packages/power/dist/index.js` and `Test-Path packages/web/dist/index.js` print `True`. `git status --short` does not list `dist/`.
    - Commit message: `chore: add placeholder TypeScript packages`
    - _Requirements: 1.2, 1.3, 2.1, 2.2_

- [x] 2. Formatting and linting
  - [x] 2.1 Add the Prettier config
    - Create `.prettierrc.json` (`{ "endOfLine": "lf" }`) and `.prettierignore` (`**/*.md`, `package-lock.json`, `dist/`, `node_modules/`).
    - If `format:check` reports files, run `npm run format` and review the diff before continuing.
    - Verify: `npm run format:check`, then `echo $LASTEXITCODE` prints `0`. Also `git ls-files --eol` shows `i/lf` for the tracked config files.
    - Commit message: `chore: add Prettier config`
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 5.2_

  - [x] 2.2 Add the ESLint flat config
    - Create `eslint.config.js` as in the design, using the import names confirmed in task 1.1 (`@eslint/js`, `typescript-eslint`, `eslint-config-prettier` last, ignores for `**/dist/` and `**/node_modules/`).
    - Verify: `npm run lint`, then `echo $LASTEXITCODE` prints `0`. Then `npm run format:check` still prints exit `0`.
    - Commit message: `chore: add ESLint flat config`
    - _Requirements: 3.1, 3.2, 3.5_

- [ ] 3. Tests
  - [x] 3.1 Add Vitest config and the unit tests
    - Create `vitest.config.ts` with `include: ["packages/*/src/**/*.test.ts"]`.
    - Create `packages/power/src/index.test.ts` with one example test for `add` (2 + 3 is 5), and `packages/web/src/index.test.ts` with one example test for `double` (4 gives 8). Use `.js` in relative imports.
    - Verify: `npm test` shows 2 passing tests and `echo $LASTEXITCODE` prints `0`. Then `npm run lint`, `npm run format:check` and `npm run build` all exit `0`.
    - Commit message: `test: set up Vitest with placeholder tests`
    - _Requirements: 4.1, 4.2_

  - [ ] 3.2 Add the fast-check property test
    - In `packages/power/src/index.test.ts`, add the test for Property 1 (add is commutative) with 100 runs and the comment `// Feature: project-skeleton, Property 1: add is commutative`. Import `fc` from `fast-check`.
    - **Property 1: add is commutative**
    - **Validates: Requirements 4.3**
    - Verify: `npm test` shows 3 passing tests and exit `0`. Then `npm run lint`, `npm run format:check` and `npm run build` exit `0`.
    - Commit message: `test: add fast-check property test for add`
    - _Requirements: 4.3_

- [ ] 4. Check command and steering
  - [ ] 4.1 Add the check script
    - In the root `package.json`, add `"check": "npm run lint && npm run format:check && npm run build && npm test"`.
    - Verify: `npm run check`, then `echo $LASTEXITCODE` prints `0`. The output shows lint, format check, build and test in that order.
    - Commit message: `chore: add check script`
    - _Requirements: 8.1_

  - [ ] 4.2 Update the steering files
    - Edit `.kiro/steering/tech.md` with the exact before/after text of the design:
      - Stack row Language becomes `| Language | TypeScript 6.0 (strict mode) on Node.js v24 |`.
      - Heading `## Layout (proposed)` becomes `## Layout`.
      - Line `- Before every commit: lint, build and test must all pass.` becomes ``- Before every commit: run `npm run check` (lint, format check, build and test must all pass).``
      - Delete the line starting `- Until the project scaffold exists`.
      - Add under Commands: ``- Check everything at once: `npm run check`.``
    - Edit `.kiro/steering/testing.md`: first rule becomes ``- After every change, run `npm run check` (lint, format check, build and tests; see `tech.md`). Fix errors before saying a task is done.``
    - Verify: `Select-String -Path .kiro/steering/tech.md -Pattern 'Until the project scaffold'` prints nothing. `Select-String -Path .kiro/steering/tech.md -Pattern 'Layout \(proposed\)'` prints nothing. `Select-String -Path .kiro/steering/*.md -Pattern 'npm run check'` finds lines in both files. Then `npm run check` exits `0` (`.md` files are ignored by Prettier).
    - Commit message: `docs: use npm run check in steering files`
    - _Requirements: 8.2, 8.3, 8.4, 6.5_

- [ ] 5. Final verification (after everything is committed)
  - [ ] 5.1 Run the manual failure-case checks
    - Precondition: `git status --short` prints nothing (everything committed). Run each check, then restore only the changed file before the next one. Never use `git restore .`.
    - Check 1 (R2.3): in `packages/power/src/index.ts` change `return a + b;` to `return "x";`. Run `npm run build`. Expect a TypeScript error and `$LASTEXITCODE` not `0`. Restore: `git restore packages/power/src/index.ts`.
    - Check 2 (R4.4): in `packages/power/src/index.test.ts` change `toBe(5)` to `toBe(6)`. Run `npm test`. Expect one failing test and `$LASTEXITCODE` not `0`. Restore: `git restore packages/power/src/index.test.ts`.
    - Check 3 (zero test files): rename both `index.test.ts` files (for example with `Rename-Item` to `index.test.ts.bak`). Run `npm test`. Expect `$LASTEXITCODE` not `0`. Rename them back by hand and confirm with `git status --short` that it prints nothing. If it exits `0`, add `passWithNoTests: false` to `vitest.config.ts` and make a fix commit.
    - Check 4 (stale `dist/`): run `npm run build`, then `npm test`. Expect only the 3 tests from `src/` and no `dist/` path in the output.
    - Check 5 (R5.2): `git ls-files --eol` shows `i/lf` for the new files, and `npm run format:check` exits `0`.
    - Finish: `git status --short` prints nothing. No commit unless a check needed a fix.
    - _Requirements: 2.3, 4.4, 5.2_

  - [ ] 5.2 Check a clean clone
    - If `$env:TEMP\haunted-repo-check` already exists, remove it first with `Remove-Item -Recurse -Force $env:TEMP\haunted-repo-check`.
    - Run: `git clone . $env:TEMP\haunted-repo-check; Set-Location $env:TEMP\haunted-repo-check; git checkout feat/project-skeleton; npm ci; npm run check; echo $LASTEXITCODE`.
    - Expect `npm ci` to succeed and `npm run check` to print exit `0`.
    - Remove the temporary folder afterwards: `Set-Location c:\proyectos\haunted-repo; Remove-Item -Recurse -Force $env:TEMP\haunted-repo-check`.
    - No commit unless something needs fixing. If so, fix it in its own commit and repeat this check.
    - Then report to the owner so the pull request can be created with `gh pr create` (never merged by Kiro).
    - _Requirements: 6.3, 6.2, 8.1_

## Notes
- All tasks are required. There are no optional tasks.
- The only property test is Property 1, because the rest of the spec is tooling configuration.
- No external service is involved, so the "test against the real service" rule does not apply.
- Estimated size is about 220 lines without the lockfile, under the 500-line limit, so one pull request.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["5.1"] },
    { "id": 9, "tasks": ["5.2"] }
  ]
}
```
