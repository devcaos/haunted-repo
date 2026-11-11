# Requirements Document

## Introduction

Exorcism is the second real feature of Haunted Repo. The ghost-detection feature already returns a Haunted_Report: 3 to 5 key files of a public GitHub repository, ordered from easy to hard. This feature takes those ghosts one by one and helps a beginner understand each file well enough to "exorcise" it.

The audience is a beginner who builds projects with AI and does not understand the code. For each ghost, the exorcism follows this approach (approved by the project director):

1. First, the file is explained in plain language.
2. Then the student answers questions about the **behaviour** of the file (never about specific lines or syntax details). The questions are adapted to the kind of file.
3. If the student answers "I don't know", the part is explained again in a simpler way and the question is asked again.
4. Every "why" in the explanation is presented as a probable reason, never as a sure fact.
5. The student moves through the house from easy ghosts to hard ghosts.

The AI that explains and corrects is the student's own Kiro. This project never calls an AI API. So this feature has two parts: (a) plain deterministic code in `packages/core` that decides what happens and builds the instructions for Kiro, and (b) the text that Kiro writes at run time, which no automated test can call. Part (b) is covered by the manual spike (see `docs/spike-explicacion.md`).

This feature also fixes a known problem of ghost detection: the `reason` sentence of every ghost starts with "It is hard mostly because…", which sounds wrong for easy files (PLAN.md, PR #11 review). This changes ghost-detection Requirement 5.4 and its tests; the change is made in this spec.

All user-visible text is in English. Before the design starts, a second spike must be done with a file that has real logic (loops and conditions), because the first spike (docs/spike-explicacion.md) only tested a types file. The first version uses only floors by difficulty; folders as rooms are an optional improvement outside the minimum version.

Deadline: minimum working version by 20 Nov 2026.

## Glossary

- **Ghost**: a key file of the Haunted_Report (see the ghost-detection spec).
- **Haunted_Report**: the result of ghost detection: an overview plus the ordered list of Ghosts. It holds no progress state.
- **Exorcism_Engine**: the code in `packages/core` that runs the exorcism of one Ghost as a sequence of steps. It decides the next step and builds the Tutor_Instructions. It never calls an AI.
- **Tutor**: the student's own Kiro, which writes the explanation and the questions and judges the answers, following the Tutor_Instructions.
- **Tutor_Instructions**: the plain text that the Exorcism_Engine builds for the Tutor for one step.
- **Student**: the person who exorcises the Ghosts.
- **File_Kind**: one of four labels for a Ghost: `data-shape` (describes the shape of data, with no real logic), `logic` (functions that take inputs and give results), `entry-point` (starts or connects other parts) or `general` (anything else).
- **Question_Set**: the 3 behaviour questions for a Ghost, chosen from its File_Kind.
- **Rating**: the judgement of one answer: `right`, `half-right` or `wrong`.
- **Simpler_Explanation**: a second explanation of the same part, with a new everyday analogy and fewer words, given after "I don't know".
- **Exorcism_Progress**: plain JSON-serialisable data that says, for each Ghost, whether it is `haunted` or `exorcised`, and the Ratings of the last attempt.
- **Haunted_Share**: the number of Ghosts still `haunted` divided by the number of Ghosts in the Haunted_Report.
- **Ghost_Sentence**: the `reason` field of a Ghost: one English sentence that says why the file is easy or hard.

## Requirements

### Requirement 1: Go through the ghosts from easy to hard

**User Story:** As a student, I want to start with the easiest ghost and move up through the house, so that I build confidence before the hard files.

#### Acceptance Criteria

1. WHEN the Student starts an exorcism with a Haunted_Report, THE Exorcism_Engine SHALL offer first the `haunted` Ghost with the lowest Difficulty_Score, breaking ties by path in ascending alphabetical order.
2. WHEN a Ghost becomes `exorcised`, THE Exorcism_Engine SHALL offer next the remaining `haunted` Ghost with the lowest Difficulty_Score.
3. WHEN no `haunted` Ghost remains, THE Exorcism_Engine SHALL report that the house is clean, with an English message.
4. THE Exorcism_Engine SHALL work on one Ghost at a time.
5. FOR ALL Haunted_Reports and all Exorcism_Progress values, the Ghost offered next SHALL be a `haunted` Ghost, and no `haunted` Ghost SHALL have a lower Difficulty_Score than it (order property).

### Requirement 2: Explain the file first, in plain language

**User Story:** As a beginner, I want the file explained to me in simple words before any question, so that I am never asked about something I have not seen explained.

#### Acceptance Criteria

1. WHEN the Student starts a Ghost, THE Exorcism_Engine SHALL build Tutor_Instructions that ask for an explanation and SHALL NOT include any question in that step.
2. THE Tutor_Instructions for an explanation SHALL ask the Tutor to say first WHAT the file does in the project and only then HOW it does it, in small pieces.
3. THE Tutor_Instructions SHALL ask the Tutor to avoid jargon, and to define any unavoidable technical term in one sentence with an everyday analogy.
4. THE Tutor_Instructions SHALL ask the Tutor to use simple words and short sentences, and to write in English.
5. THE Tutor_Instructions SHALL forbid the Tutor from asking about specific lines, line numbers or syntax details.
6. THE Tutor_Instructions SHALL contain the text of the Ghost and its path, read at the same `ref` as the Haunted_Report.
7. THE Exorcism_Engine SHALL NOT ask the first question of a Ghost until the explanation step of that Ghost is finished.

### Requirement 3: Present every "why" as a probable reason

**User Story:** As a beginner, I want to know when the explanation is a guess, so that I do not learn a wrong reason as a fact.

#### Acceptance Criteria

1. THE Tutor_Instructions for every step SHALL ask the Tutor to present each reason for why the code does something as the probable reason, with words such as "probably" or "most likely", and never as a sure fact.
2. THE Tutor_Instructions SHALL ask the Tutor to separate what the code does (which can be read in the file) from why the author wrote it that way (which is a guess).
3. THE Tutor_Instructions SHALL ask the Tutor to say so when it cannot tell the reason from the file, instead of inventing one.
4. WHEN the Tutor judges an answer, THE Tutor_Instructions SHALL ask the Tutor not to mark an answer `wrong` only because it gives a different probable reason than the Tutor's.

### Requirement 4: Ask three behaviour questions adapted to the kind of file

**User Story:** As a beginner, I want questions that fit the file I just read about, so that every question makes sense and makes me think.

#### Acceptance Criteria

1. THE Exorcism_Engine SHALL assign each Ghost exactly one File_Kind from the closed list `data-shape`, `logic`, `entry-point` and `general`.
2. FOR ALL file contents, assigning the File_Kind twice to the same content SHALL give the same File_Kind (determinism property).
3. THE Exorcism_Engine SHALL give each File_Kind a Question_Set of exactly 3 questions about behaviour.
4. THE Question_Set of `data-shape` SHALL ask: what the file is for, what data one record carries, and what happens when one piece of data is missing.
5. THE Question_Set of `logic` SHALL ask: what the file does, what goes in and what comes out, and when it fails or what can go wrong.
6. THE Question_Set of `entry-point` SHALL ask: what the file starts or connects, which other parts it uses and in what order, and what happens if one of those parts fails.
7. THE Question_Set of `general` SHALL ask: what the file is for, what the student would notice in the project if the file did not exist, and what could go wrong in it.
8. THE Exorcism_Engine SHALL NOT use "what goes in and what comes out" for a Ghost whose File_Kind is `data-shape`.
9. THE Exorcism_Engine SHALL ask the questions one at a time, and SHALL NOT ask the next question until the current one has a Rating.
10. THE Tutor_Instructions for a question SHALL forbid questions about specific lines, line numbers or syntax details.
11. FOR ALL Ghosts, the Question_Set SHALL have 3 questions, and no question text SHALL contain the words "line" followed by a number (behaviour-only property).
12. THE Exorcism_Engine SHALL allow a question to ask the Student to predict a behaviour (for example, "What happens if the list arrives empty?"), and SHALL NOT allow a prediction question about one specific line.

### Requirement 5: Handle "I don't know" with a simpler explanation

**User Story:** As a beginner, I want the tutor to explain again in an easier way when I say I do not know, so that I do not give up.

#### Acceptance Criteria

1. WHEN the Student answers "I don't know" (or an equivalent such as "no idea" or "I have no clue") to a question, THE Exorcism_Engine SHALL build Tutor_Instructions that ask for a Simpler_Explanation of the part the question is about, and SHALL NOT give a Rating yet.
2. THE Tutor_Instructions for a Simpler_Explanation SHALL ask the Tutor to use a new everyday analogy that is different from the one used before, and to be shorter than the previous explanation.
3. WHEN the Simpler_Explanation is finished, THE Exorcism_Engine SHALL ask the same question again.
4. IF the Student answers "I don't know" to the same question a second time, THEN THE Exorcism_Engine SHALL give that question the Rating `wrong`, ask the Tutor to show a short model answer, and continue with the next question.
5. THE Exorcism_Engine SHALL allow at most one Simpler_Explanation per question.
6. FOR ALL sequences of Student answers, the number of Simpler_Explanations in one Ghost SHALL be at most 3 and each question SHALL be asked at most twice (bounded-loop property).

### Requirement 6: Rate the answers and decide when a ghost is exorcised

**User Story:** As a student, I want to see if my answer is right, half right or wrong and why, so that I learn from every answer and know when a ghost is gone.

#### Acceptance Criteria

1. WHEN the Student gives an answer, THE Tutor_Instructions SHALL ask the Tutor to give a Rating (`right`, `half-right` or `wrong`) and one short reason in plain language.
2. THE Tutor_Instructions SHALL ask the Tutor to judge the behaviour that the answer describes, not the exact words used.
3. WHEN all 3 questions of a Ghost have a Rating, THE Exorcism_Engine SHALL mark the Ghost `exorcised` IF at least 2 of the 3 Ratings are `right` or `half-right`.
4. IF fewer than 2 of the 3 Ratings are `right` or `half-right`, THEN THE Exorcism_Engine SHALL keep the Ghost `haunted` and SHALL offer the Student to try the same Ghost again after a new explanation.
5. WHEN a Ghost is marked `exorcised`, THE Exorcism_Engine SHALL ask the Student whether the file is now understood, with the options "yes", "half" and "no", SHALL show the answer, and SHALL store it in the Exorcism_Progress, and SHALL NOT use it to change the state of the Ghost.
6. FOR ALL lists of 3 Ratings, the Ghost SHALL be `exorcised` if and only if at least 2 Ratings are `right` or `half-right` (decision property).

### Requirement 7: Keep the progress as plain data and show how haunted the house is

**User Story:** As a student, I want my progress saved as simple data and a clear number of ghosts left, so that I can continue later and see the house getting clean.

#### Acceptance Criteria

1. THE Exorcism_Progress SHALL be separate from the Haunted_Report, so that the Haunted_Report stays free of progress state.
2. THE Exorcism_Progress SHALL contain only JSON-serialisable values.
3. THE Exorcism_Progress SHALL record, for each Ghost, its path, its state (`haunted` or `exorcised`), the Ratings of the last attempt and the "yes", "half" or "no" answer when it exists.
4. FOR ALL valid Exorcism_Progress values, converting to JSON text and parsing it back SHALL produce an equal value (round-trip property).
5. IF JSON text is not a valid Exorcism_Progress, THEN THE Exorcism_Progress parser SHALL return the error `INVALID_PROGRESS` with an English message.
6. IF the Exorcism_Progress names a path that is not in the Haunted_Report, or misses a Ghost of the Haunted_Report, THEN THE Exorcism_Engine SHALL ignore the unknown path and treat the missing Ghost as `haunted`.
7. THE Exorcism_Engine SHALL calculate the Haunted_Share for a Haunted_Report and an Exorcism_Progress.
8. FOR ALL Haunted_Reports and Exorcism_Progress values, the Haunted_Share SHALL be a number from 0 to 1, SHALL be 1 when no Ghost is `exorcised`, and SHALL be 0 when all Ghosts are `exorcised`.
9. FOR ALL Haunted_Reports, marking one more Ghost `exorcised` SHALL NOT raise the Haunted_Share (monotonic property).

### Requirement 8: Give each ghost a sentence that fits its difficulty

**User Story:** As a student, I want the sentence under each ghost to fit the file, so that an easy file is not described as "hard".

#### Acceptance Criteria

1. THE Ghost_Sentence SHALL be one English sentence that names the Factor with the highest share of the Difficulty_Score and includes its measured value.
2. WHERE a Ghost has the Floor `attic`, THE Ghost_Sentence SHALL NOT contain the word "hard".
3. WHERE a Ghost has the Floor `basement`, THE Ghost_Sentence SHALL say that the file is a hard one.
4. THE Ghost_Sentence of a Ghost with the Floor `attic` SHALL NOT start with the same words as the Ghost_Sentence of a Ghost with the Floor `basement`.
5. FOR ALL Factors, the Ghost_Sentence SHALL be the same for the same Factors (determinism property).
6. THE Ghost_Sentence SHALL stay a plain string in the Haunted_Report, so that a Haunted_Report saved before this change is still a valid Haunted_Report.
7. THE rules of this requirement SHALL replace the rule of ghost-detection Requirement 5.4, and THE tasks of this spec SHALL update the ghost-detection tests that expect the sentence "It is hard mostly because…".

### Requirement 9: Tests, platform and location

**User Story:** As the project director, I want this feature tested as far as a test can go, run on my own computer and usable in the web demo, so that the demo does not break by surprise.

#### Acceptance Criteria

1. THE Exorcism_Engine SHALL live in `packages/core` next to ghost detection, so that the demo website and the Power use the same code.
2. THE Exorcism_Engine SHALL run in Node.js 24 and in a browser, using no Node-only APIs, and SHALL work without any token, key or environment variable.
3. THE Exorcism_Engine SHALL NOT call any AI service and SHALL NOT call any network service other than the public GitHub API used to read the text of a Ghost.
4. THE project SHALL include property-based tests for the properties stated in Requirements 1.5, 4.2, 4.11, 5.6, 6.6, 7.4, 7.8, 7.9 and 8.5.
5. THE project SHALL include at least one test against the real GitHub API that reads the text of a Ghost of `lukeed/sirv` at the pinned commit of the ghost-detection live test, run only through `npm run test:live`.
6. THE Tutor text SHALL be checked by the manual spike (`docs/spike-explicacion.md`), because no automated test can call the user's Kiro. The test for Tutor_Instructions SHALL check only that the required rules are present in the text.
7. THE commands `npm test` and `npm run check` SHALL pass and SHALL NOT call the real GitHub.

## Edge Cases

- The Student answers with an empty text: treated as "I don't know".
- The Student answers "I don't know" twice to the same question: `wrong`, model answer, next question.
- The Student fails a Ghost (fewer than 2 good Ratings): it stays `haunted` and can be tried again after a new explanation.
- The Ghost has 0 lines or only comments: File_Kind `general`, and the explanation says that the file has almost no code.
- The Ghost text cannot be read (network error or rate limit): English error message, the state of the Ghost does not change.
- A Haunted_Report with `fewFiles` set to `true` (1 or 2 Ghosts): the exorcism works the same.
- A Haunted_Report with `partial` set to `true`: only the Ghosts in the report are used.
- The Haunted_Report changes (another repository or another `ref`) while an Exorcism_Progress exists: the progress of unknown paths is ignored (Requirement 7.6).
- The Student's answer is long or in another language: the Tutor judges the behaviour described, not the language.
- All Ghosts are `exorcised`: the house is clean message; no more questions.

## Out of Scope

- The exorcism certificate and any teacher feature (stays in `PLAN.md` under "Pendientes").
- One ghost per line of code.
- Questions about specific lines, line numbers or syntax details.
- Calling any AI API; the Tutor is always the student's own Kiro.
- The visual map of the house and the horror interface (web spec).
- The web demo walkthrough: a recorded example run on lukeed/sirv, with sample answers and no live correction (web spec). The exorcism code must give the web spec the data it needs to show it.
- Folders as rooms of the house (optional improvement, outside the minimum version).
- The packaging as a Kiro Power, the MCP server and any Kiro hook (Power spec).
- Where Exorcism_Progress is stored (file, browser storage or other) and the interface to read and write it. This is decided in the design or in the web and Power specs.
- Private repositories and any authentication.
- Languages other than TypeScript, JavaScript, Java and Python.
- Servers, accounts, databases and grades.
- Updating `product.md` and `tech.md`.

## Open Questions

These points are not decided. They are for the project director to decide. Each one has a recommendation that has NOT been applied to this document.

1. **"Detect all AI-written code" vs "3 to 5 key files".** `idea.md` and `product.md` talk about every file the agent wrote, marked by a hook. The approved approach picks 3 to 5 key files of a public repository. PLAN.md lists the update of `product.md` and `tech.md` as pending. Is that update done before this spec is designed?
   Recommendation: yes, in a small docs branch before the design, so the steering files do not contradict the specs.
2. **A map of the house.** This document only defines the number (Haunted_Share). The map itself belongs to the web spec. Is that split right, and should the map count files or something finer?
   Recommendation: keep the split; the map counts files (one ghost per file), as in `product.md`.
3. **Where the progress is saved.** `tech.md` suggests a plain JSON file in the user's repo (`.haunted/ghosts.json`) and the ghost-detection spec keeps state out of the report. The web demo has no storage and the Power may read local files.
   Recommendation: no storage in the web (the demo is a recorded walkthrough); a separate JSON file in the user's repo for the Power; the exact name and format are decided in the design.
4. **Local project vs public GitHub repository.** Ghost detection reads only public GitHub repositories. The Student's own project may be private or only on disk, and the Power runs inside the Student's Kiro. Should the Power read the Ghost text from the local disk instead of GitHub?
   Recommendation: yes for the Power; the Exorcism_Engine takes the file text as input, and GitHub is used only by the demo and the live test.
5. **Language of the Tutor and the Student's background.** The spike used Spanish and comparisons with Java. The project rule says all app text is in English. Should the Tutor answer in English only, and should the Java comparisons be kept only when the Student says they know Java?
   Recommendation: English only; use everyday analogies by default and Java comparisons only when the Student says they know Java.
6. **Free choice of ghost.** Requirement 1 offers the easiest ghost next. Should the Student be allowed to pick any ghost, or must the order be kept?
   Recommendation: offer the easiest ghost by default, but let the Student pick another one; progress is stored per ghost, so nothing breaks.