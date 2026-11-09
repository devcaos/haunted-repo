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
5. The root `package.json` declares the Node.js engine as the current LTS (to confirm when implementing).

### R7. Windows compatibility
Acceptance criteria:
1. No npm script uses shell-only commands (`rm -rf`, `&&` chains that PowerShell 5 rejects, env var prefixes like `FOO=1 cmd`).
2. Cleaning build output, if a script exists, uses a cross-platform Node tool.

## Edge cases
- Windows CRLF checkouts: covered by R5.
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

## Open questions for Luis Miguel
1. Should `npm run format:check` be part of the "before every commit" check? (Low item in `PLAN.md`.) Proposal: yes, add it to `tech.md` in this branch.
2. Is the first PR size acceptable? Estimate: about 150 lines of hand-written files plus the lockfile, so one PR.
