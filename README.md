# Haunted Repo

Haunted Repo finds the AI-written code in a repository that its owner does not understand yet (the "ghosts") and helps the owner "exorcise" it by really understanding it, through plain explanations and questions about what the code does.

It is for beginners who build projects by directing an AI without understanding the code, for example first-year vocational students. The gap it targets is called **comprehension debt**: the distance between the code a project contains and the code someone understands ([Addy Osmani](https://addyosmani.com/blog/comprehension-debt)).

**Live demo:** https://devcaos.github.io/haunted-repo/

## How it works

The repository is a haunted house with three floors: the attic (easy), the middle floor and the basement (hard).

| Part | What it does | Status |
|---|---|---|
| Ghost detection (`packages/core/src/ghost-detection/`) | From a public GitHub repository URL, picks up to 5 key source files (TypeScript, JavaScript, Java or Python). Each one is a ghost with a difficulty score from 0 to 100, a floor and one plain sentence that says why. Ghosts are ordered from easy to hard. No token and no AI: plain, deterministic code that also runs in the browser. | Done |
| Exorcism engine (`packages/core/src/exorcism/`) | A pure engine that guides the user's own Kiro (the Tutor). The Tutor explains the file in plain words and asks 3 questions about its behaviour, one at a time; the first one is the core question. "I don't know" gets a simpler explanation and the same question again; a second one gets a short model answer. A ghost is exorcised with at least 2 good answers out of 3 when the core question is not wrong. | Done (engine only) |
| Web demo (`packages/web/`) | A static page that shows the ghosts of the public repository [lukeed/sirv](https://github.com/lukeed/sirv), grouped by floor, from a report saved from a real run. A form analyses any public GitHub repository live from the browser; if GitHub refuses (60 requests per hour without an account), the page shows the sample again. The sirv MIT licence notice is in the footer. | Ghost list and live form done. The recorded exorcism of the sample is in progress |
| Kiro Power (`packages/power/`) | The real tool: it will connect the exorcism engine to the user's own Kiro. This project never calls a paid AI API. | Not started (placeholder package). Comes after the web demo |

## How it was built with Kiro

Kiro wrote all the code. The project director (a beginner) decided what to build and approved every step.

- **Specs** (`.kiro/specs/`): one per feature (`project-skeleton`, `ghost-detection`, `exorcism`, `pages-deploy`, `web-demo`). Requirements, design and tasks were approved before any code, and each task ended in its own commit.
- **Steering** (`.kiro/steering/`): always-loaded rules for work, git, testing, product and stack, plus two manual ones (`#next-task`, `#close-task`) for the task cycle.
- **Hooks** (`.kiro/hooks/test-after-task.json`): one command hook that runs `npm run check` after each spec task (`PostTaskExec`).
- **Custom agent** (`.kiro/agents/reviewer.md`): a read-only reviewer.
- **Property-based tests** (fast-check) for the rules that must always hold.

More detail: [docs/kiro-usage-log.md](docs/kiro-usage-log.md).

## Run it locally

Requires Node.js 24 or newer. From the repository root:

```sh
npm install
npm run check
```

`npm run check` runs lint, format check, build and tests. It needs no network and no secrets.

`npm run test:live` calls the real GitHub API (lukeed/sirv, no token). It is run by hand and is not part of `npm run check`. It uses up to 8 of the 60 requests per hour that GitHub allows without an account.

## Project structure

```text
packages/core/   ghost detection and the exorcism engine (@haunted-repo/core)
packages/web/    the static demo website (Vite + TypeScript, no framework)
packages/power/  the Kiro Power (placeholder for now)
.kiro/           specs, steering, hooks and agents
docs/            internal notes: idea, decisions, frictions, Kiro usage log
```

## Hackathon

Built for Kiroween 2026, in the Costume Contest category.

## Licence

[MIT](LICENSE). The demo shows code from [lukeed/sirv](https://github.com/lukeed/sirv), which has its own MIT licence; its notice is shown on the page and served as `sirv-license.txt`.
