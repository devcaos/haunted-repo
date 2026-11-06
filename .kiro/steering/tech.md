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
| Language | TypeScript (strict mode) on Node.js, current LTS version (to confirm when the project is created) |
| Package manager | npm, with workspaces |
| Kiro Power | `POWER.md` + steering files + a small MCP server in TypeScript (`@modelcontextprotocol/sdk`). Exact format to confirm in the Power spec against kiro.dev/docs/powers |
| Kiro hook | JSON file in `.kiro/hooks/`, running a Node command that marks the file as a ghost. Exact trigger to be decided in the ghost-detection spec. It must mark files written by the agent, not files edited by the user. |
| Ghost state | A plain JSON file inside the user's repo (for example `.haunted/ghosts.json`). Final format decided in the ghost-detection spec |
| Demo website | Vite + TypeScript, no framework, built to static files |
| Hosting | GitHub Pages (public repo) |
| Lint / format | ESLint + Prettier |
| Tests | Vitest, plus fast-check for property-based tests |

## Layout (proposed)
- `packages/power/`: the Kiro Power and its MCP server
- `packages/web/`: the static demo website
- `.kiro/`: steering, specs, agents, hooks

## Commands (run from the repository root)
- Install: `npm ci`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Build: `npm run build`
- Test: `npm test` (single run, not watch mode)
- Before every commit: lint, build and test must all pass.

## Dependencies
- Exact versions only (no `^` or `~`). Commit `package-lock.json`.
- Check current documentation before using any library.

## Testing strategy
- Unit tests with Vitest.
- Property-based tests (fast-check) for rules that must always hold, for example "a file marked as ghost is never marked twice" or "the ghost file always parses back to the same data".
- External services: the only AI is the user's Kiro, which an automated test cannot call. The real-service check is the manual spike (see `PLAN.md`, point 3). Any future RSS, API or cloud service must have at least one test against the real service.
- Mocks must never be more permissive than the real service.

## Demo durability checklist
- No server code in the demo: static files only.
- No environment variables or secrets needed to build or serve the demo.
- The example "haunted" repository and its questions are pre-generated and committed.
- Before the code freeze (27 Nov 2026), check that the public link works from a clean browser.

## Secrets
- Keys go in `.env.local` (ignored by git). `.env.example` contains only variable names. The first version needs none.
