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
1. **Students** who program with AI (vocational training, bootcamps, university). Main audience.
2. **Teachers**, who need to know whether a student understands the code they hand in. The student delivers the project with an "exorcism certificate" (idea only, not in the first version).
3. Secondary: anyone who programs by directing agents ("vibe coding").

## How it works
- The repository is a **haunted house**: each folder is a room.
- AI-written code that the user has not validated is a **ghost**. Minimum version: one ghost per file, not per line.
- To exorcise a ghost, the user gets a beginner-friendly explanation and **questions that make them think** (open questions, or "what does this code return?"). The AI corrects the answers. If the user passes, the ghost disappears.
- A map shows how much of the project is still haunted.

## Deliverables
- **Kiro Power**: the real tool. The AI that explains and corrects is the user's own Kiro, so there are no paid APIs.
- **Kiro hook**: marks as a ghost every file the agent creates or changes.
- **Static demo website**: an example repository already haunted, with pre-generated questions, so judges can try it without installing anything. Must stay online and free until 29 January 2027.

## Out of scope (for now)
- One ghost per line of code (version 1 is per file).
- Teacher dashboards, accounts, grades or any server-side storage.
- Calling a paid or external AI API. All AI work happens in the user's Kiro.
- Exorcism certificate (listed in `PLAN.md` under "Pendientes").
- Support for IDEs other than Kiro.
- Using code from Duly in public. The demo repository is new and made for the demo.
- Third-party brands or music in the demo video.

## Known risks
- Questions may not really measure understanding. A spike tests this first.
- Existing "explain this code" modes exist. The difference is measuring and tracking what the user understands.
- Open design questions: what counts as a ghost, and what happens when the code changes.
