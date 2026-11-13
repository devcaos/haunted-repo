---
inclusion: always
---

# Product: Haunted Repo

## What it is
Haunted Repo finds the AI-written code in a repository that its owner does not yet understand (the "ghosts") and helps the owner "exorcise" it by really understanding it, through explanations and questions.

## The problem
- More and more people build software by directing an AI. The code works, but nobody has read it or understands it.
- This gap is called **comprehension debt**: the distance between the code a project contains and the code someone understands (Addy Osmani, addyosmani.com/blog/comprehension-debt; O'Reilly Radar).
- According to those sources, no tool measures that comprehension. That is the gap Haunted Repo fills.
- Origin: the author's previous project (Duly) was written by an AI and nobody read the code.

## Who it is for
1. Main audience: beginners who build projects by directing an AI without understanding the code (for example first-year vocational students like the author). Explanations come first, in plain words, and questions are about behaviour.
2. Secondary: anyone who programs by directing agents ("vibe coding").
3. Later idea, not in this version: teachers who want to know whether a student understands the code, through the "exorcism certificate".

## How it works
- The repository is a **haunted house**: it has three floors: attic (easy), middle floor and basement (hard).
- Ghost detection (done, packages/core/src/ghost-detection/): from a public GitHub repository URL it picks up to 5 key source files (TypeScript, JavaScript, Java or Python). Each one is a ghost with a difficulty score from 0 to 100, a floor and one plain sentence that says why. Ghosts are ordered from easy to hard.
- Exorcism (done, packages/core/src/exorcism/): a pure engine guides the user's own Kiro (the Tutor). The Tutor explains the file in plain words and asks 3 questions about its behaviour, one at a time; the first one is the core question. "I don't know" gets a simpler explanation and the same question again; a second one gets a short model answer. The ghost is exorcised with at least 2 good answers out of 3 when the core question is not wrong.
- A map shows how much of the project is still haunted.

## Deliverables
- **Kiro Power**: the real tool, built on packages/core. The AI that explains and judges is the user's own Kiro, so there are no paid APIs. Exact format to confirm in the Power spec.
- **Static demo website** on GitHub Pages (https://devcaos.github.io/haunted-repo/): the ghosts and a recorded exorcism of the public repository lukeed/sirv (MIT licence; its notice must be shown), so judges can try it without installing anything. What the judge can do on the page is decided in the web demo spec. It must stay online and free until 29 January 2027.

## Out of scope (for now)
- One ghost per line of code (version 1 is per file).
- Teacher dashboards, accounts, grades or any server-side storage.
- Calling a paid or external AI API. All AI work happens in the user's Kiro.
- Exorcism certificate (listed in `PLAN.md` under "Pendientes").
- Support for IDEs other than Kiro.
- Using code from Duly in public.
- A Kiro hook that marks every file the agent writes (replaced by ghost detection from a repository URL).
- One room per folder.
- Third-party brands or music in the demo video.

## Known risks
- Questions may not really measure understanding. A spike tests this first.
- Existing "explain this code" modes exist. The difference is measuring and tracking what the user understands.
- Open design question: what happens when the code of an exorcised ghost changes.
