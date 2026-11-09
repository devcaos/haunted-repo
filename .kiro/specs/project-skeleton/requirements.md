# Requirements: Project skeleton

## Introduction
Haunted Repo has no `package.json` yet, so lint, build and test cannot run. This spec creates the minimal scaffold (npm workspaces, TypeScript strict, ESLint, Prettier, Vitest, fast-check, `.gitattributes`) so that the commands in `tech.md` work from the repository root on Windows (PowerShell). It contains no product features.

## Requirements

### R1. Workspaces layout
**User story:** As the project director, I want the monorepo layout from `tech.md`, so that later specs have a place to put code.

Acceptance criteria:
1. The root `package.json` is private and declares npm workspaces `packages/*`.
2. Two workspace packages exist: `packages/power` and `packages/web`. Each has its own `package.json`, `tsconfig.json` and a placeholder source file with one trivial exported function.
3. Placeholders contain no product logic (no ghost detection, no MCP server, no Vite app).

### R2. TypeScript
Acceptance criteria:
1. A shared `tsconfig.base.json` enables `strict`. Each package extends it.
2. `npm run build` compiles both packages with `tsc` and exits with code 0.
3. A type error in any package makes `npm run build` exit with a non-zero code.

### R3. Lint and format
Acceptance criteria:
1. ESLint (flat config) and Prettier are configured at the root, with TypeScript support.
2. `npm run lint` checks all packages and exits with code 0 on the scaffold.
3. `npm run format:check` exits with code 0 on the scaffold.
4. `npm run format` fixes formatting.
5. ESLint and Prettier do not conflict (no rule fights over formatting).
6. A `.prettierignore` excludes all Markdown files (`**/*.md`), `package-lock.json`, `dist/` and `node_modules/`. Prettier only checks code and config files, so existing docs, steering and specs are never reformatted.

### R4. Tests
Acceptance criteria:
1. Vitest runs once, not in watch mode, with `npm test`.
2. Each package has at least one unit test for its placeholder function.
3. At least one fast-check property-based test exists, to prove the library is wired up.
4. `npm test` exits non-zero if any test fails.

### R5. Line endings
Acceptance criteria:
1. `.gitattributes` contains `* text=auto eol=lf`.
2. `npm run format:check` passes on Windows with a fresh checkout (Prettier configured with `endOfLine: "lf"`).

### R6. Dependencies and reproducibility
Acceptance criteria:
1. Every dependency uses an exact version (no `^` or `~`), checked against current documentation.
2. `package-lock.json` is committed.
3. `npm ci` from a clean clone succeeds, then lint, build and test all pass.
4. `node_modules` and build output (`dist/`) are in `.gitignore`. `.kiro/` is not.
5. The root `package.json` declares `"engines": { "node": ">=24" }`, matching Node.js v24 installed on the development computers. `tech.md` records this version.
6. A root `.npmrc` contains `save-exact=true`, so future `npm install` commands also write exact versions.

### R7. Windows compatibility
Acceptance criteria:
1. No npm script uses Unix-only commands (`rm -rf`, `cp`, environment variable prefixes like `FOO=1 cmd`). npm runs scripts with cmd.exe on Windows, so `&&` inside an npm script is allowed.
2. Cleaning build output, if a script exists, uses a cross-platform Node tool.

### R8. Single check command and steering update

Acceptance criteria:
1. `npm run check` runs lint, format:check, build and test, in that order, and stops at the first failure.
2. In `tech.md`, the 'Before every commit' line says: run `npm run check` (lint, format check, build and test must all pass).
3. In `testing.md`, the first rule refers to `npm run check`.
4. In `tech.md`, the sentence 'Until the project scaffold exists…' is removed, the Node.js row states v24, and 'Layout (proposed)' becomes 'Layout'.

## Edge cases
- Windows CRLF checkouts: covered by R5.
- Existing Markdown files (PLAN.md, docs/, .kiro/) do not pass Prettier today (10 of 17 files fail). This spec must not reformat them.
- Empty `dist/` or stale build output must not make tests pick up compiled `.js` test files (Vitest includes only `src/**/*.test.ts`).
- ESLint must ignore `dist/` and `node_modules/`.
- Node.js version differences: `engines` documents the minimum version.
- `npm test` with zero test files must not silently pass: there are tests in each package, so a missing test file is a failure of R4.2.

## Out of scope
- Any product code: ghost detection, exorcism, MCP server, Kiro Power files, Vite app, demo repo.
- The Post Task Execution test hook (separate item 2 in `PLAN.md`).
- CI on GitHub Actions.
- Husky or any git hook tooling.
- Deploying to GitHub Pages.
- Checking that `npm ci` works on Linux (GitHub Actions) with a lockfile created on Windows. To verify in the GitHub Pages spec.

## Resolved questions
1. `npm run format:check` is part of the check before every commit, through `npm run check` (R8).
2. One pull request is fine (about 150 lines plus the lockfile, under the 500-line limit). Each task in tasks.md is still its own commit.
