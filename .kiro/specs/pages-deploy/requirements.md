# Requirements Document

## Introduction

This spec turns `packages/web` into a Vite + TypeScript static site (no framework) and publishes it to GitHub Pages through GitHub Actions. The page is provisional: it proves that `@haunted-repo/core` works in a real browser. The future web spec replaces it. The demo must stay free and static, with no server code, until 29 January 2027.

## Glossary

- **Web_Package**: the workspace `packages/web`, built with Vite into static files.
- **Check_Button**: the button labelled "Check GitHub connection" on the provisional page.
- **Status_Area**: the page element that shows the result of the Check_Button.
- **Core**: the workspace `@haunted-repo/core`, which exports `detectGhosts`.
- **Fake_GitHub**: the strict fake GitHub in `fakeGitHub.testutil.ts` in Core.
- **Deploy_Workflow**: `.github/workflows/deploy.yml`.
- **CI_Workflow**: `.github/workflows/ci.yml`.
- **Check_Script**: the root command `npm run check` (lint, format check, build, tests).
- **Sample_Repo**: `https://github.com/lukeed/sirv`.

## Requirements

### Requirement 1: Vite static site

**User Story:** As the project director, I want `packages/web` to be a Vite site, so that it can be published as static files.

#### Acceptance Criteria

1. THE Web_Package SHALL contain an `index.html` entry file and a `vite.config.ts` with `base` set to `/haunted-repo/`.
2. THE Web_Package SHALL declare the dependency `@haunted-repo/core` at the exact version `0.0.0`, and `package-lock.json` SHALL reflect it.
3. THE Web_Package tsconfig SHALL use browser DOM types and SHALL NOT declare `types: ["node"]`.
4. WHEN `npm run build` runs from the repository root, THE Web_Package SHALL generate `packages/web/dist/index.html`.
5. THE generated `packages/web/dist/index.html` SHALL reference every asset with a path that starts with `/haunted-repo/`.
6. THE Web_Package SHALL contain no placeholder function `double` and no test for it.

### Requirement 2: Provisional page

**User Story:** As a visitor, I want a simple page that checks the GitHub connection, so that I know core works in a browser.

#### Acceptance Criteria

1. THE Web_Package page SHALL show the title "Haunted Repo" and one English sentence saying the demo is under construction.
2. THE Web_Package page SHALL show the Check_Button labelled "Check GitHub connection".
3. WHEN the user clicks the Check_Button, THE Web_Package SHALL call `detectGhosts` from Core with the Sample_Repo URL.
4. WHEN `detectGhosts` returns a success, THE Status_Area SHALL show the number of ghosts found.
5. IF `detectGhosts` returns an error, THEN THE Status_Area SHALL show the error message.
6. WHILE a check is running, THE Check_Button SHALL be disabled.
7. WHEN a check finishes, THE Check_Button SHALL be enabled again.

### Requirement 3: Deploy workflow

**User Story:** As the project director, I want every push to `main` to publish the site, so that the demo link stays current without manual work.

#### Acceptance Criteria

1. WHEN a push to `main` occurs, THE Deploy_Workflow SHALL run on Node 24.
2. THE Deploy_Workflow SHALL run `npm ci` and then the Check_Script before publishing.
3. IF the Check_Script fails, THEN THE Deploy_Workflow SHALL stop without publishing.
4. WHEN the Check_Script passes, THE Deploy_Workflow SHALL publish `packages/web/dist` to GitHub Pages using the official actions `configure-pages`, `upload-pages-artifact` and `deploy-pages`.
5. THE Deploy_Workflow SHALL use action versions taken from the current official documentation, and the design SHALL record them.
6. THE Deploy_Workflow SHALL request only the permissions that Pages deployment needs.

### Requirement 4: CI workflow

**User Story:** As the project director, I want every pull request checked automatically, so that I only merge green code.

#### Acceptance Criteria

1. WHEN a pull request is opened or updated, THE CI_Workflow SHALL run on Node 24.
2. THE CI_Workflow SHALL run `npm ci` and then the Check_Script.
3. IF the Check_Script fails, THEN THE CI_Workflow SHALL report the job as failed.

### Requirement 5: Button logic tests

**User Story:** As the project director, I want the button logic tested without network, so that `npm run check` is fast and stable.

#### Acceptance Criteria

1. THE Web_Package tests SHALL exercise the Check_Button logic against Fake_GitHub.
2. THE Check_Script SHALL perform no network access.
3. THE Web_Package tests SHALL cover the success case, the error case, and the disabled state while a check runs.
4. FOR ALL results returned by `detectGhosts`, THE Status_Area SHALL show text that contains either the ghost count or the error message (property-based test).
5. THE Fake_GitHub SHALL reject every request that the real GitHub API rejects, as it does today, and the Web_Package tests SHALL NOT loosen it.

### Requirement 6: Project documents

**User Story:** As the project director, I want the plan and log up to date, so that I can resume work later.

#### Acceptance Criteria

1. THE PLAN.md sections "En curso" and "Para retomar" SHALL state that PR #12 is merged and tasks 10-15 are in `main`.
2. THE PLAN.md section "Siguientes" SHALL list this spec, and the entry SHALL be marked when the spec is done.
3. THE PLAN.md note (c) in "Para retomar" SHALL read "npm ci comprobado en Linux con el lockfile de Windows (11 nov)".
4. THE PLAN.md section "Pendientes" SHALL add: "Medium (auditoría 11 nov): la línea .kiro/specs/*/tasks.meta.json de .gitignore puede chocar con las bases; decidir si se quita".
5. THE PLAN.md section "Pendientes" SHALL add: "Medium (auditoría 11 nov): la demo debe mostrar el aviso de licencia MIT de lukeed/sirv".
6. THE `docs/kiro-usage-log.md` file SHALL receive one new line about this spec.

## Edge Cases

- The browser is offline or GitHub rate-limits the request: the Status_Area shows the error message from Core and the button is enabled again.
- The user double-clicks the Check_Button: only one call to `detectGhosts` runs.
- `detectGhosts` finds zero ghosts: the Status_Area shows "0", not an error.
- The repository name changes: `base` in `vite.config.ts` must change with it (noted in the design).
- Pages is not enabled in the repository settings: the first deploy fails. The design lists this one-time manual step for the project director.

## Done Criteria

- `npm run check` passes.
- `npm run build` generates `packages/web/dist/index.html` with asset paths starting with `/haunted-repo/`.
- Both workflow files exist and the CI job is green on the pull request.
- Each task has its own commit and is marked `[x]` in `tasks.md`.

## Out of Scope

- Visual design, house map, exorcism, Kiro Power and Kiro hook.
- Changes to `packages/core/src`, `product.md` or `tech.md`.
- Custom domain, analytics, server code, secrets or environment variables.
- Showing the MIT notice of the Sample_Repo (tracked in "Pendientes").
- A live-network test of the page (core already has a live test; this page only wires it).
