# Requirements Document

## Introduction

Exorcism is the second real feature of Haunted Repo. The ghost-detection feature already returns a Haunted_Report: 3 to 5 key files of a public GitHub repository, ordered from easy to hard. This feature takes those ghosts and helps a beginner understand each file well enough to "exorcise" it.

The audience is a beginner who builds projects with AI and does not understand the code. For each ghost, the exorcism follows this approach (approved by the project director):

1. First, the file is explained in plain language.
2. Then the student answers questions about the **behaviour** of the file (never about specific lines or syntax details). The questions are adapted to the kind of file.
3. If the student does not know the answer, the part is explained again in a simpler way and the question is asked again.
4. Every "why" in the explanation is presented as a probable reason, never as a sure fact.
5. The student moves through the house from easy ghosts to hard ghosts. The easiest ghost is offered by default, but the student may pick any ghost that is still haunted.

The AI that explains and judges is the student's own Kiro. This project never calls an AI API. So this feature has two parts: (a) plain deterministic code in `packages/core`, a pure step machine that receives the current state and one event and returns the new state and the instructions for Kiro, and (b) the text that Kiro writes at run time, which no automated test can call. Part (b) is covered by manual spikes (see `docs/spike-explicacion.md`).

The engine never reads GitHub or the disk. The caller (the Power, the web demo or a test) gives it the text of the ghost as input.

A session can be saved as JSON data (the list of events plus the texts the Tutor wrote) and replayed with exactly the same results. These data are what the recorded walkthrough of the web demo on `lukeed/sirv` will use.

This feature also fixes a known problem of ghost detection: the `reason` sentence of every ghost starts with "It is hard mostly because…", which sounds wrong for easy files (PLAN.md, PR #11 review). This changes ghost-detection Requirement 5.4 and its tests; the change is made in this spec.

Before the design starts, a second spike must be done with a file that has real logic (loops and conditions), because the first spike (`docs/spike-explicacion.md`) only tested a types file. The first version uses only floors by difficulty; folders as rooms are an optional improvement outside the minimum version.

Deadline: minimum working version by 20 Nov 2026.

## Glossary

- **Ghost**: a key file of the Haunted_Report (see the ghost-detection spec).
- **Ghost_Text**: the text of a Ghost, given to the Exorcism_Engine by the caller. The engine does not read it from anywhere.
- **Haunted_Report**: the result of ghost detection: an overview plus the ordered list of Ghosts. It holds no progress state.
- **Exorcism_Engine**: the code in `packages/core` that runs the exorcism as a pure step machine. It never calls an AI and never reads GitHub or the disk.
- **Session_State**: the state of the Exorcism_Engine: the current Step, the Exorcism_Progress, the Student_Profile, the current Ghost, the Ratings of the current attempt, and the question texts already asked for each Ghost. It is JSON-serialisable.
- **Step**: the part of the exorcism where the Session_State is. One of `choosing`, `explaining`, `asking`, `simplifying`, `model-answer`, `self-check`, `failed` or `house-clean`.
- **Event**: one input of the Exorcism_Engine, from the closed list in Requirement 10: `pick-ghost`, `explanation-done`, `answer-rated`, `dont-know`, `self-check-answered`, `retry-ghost` and `leave-ghost`.
- **Tutor**: the student's own Kiro, which writes the explanations and the questions and judges the answers, following the Tutor_Instructions.
- **Tutor_Instructions**: the plain text that the Exorcism_Engine builds for the Tutor for the next Step.
- **Verdict**: the judgement of the Tutor on one Student answer, in a fixed format: `right`, `half-right`, `wrong` or `dont-know`.
- **Rating**: a Verdict that is `right`, `half-right` or `wrong`.
- **Student**: the person who exorcises the Ghosts.
- **Student_Profile**: input data about the Student. For now it has one field, `knowsJava` (true or false).
- **File_Kind**: one of four labels for a Ghost: `data-shape` (describes the shape of data, with no real logic), `logic` (functions that take inputs and give results), `entry-point` (starts or connects other parts) or `general` (anything else).
- **Question_Set**: the 3 question objectives of a File_Kind. An objective says what a question must find out. The Tutor writes the real question.
- **Core_Question**: the question of the first objective of a Question_Set (the one about what the file is for or does). It is always the first question asked in an attempt.
- **Simpler_Explanation**: a second explanation of the same part, with a new everyday analogy and fewer words, given after a `dont-know` Verdict.
- **Exorcism_Progress**: plain JSON-serialisable data that says, for each Ghost, whether it is `haunted` or `exorcised`, the Ratings of the last attempt and the self-check answer.
- **Haunted_Share**: the number of Ghosts still `haunted` divided by the number of Ghosts in the Haunted_Report.
- **Ghost_Sentence**: the `reason` field of a Ghost: one English sentence that says why the file is easy, medium or hard.
- **Session_Recording**: JSON data with the starting inputs of a session and the ordered list of Events, including the texts the Tutor wrote.

## Requirements

### Requirement 1: Go through the ghosts from easy to hard, or pick one

**User Story:** As a student, I want to start with the easiest ghost and move up through the house, but be free to pick another ghost, so that I build confidence first and still control my own work.

#### Acceptance Criteria

1. WHEN a session starts, THE Exorcism_Engine SHALL suggest the `haunted` Ghost with the lowest Difficulty_Score, breaking ties by path in ascending alphabetical order.
2. WHEN a Ghost becomes `exorcised`, or the Student leaves a Ghost, THE Exorcism_Engine SHALL suggest again the `haunted` Ghost with the lowest Difficulty_Score.
3. WHEN no `haunted` Ghost remains, THE Exorcism_Engine SHALL go to the Step `house-clean` with an English message that the house is clean.
4. THE Exorcism_Engine SHALL accept the choice of any Ghost that is `haunted`, not only the suggested one.
5. THE Exorcism_Engine SHALL work on one Ghost at a time.
6. FOR ALL Haunted_Reports and all Exorcism_Progress values, the suggested Ghost SHALL be a `haunted` Ghost with no `haunted` Ghost of lower Difficulty_Score, and choosing a Ghost that is `exorcised` or not in the Haunted_Report SHALL return an error and leave the Session_State unchanged (suggestion property).

### Requirement 2: Explain the file first, in plain language

**User Story:** As a beginner, I want the file explained to me in simple words before any question, so that I am never asked about something I have not seen explained.

#### Acceptance Criteria

1. WHEN the Student picks a Ghost, THE Exorcism_Engine SHALL build Tutor_Instructions that ask for an explanation and SHALL NOT include any question in that Step.
2. THE Tutor_Instructions for an explanation SHALL ask the Tutor to say first WHAT the file does in the project and only then HOW it does it, in small pieces.
3. THE Tutor_Instructions SHALL ask the Tutor to avoid jargon, and to define any unavoidable technical term in one sentence with an everyday analogy.
4. THE Tutor_Instructions SHALL ask the Tutor to use simple words and short sentences, and to write in English.
5. THE Tutor_Instructions SHALL forbid the Tutor from asking about specific lines, line numbers or syntax details.
6. THE Tutor_Instructions SHALL contain the path of the Ghost and the Ghost_Text that the caller gave to the Exorcism_Engine.
7. THE Exorcism_Engine SHALL NOT go to the Step `asking` until the Step `explaining` is finished.
8. WHERE the Student_Profile has `knowsJava` set to `true`, THE Tutor_Instructions SHALL allow the Tutor to compare with Java; OTHERWISE THE Tutor_Instructions SHALL forbid comparisons with Java and ask for everyday analogies only.
9. WHEN the Student_Profile is missing, THE Exorcism_Engine SHALL treat `knowsJava` as `false`.
10. FOR ALL Student_Profiles and Ghosts, THE Tutor_Instructions SHALL allow comparisons with Java if and only if `knowsJava` is `true` (Java-rule property).
11. THE Tutor_Instructions for the first explanation SHALL ask the Tutor to use at most about 150 words and to leave out secondary details; those details belong to the Simpler_Explanation (Requirement 5.4).

### Requirement 3: Present every "why" as a probable reason

**User Story:** As a beginner, I want to know when the explanation is a guess, so that I do not learn a wrong reason as a fact.

#### Acceptance Criteria

1. THE Tutor_Instructions for every Step SHALL ask the Tutor to present each reason for why the code does something as the probable reason, with words such as "probably" or "most likely", and never as a sure fact.
2. THE Tutor_Instructions SHALL ask the Tutor to separate what the code does (which can be read in the file) from why the author wrote it that way (which is a guess).
3. THE Tutor_Instructions SHALL ask the Tutor to say so when it cannot tell the reason from the file, instead of inventing one.
4. WHEN the Tutor judges an answer, THE Tutor_Instructions SHALL ask the Tutor not to give the Verdict `wrong` only because the answer gives a different probable reason than the Tutor's.

### Requirement 4: Ask three behaviour questions adapted to the kind of file

**User Story:** As a beginner, I want questions that fit the file I just read about, so that every question makes sense and makes me think.

#### Acceptance Criteria

1. THE Exorcism_Engine SHALL assign each Ghost exactly one File_Kind from the closed list `data-shape`, `logic`, `entry-point` and `general`, from the Ghost_Text.
2. FOR ALL Ghost_Texts, assigning the File_Kind twice to the same text SHALL give the same File_Kind (determinism property).
3. THE Exorcism_Engine SHALL give each File_Kind a Question_Set of exactly 3 objectives about behaviour.
4. THE Question_Set of `data-shape` SHALL have the objectives: what the file is for, what data one record carries, and what happens when one piece of data is missing.
5. THE Question_Set of `logic` SHALL have the objectives: what the file does, what goes in and what comes out, and when it fails or what can go wrong.
6. THE Question_Set of `entry-point` SHALL have the objectives: what the file starts or connects, which other parts it uses and in what order, and what happens if one of those parts fails.
7. THE Question_Set of `general` SHALL have the objectives: what the file is for, what the Student would notice in the project if the file did not exist, and what could go wrong in it.
8. THE Exorcism_Engine SHALL NOT use the objective "what goes in and what comes out" for a Ghost whose File_Kind is `data-shape`.
9. THE Exorcism_Engine SHALL ask the questions one at a time, and SHALL NOT go to the next question until the current one has a Rating. THE Tutor_Instructions for a question SHALL ask the Tutor to write exactly one question in the message, and SHALL NOT contain the objective of any other question. THE Core_Question SHALL be the first question of every attempt.
10. THE Tutor_Instructions for a question SHALL give the objective of that question and ask the Tutor to write the question about this concrete file, using its real names, data and behaviour, and SHALL forbid questions about specific lines, line numbers or syntax details.
11. FOR ALL Ghosts and attempts, THE Tutor_Instructions for a question SHALL contain the objective, the path of the Ghost, the rule that the question is about this concrete file and the ban on lines, and for an attempt after the first they SHALL also contain the question texts already asked for that Ghost and the rule to ask different questions; no objective SHALL contain a line number (instruction-rules property).
12. THE Tutor SHALL be allowed to write a question that asks the Student to predict a behaviour (for example, "What happens if the list arrives empty?"), and THE Tutor_Instructions SHALL forbid a prediction question about one specific line.
13. WHEN the Student tries again a Ghost that was not exorcised, THE Tutor_Instructions SHALL list the question texts already asked for that Ghost and SHALL ask the Tutor to write different questions that keep the same objectives.

### Requirement 5: Handle "I don't know" with a simpler explanation

**User Story:** As a beginner, I want the tutor to explain again in an easier way when I do not know the answer, so that I do not give up.

#### Acceptance Criteria

1. THE Tutor SHALL decide whether an answer of the Student means "I don't know", in any language, and an empty answer or an answer that does not try to answer SHALL count as "I don't know"; the Tutor reports it with the Verdict `dont-know`.
2. THE Exorcism_Engine SHALL NOT search the text of the Student for any phrase and SHALL NOT receive the text of the Student answers.
3. WHEN the Event `dont-know` arrives in the Step `asking` for the first time for a question, THE Exorcism_Engine SHALL go to the Step `simplifying`, SHALL NOT give a Rating, and SHALL build Tutor_Instructions that ask for a Simpler_Explanation of the part the question is about.
4. THE Tutor_Instructions for a Simpler_Explanation SHALL contain the explanation text given before, and SHALL ask the Tutor to use a new everyday analogy that is different from the one used before, to use at most about 150 words, and to add the details that the first explanation left out, only for the part the question is about.
5. WHEN the Simpler_Explanation is finished, THE Exorcism_Engine SHALL go back to the Step `asking` and ask the same question again.
6. WHEN the Event `dont-know` arrives for the same question a second time, THE Exorcism_Engine SHALL give that question the Rating `wrong`, go to the Step `model-answer`, and ask the Tutor to show a short model answer; WHEN the model answer is finished, THE Exorcism_Engine SHALL continue with the next question.
7. THE Exorcism_Engine SHALL allow at most one Simpler_Explanation per question.
8. FOR ALL sequences of Events, the number of Simpler_Explanations in one attempt at a Ghost SHALL be at most 3 and each question SHALL be asked at most twice (bounded-loop property).

### Requirement 6: Rate the answers and decide when a ghost is exorcised

**User Story:** As a student, I want to see if my answer is right, half right or wrong and why, so that I learn from every answer and know when a ghost is gone.

#### Acceptance Criteria

1. WHEN the Student gives an answer, THE Tutor_Instructions SHALL ask the Tutor to give a short reason in plain language and then the Verdict in the fixed format of Requirement 10.
2. THE Tutor_Instructions SHALL ask the Tutor to judge the behaviour that the answer describes, not the exact words used.
3. WHEN all 3 questions of a Ghost have a Rating, THE Exorcism_Engine SHALL mark the Ghost `exorcised` IF at least 2 of the 3 Ratings are `right` or `half-right` AND the Rating of the Core_Question is not `wrong`, and SHALL go to the Step `self-check`.
4. IF fewer than 2 of the 3 Ratings are `right` or `half-right`, OR the Rating of the Core_Question is `wrong`, THEN THE Exorcism_Engine SHALL keep the Ghost `haunted`, go to the Step `failed` and offer the Student to try the same Ghost again after a new explanation, or to pick another Ghost.
5. WHEN the Step is `self-check`, THE Tutor_Instructions SHALL ask the Student whether the file is now understood, with the options "yes", "half" and "no"; THE Exorcism_Engine SHALL show the answer and store it in the Exorcism_Progress, and SHALL NOT use it to change the state of the Ghost.
6. FOR ALL lists of 3 Ratings, where the first Rating is the one of the Core_Question, the Ghost SHALL be `exorcised` if and only if at least 2 Ratings are `right` or `half-right` and the first Rating is not `wrong` (decision property).

### Requirement 7: Keep the progress as plain data and show how haunted the house is

**User Story:** As a student, I want my progress as simple data and a clear number of ghosts left, so that I can continue later and see the house getting clean.

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
10. THE Exorcism_Progress SHALL NOT be saved by the Exorcism_Engine; saving it is the job of the caller. The web demo SHALL NOT save any progress.

### Requirement 8: Give each ghost a sentence that fits its difficulty

**User Story:** As a student, I want the sentence under each ghost to fit the file, so that an easy file is not described as "hard".

#### Acceptance Criteria

1. THE Ghost_Sentence SHALL be one English sentence that names the Factor with the highest share of the Difficulty_Score and includes its measured value.
2. WHERE a Ghost has the Floor `attic`, THE Ghost_Sentence SHALL say that the file is easy and SHALL NOT contain the word "hard". For example: "It is easy to read; the part that weighs most is its length (35 lines of code)."
3. WHERE a Ghost has the Floor `middle floor`, THE Ghost_Sentence SHALL say that the file is of medium difficulty and SHALL NOT contain the whole words "hard" or "easy". For example: "It is of medium difficulty, mostly because it makes several decisions (12 if/elif/for/while/switch/case/catch)."
4. WHERE a Ghost has the Floor `basement`, THE Ghost_Sentence SHALL say that the file is hard. For example: "It is hard, mostly because it depends on many other files (18 imports)."
5. THE first three words of the Ghost_Sentence SHALL be different for each of the three Floors.
6. FOR ALL Factors, the Ghost_Sentence SHALL be the same for the same Factors (determinism property).
7. FOR ALL Factors, the Ghost_Sentence SHALL follow the word rules of its Floor in criteria 2, 3, 4 and 5 (floor-wording property).
8. THE Ghost_Sentence SHALL stay a plain string in the Haunted_Report, so that a Haunted_Report saved before this change is still a valid Haunted_Report.
9. THE rules of this requirement SHALL replace the rule of ghost-detection Requirement 5.4, and THE tasks of this spec SHALL update the ghost-detection tests that expect the sentence "It is hard mostly because…".

### Requirement 9: Tests, platform and location

**User Story:** As the project director, I want this feature tested as far as a test can go, run on my own computer and usable in the web demo, so that the demo does not break by surprise.

#### Acceptance Criteria

1. THE Exorcism_Engine SHALL live in `packages/core` next to ghost detection, so that the demo website and the Power use the same code.
2. THE Exorcism_Engine SHALL run in Node.js 24 and in a browser, using no Node-only APIs, and SHALL work without any token, key or environment variable.
3. THE Exorcism_Engine SHALL take the Ghost_Text as input and SHALL NOT read GitHub, the disk or any other network service, and SHALL NOT call any AI service.
4. THE project SHALL include property-based tests for these properties: suggestion (1.6), Java rule (2.10), File_Kind determinism (4.2), instruction rules (4.11), bounded loop (5.8), decision (6.6), Exorcism_Progress round-trip (7.4), Haunted_Share range (7.8) and monotonic (7.9), Ghost_Sentence determinism (8.6) and floor wording (8.7), invalid Event (10.6), engine determinism (10.7), Verdict round-trip (10.9), Session_Recording round-trip (11.2), replay (11.3) and sample-answer-ignored (11.9).
5. THE Exorcism_Engine SHALL use no external service, so no live test is required. THE Tutor text SHALL be checked by manual spikes (`docs/spike-explicacion.md` and the second spike with a file with logic), because no automated test can call the user's Kiro. The tests for Tutor_Instructions SHALL check only that the required rules are present in the text.
6. THE commands `npm test` and `npm run check` SHALL pass and SHALL NOT call the network.

### Requirement 10: Run the exorcism as a pure step machine

**User Story:** As a developer of the Power and the web demo, I want the engine to be a pure function of the state and one event, so that it is easy to test, to record and to replay, and so that the Tutor, not the code, understands the Student's words.

#### Acceptance Criteria

1. THE Exorcism_Engine SHALL be a pure function that receives a Session_State and one Event and returns either the new Session_State with the Tutor_Instructions of the next Step, or an error; it SHALL NOT use input or output, the clock or randomness.
2. THE Session_State SHALL contain only JSON-serialisable values.
3. THE Exorcism_Engine SHALL accept only these Events: `pick-ghost` (path and Ghost_Text), `explanation-done` (the text the Tutor wrote), `answer-rated` (a Rating and the question text the Tutor wrote), `dont-know` (the question text the Tutor wrote), `self-check-answered` ("yes", "half" or "no"), `retry-ghost` and `leave-ghost`.
4. THE Exorcism_Engine SHALL accept in each Step only these Events: in `choosing`, `pick-ghost`; in `explaining`, `explanation-done` and `leave-ghost`; in `asking`, `answer-rated`, `dont-know` and `leave-ghost`; in `simplifying`, `explanation-done` and `leave-ghost`; in `model-answer`, `explanation-done` and `leave-ghost`; in `self-check`, `self-check-answered`; in `failed`, `retry-ghost` and `pick-ghost`; in `house-clean`, no Event.
5. WHEN an Event is not accepted in the current Step, or its fields are missing or of the wrong type, THE Exorcism_Engine SHALL return the error `INVALID_EVENT` with an English message and SHALL return the Session_State unchanged.
6. FOR ALL Session_States and Events, an Event that is not accepted in the current Step SHALL return the error `INVALID_EVENT` and the Session_State SHALL be equal to the one before (invalid-event property).
7. FOR ALL Session_States and Events, calling the Exorcism_Engine twice with the same Session_State and the same Event SHALL give the same result (determinism property).
8. WHEN the Event `leave-ghost` arrives, THE Exorcism_Engine SHALL go to the Step `choosing`, keep the Ghost `haunted`, and discard the unfinished attempt but keep the question texts already asked.
9. THE Tutor_Instructions SHALL ask the Tutor to end every judgement with one last line that is exactly `VERDICT: right`, `VERDICT: half-right`, `VERDICT: wrong` or `VERDICT: dont-know`. THE Tutor_Instructions SHALL ask for exactly one Verdict per message and per question, and never for the Verdicts of several questions in one message. THE Verdict parser SHALL accept only that last line and SHALL return the error `INVALID_VERDICT` with an English message otherwise, including when the text has more than one line that starts with `VERDICT:`; it SHALL NOT search the text of the Student for phrases.
10. FOR ALL Verdicts and for all reason texts without a line that starts with `VERDICT:`, formatting the reason and the Verdict and parsing it back SHALL give the same Verdict (Verdict round-trip property).

### Requirement 11: Save a session and replay it with the same results

**User Story:** As the project director, I want a session saved as plain data that gives exactly the same states when replayed, so that the web demo can show a recorded walkthrough on `lukeed/sirv` without calling any AI.

#### Acceptance Criteria

1. THE Session_Recording SHALL contain the starting inputs (the Haunted_Report, the Exorcism_Progress and the Student_Profile) and the ordered list of Events, including the texts the Tutor wrote that the Events carry.
2. THE Session_Recording SHALL contain only JSON-serialisable values, and FOR ALL valid Session_Recordings, converting to JSON text and parsing it back SHALL produce an equal Session_Recording (round-trip property).
3. WHEN a Session_Recording is replayed, THE Exorcism_Engine SHALL give exactly the same sequence of Session_States and Tutor_Instructions each time, and the same sequence as the live session that was recorded (replay property).
4. IF an Event of a Session_Recording is not accepted in its Step, THEN THE replay SHALL return the error `INVALID_SESSION` with an English message that gives the position of the Event.
5. IF JSON text is not a valid Session_Recording, THEN THE parser SHALL return the error `INVALID_SESSION` with an English message.
6. THE Session_Recording SHALL NOT contain the text of the Student answers, only the Verdicts, except the optional field `sampleAnswer` (a string) that an `answer-rated` or `dont-know` Event of a Session_Recording MAY carry, only to be shown in the web demo.
7. THE Session_Recording format SHALL be the one used by the recorded walkthrough of the web demo. Making the recording on `lukeed/sirv` belongs to the web spec.
8. THE Power SHALL NOT fill `sampleAnswer`, and THE Exorcism_Engine SHALL ignore `sampleAnswer` when it replays a Session_Recording; IF `sampleAnswer` is present and is not a string, THEN THE parser SHALL return the error `INVALID_SESSION`.
9. FOR ALL Session_Recordings, adding, changing or removing every `sampleAnswer` SHALL NOT change the sequence of Session_States and Tutor_Instructions of the replay (sample-answer-ignored property).

## Edge Cases

- The Student gives an empty answer or an answer that tries nothing: the Tutor reports `dont-know`.
- The Student answers "I don't know" twice to the same question: Rating `wrong`, model answer, next question.
- The Student fails a Ghost (fewer than 2 good Ratings, or the Core_Question is `wrong`): it stays `haunted`; the Student can retry it or pick another Ghost.
- The Student gets 2 good Ratings but the Core_Question is `wrong`: the Ghost stays `haunted`.
- The Tutor puts the Verdicts of several questions in one message: `INVALID_VERDICT`.
- The Student leaves a Ghost halfway: it stays `haunted`; the unfinished attempt is discarded.
- The Student picks a Ghost that is `exorcised` or not in the Haunted_Report: `INVALID_EVENT`, nothing changes.
- The Ghost has 0 lines or only comments: File_Kind `general`, and the explanation says that the file has almost no code.
- The Tutor ends a judgement without the `VERDICT:` last line: `INVALID_VERDICT`; the caller may ask the Tutor again.
- The Student_Profile is missing: `knowsJava` is `false`.
- A Haunted_Report with `fewFiles` set to `true` (1 or 2 Ghosts): the exorcism works the same.
- A Haunted_Report with `partial` set to `true`: only the Ghosts in the report are used.
- The Haunted_Report changes (another repository or another `ref`) while an Exorcism_Progress exists: the progress of unknown paths is ignored (Requirement 7.6).
- The Student's answer is long or in another language: the Tutor judges the behaviour described, not the language.
- All Ghosts are `exorcised`: Step `house-clean`; no more questions.
- A Session_Recording with an Event in the wrong Step: `INVALID_SESSION` with the position.

## Out of Scope

- The exorcism certificate and any teacher feature (stays in `PLAN.md` under "Pendientes").
- One ghost per line of code.
- Questions about specific lines, line numbers or syntax details.
- Calling any AI API; the Tutor is always the student's own Kiro.
- Reading Ghost_Text from GitHub or from the disk. The caller does it (the Power reads the local disk; the web demo and tests use committed texts).
- Saving the Exorcism_Progress and the interface to read and write it (Power spec). The web demo saves no progress.
- The visual map of the house and the horror interface (web spec). The map counts files, one Ghost per file.
- Making the recorded walkthrough on `lukeed/sirv` and showing sample answers (web spec).
- What the caller does after `INVALID_VERDICT`, including how many times to ask the Tutor again (Power spec).
- Folders as rooms of the house (optional improvement, outside the minimum version).
- The packaging as a Kiro Power, the MCP server and any Kiro hook (Power spec).
- Private repositories and any authentication.
- Languages other than TypeScript, JavaScript, Java and Python.
- Servers, accounts, databases and grades.
- Updating `product.md` and `tech.md` (see Decisions).

## Decisions

These points were open and have been decided by the project director.

1. **Key files, not every AI-written file.** `product.md` and `tech.md` are updated in a separate docs branch before the design of this spec starts, so they match the approach of picking 3 to 5 key files.
2. **The map of the house** belongs to the web spec and counts files (one Ghost per file). This spec only defines the Haunted_Share.
3. **Progress storage.** The web demo saves no progress (it shows a recorded walkthrough). Where the Power saves the Exorcism_Progress is decided in the Power spec or in the design.
4. **Source of the Ghost_Text.** The Exorcism_Engine receives the Ghost_Text as input and never reads GitHub (Requirements 2.6 and 9.3). The Power reads the local disk.
5. **Language and Java.** The Tutor writes in English. Comparisons with Java are allowed only when the Student_Profile has `knowsJava` set to `true` (Requirement 2.8).
6. **Free choice of Ghost.** The easiest Ghost is suggested by default, but the Student may pick any Ghost that is `haunted` (Requirement 1).