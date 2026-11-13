---
inclusion: always
---

# Tech

## Constraints
- The demo must stay online, free and without manual intervention until 29 January 2027.
- No paid APIs, no keys that expire, no databases that pause when idle. No database at all.
- The AI that explains and corrects is the user's own Kiro. This project never calls an AI API.
- Kiro writes all the code.
- All commands and npm scripts must work on Windows (PowerShell). Do not use shell-only commands like rm -rf; use cross-platform Node tools instead.

## Stack
| Part | Choice |
|---|---|
| Language | TypeScript 6.0 (strict mode) on Node.js v24 |
| Package manager | npm, with workspaces |
| Kiro Power | `POWER.md` + steering files + a small MCP server in TypeScript (`@modelcontextprotocol/sdk`). Exact format to confirm in the Power spec against kiro.dev/docs/powers |
| Test hook | `.kiro/hooks/test-after-task.json` runs `npm run check` after each spec task (PostTaskExec) |
| Ghost report and progress | Plain JSON values (HauntedReport, ExorcismProgress) read with parseReport and parseProgress. Where the Power keeps them is decided in the Power spec |
| Core logic | `packages/core` (@haunted-repo/core): ghost detection and the exorcism engine, pure TypeScript that also runs in the browser (only fetch, TextDecoder and AbortSignal) |
| Demo website | Vite + TypeScript, no framework, built to static files |
| Hosting | GitHub Pages (public repo) |
| Lint / format | ESLint + Prettier |
| Tests | Vitest, plus fast-check for property-based tests |

## Layout
- `packages/core/`: ghost detection and the exorcism engine, used by the web and the Power
- `packages/power/`: the Kiro Power and its MCP server
- `packages/web/`: the static demo website
- `.kiro/`: steering, specs, agents, hooks

## Commands (run from the repository root)
- Install: `npm ci`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Build: `npm run build`
- Test: `npm test` (single run, not watch mode)
- Check everything at once: `npm run check`.
- Before every commit: run `npm run check` (lint, format check, build and test must all pass).

## Dependencies
- Exact versions only (no `^` or `~`). Commit `package-lock.json`.
- Check current documentation before using any library.

## Testing strategy
- Unit tests with Vitest.
- Property-based tests (fast-check) for rules that must always hold, for example "replaying a recording always gives the same steps" or "the ghost file always parses back to the same data".
- External services: the only AI is the user's Kiro, which an automated test cannot call. The real-service check is the manual spike (see `PLAN.md`, point 3). Any future RSS, API or cloud service must have at least one test against the real service.
- Mocks must never be more permissive than the real service.

## Demo durability checklist
- No server code in the demo: static files only.
- No environment variables or secrets needed to build or serve the demo.
- The example "haunted" repository and its questions are pre-generated and committed.
- Before the code freeze (27 Nov 2026), check that the public link works from a clean browser.

## Secrets
- Keys go in `.env.local` (ignored by git). `.env.example` contains only variable names. The first version needs none.
