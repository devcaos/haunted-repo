# Haunted Repo

**Your code works. Do you know what it does?**

Haunted Repo finds the key files of a repository that its owner does not understand yet (the "ghosts") and helps the owner "exorcise" them by really understanding them, through plain explanations and questions about what the code does.

It is for beginners who build projects by directing an AI without understanding the code, for example first-year vocational students. In those projects the code works, but nobody has read it. That gap is called **comprehension debt**: the distance between the code a project contains and the code someone understands ([Addy Osmani](https://addyosmani.com/blog/comprehension-debt)).

**Live demo:** https://devcaos.github.io/haunted-repo/

## Try it in one minute

Nothing to install and no account needed.

1. Open the [live demo](https://devcaos.github.io/haunted-repo/). It shows the ghosts of the public repository [lukeed/sirv](https://github.com/lukeed/sirv), grouped by floor.

2. Read a ghost card: the file, its difficulty from 0 to 100 and one plain sentence that says why.

3. Paste the URL of any public GitHub repository in the form and press "Find the ghosts".

GitHub allows 60 requests per hour without an account. If it refuses, the page says so and shows the sample again.

## How it works

The repository is a haunted house with three floors: the attic (easy), the middle floor and the basement (hard).

1. **Find the ghosts.** From a public GitHub repository URL, Haunted Repo picks up to 5 key source files (TypeScript, JavaScript, Java or Python). Each one is a ghost.

2. **Sort them from easy to hard.** Each ghost gets a difficulty score from 0 to 100, a floor and one plain sentence that says why. The score comes from counting lines, decisions, nesting and imports. No token and no AI: plain, deterministic code.

3. **Exorcise them.** A Tutor explains the file in plain words and asks 3 questions about its behaviour, one at a time. "I don't know" is a valid answer: it gets a simpler explanation and the same question again. A ghost is exorcised with at least 2 good answers out of 3 when the core question is not wrong.

The Tutor is the user's own Kiro, guided by the exorcism engine. This project never calls a paid AI API.

| Part | What it does | Status |
|---|---|---|
| Ghost detection (`packages/core/src/ghost-detection/`) | Picks up to 5 key files from a public GitHub repository URL and gives each one a score, a floor and a reason. Runs in the browser too. | Done |
| Exorcism engine (`packages/core/src/exorcism/`) | A pure engine that guides the Tutor: explanation first, then 3 behaviour questions, one at a time; the first one is the core question. A second "I don't know" gets a short model answer. | Done (engine only) |
| Web demo (`packages/web/`) | A static page that opens on a report of lukeed/sirv saved from a real run, with a form that analyses any public GitHub repository live from the browser. | Done: ghost list, live form and the recorded exorcism of the sample (the 2 easiest ghosts) |
| Kiro Power (`packages/power/`) | The real tool: it will connect the exorcism engine to the user's own Kiro. | Not started (placeholder package). Comes after the web demo |

## What works today

Done:

- Ghost detection for any public GitHub repository, in the browser.

- The exorcism engine, with its rules covered by tests.

- The public demo page: the ghosts of lukeed/sirv by floor, the live form and the fallback to the sample. The page makes no network call when it opens and saves nothing in the browser.

- The exorcism on the demo page, for the 2 easiest ghosts of lukeed/sirv.

Not done yet:

- The Kiro Power (not started).

## Why a haunted house

The spooky theme does a job. The floors tell a beginner where to start: the attic is easy and the basement is hard. A ghost is a file you do not understand yet, and the only way to make it leave is to understand it.

## How it was built with Kiro

Kiro wrote all the code. The project director (a beginner) decided what to build and approved every step.

- **Specs** (`.kiro/specs/`): one per feature (`project-skeleton`, `ghost-detection`, `exorcism`, `pages-deploy`, `web-demo`). Requirements, design and tasks were approved before any code, and each task ended in its own commit.

- **Steering** (`.kiro/steering/`): always-loaded rules for work, git, testing, product and stack, plus two manual ones (`#next-task`, `#close-task`) for the task cycle.

- **Hooks** (`.kiro/hooks/test-after-task.json`): one command hook that runs `npm run check` after each spec task (`PostTaskExec`).

- **Property-based tests** (fast-check) for the rules that must always hold.

- **Chat spikes**: before the exorcism spec, three manual tests in chat checked whether the questions really make a beginner think. Their findings shaped the requirements.

- **Custom agent** (`.kiro/agents/reviewer.md`): a read-only reviewer. It is defined but has not been used yet.

More detail: [docs/kiro-usage-log.md](docs/kiro-usage-log.md).

## Run it locally

Requires Node.js 24 or newer. From the repository root:

```sh
npm install
npm run check
```

`npm run check` runs lint, format check, build and tests. It needs no network and no secrets.

`npm run test:live` calls the real GitHub API (lukeed/sirv, no token). It is run by hand and is not part of `npm run check`. The two live tests use about 17 of the 60 requests per hour that GitHub allows without an account.

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
