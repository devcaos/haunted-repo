# Implementation Plan: pages-deploy

## Overview

Seven small tasks, in order. Each task ends in its own commit on branch `feat/pages-deploy`, made only after `npm run check` passes. Each task marks itself `[x]` in this `tasks.md` and includes `tasks.md` in that same commit. No optional tasks.

## Tasks

- [x] 1. Set up Vite in `packages/web`
  - Add `vite.config.ts` with `base: "/haunted-repo/"`, a minimal `index.html` and a stub `src/main.ts` so the build works
  - Update `packages/web/package.json`: dependency `@haunted-repo/core` at exact `0.0.0`, scripts `build` (`tsc --noEmit && vite build`) and `dev` (`vite`)
  - Update `packages/web/tsconfig.json` as in the design (DOM libs, `types: []`, `noEmit`, Bundler resolution, no `rootDir`/`outDir`)
  - Run `npm install` to update `package-lock.json`
  - Delete the `double` placeholder: `src/index.ts` and `src/index.test.ts`
  - Run `npm run check`; then mark this task `[x]` in `tasks.md` and commit everything together (including `tasks.md`)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [ ] 2. Implement the check button logic, page and tests
  - Create `src/checkButton.ts` with `DetectFn`, `CheckView`, `SAMPLE_REPO_URL`, `formatResult` and `createCheckHandler` as in the design
  - Write the real `src/main.ts` (uses `textContent`, passes `detectGhosts` directly) and the final `index.html` (title, under-construction sentence, `#check-button`, `#status` with `role="status"` and `aria-live="polite"`)
  - Create `src/checkButton.test.ts` with `vi.stubGlobal("fetch", ...)` no-network guard
  - Unit tests with the strict `createFakeGitHub`: success, error (`REPO_NOT_FOUND`), `SAMPLE_REPO_URL` passed to `detect`, zero ghosts shows `0`
  - Property test for Property 1: status text shows the count or the message (`// Feature: pages-deploy, Property 1`)
  - Property test for Property 2: busy while running, idle afterwards, including a thrown exception (`// Feature: pages-deploy, Property 2`)
  - Property test for Property 3: extra clicks never start a second check (`// Feature: pages-deploy, Property 3`)
  - Run `npm run check`; then mark this task `[x]` in `tasks.md` and commit everything together (including `tasks.md`)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3. Add the CI workflow
  - Create `.github/workflows/ci.yml` as in the design: trigger `pull_request`, permissions `contents: read`, `actions/checkout@v7`, `actions/setup-node@v7` (Node 24, `cache: npm`), `npm ci`, `npm run check`
  - Run `npm run check`; then mark this task `[x]` in `tasks.md` and commit everything together (including `tasks.md`)
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Add the deploy workflow
  - Create `.github/workflows/deploy.yml` as in the design: trigger push to `main`, `concurrency` group `pages`, job `build` (checkout, setup-node 24, `npm ci`, `npm run check`, `configure-pages@v6`, `upload-pages-artifact@v5` with `path: packages/web/dist`), job `deploy` (`needs: build`, permissions `pages: write` and `id-token: write`, environment `github-pages`, `deploy-pages@v5`)
  - Run `npm run check`; then mark this task `[x]` in `tasks.md` and commit everything together (including `tasks.md`)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 5. Update `PLAN.md`
  - "En curso" and "Para retomar": state that PR #12 is merged and tasks 10-15 are in `main`
  - "Siguientes": list this spec (mark it when done)
  - Note (c) in "Para retomar" reads "npm ci comprobado en Linux con el lockfile de Windows (11 nov)"
  - "Pendientes": add the two Medium items from the 11 Nov audit (`tasks.meta.json` line in `.gitignore`; MIT notice of lukeed/sirv in the demo), with the exact text from the requirements
  - Run `npm run check`; then mark this task `[x]` in `tasks.md` and commit everything together (including `tasks.md`)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Add the line to `docs/kiro-usage-log.md`
  - Append one line about the pages-deploy spec
  - Run `npm run check`; then mark this task `[x]` in `tasks.md` and commit everything together (including `tasks.md`)
  - _Requirements: 6.6_

- [ ] 7. Final verification and pull request
  - Run `npm run check` from a build-first state (`npm run build` before `npm test` on a clean clone)
  - Read `packages/web/dist/index.html` and confirm every asset path starts with `/haunted-repo/`
  - Mark this task `[x]` in `tasks.md` and commit it (including `tasks.md`); push the branch with `-u`
  - Open the pull request with `gh pr create --body-file` using the content of `.github/pull_request_template.md` filled in; the description must say that before merging, Settings > Pages > Source must be set to "GitHub Actions"
  - Never merge: Luis Miguel merges on GitHub
  - _Requirements: 1.4, 1.5, 3.4, 4.1_

## Notes

- Every task ends with `npm run check` passing before its commit.
- Correctness properties 1-3 from the design are covered in task 2.
- Workflows (tasks 3 and 4) are verified by the real CI run on the PR and the first real deploy after merge.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6"] },
    { "id": 6, "tasks": ["7"] }
  ]
}
```
