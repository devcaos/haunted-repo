# Requirements Document

## Introduction

The Kiro Power is the real tool of Haunted Repo. It connects the existing exorcism engine (`packages/core/src/exorcism/`) to the user's own Kiro, so that the Tutor is that Kiro, guided step by step by the engine. The demo website only replays a recording; the Power runs a live exorcism on any public GitHub repository.

The Power lives in `packages/power/`, which today holds only a placeholder (`add` and its test). It follows the current Kiro format for Powers (kiro.dev/docs/powers and kiro.dev/docs/powers/create, read on 15 Nov 2026): a folder with a required `plugin.json` manifest, optional Agent Skills under `skills/` (one `SKILL.md` per skill) and an optional `mcp.json` that starts an MCP server. This project's MCP server is written in TypeScript with `@modelcontextprotocol/sdk` (`tech.md`).

The work is split between three actors:

1. The **Power_Server** (deterministic code) keeps the Session_State, calls the engine (`startSession`, `advance`, `parseVerdict`, `parseProgress`, ...) and reads GitHub through `@haunted-repo/core`.
2. The **Tutor** (the user's Kiro) follows the Tutor_Instructions: it explains, writes the questions, talks with the Student and judges each answer.
3. The **Student** (the user) answers in the Kiro chat.

This project never calls an AI API. The only network service the Power uses is the GitHub REST API, without a token.

The verdict is strict. The engine's `parseVerdict` accepts only an exact last line (`VERDICT: right`, `VERDICT: half-right`, `VERDICT: wrong` or `VERDICT: dont-know`) and returns `INVALID_VERDICT` otherwise (exorcism Requirement 10.9; `PLAN.md`, note h). The exorcism spec leaves to this spec what the caller does after `INVALID_VERDICT` (exorcism "Out of Scope"). This spec decides it: the Power asks the Tutor again, up to a fixed limit, and then fails with a clear message.

This spec does not change `packages/core`.

## Glossary

- **Power**: the folder `packages/power/` as Kiro installs it: `plugin.json`, the skills and `mcp.json`.
- **Power_Server**: the MCP server of the Power, started by Kiro through `mcp.json`. It exposes the Power_Tools.
- **Power_Tool**: one MCP tool of the Power_Server that the Tutor calls. The exact list, names and input shapes are decided in the design.
- **Tutor_Skill**: the Agent Skill (`skills/<name>/SKILL.md`) that tells the user's Kiro how to act as the Tutor and in which order to call the Power_Tools.
- **Tutor**: the user's own Kiro, acting under the Tutor_Skill and the Tutor_Instructions.
- **Student**: the user of the Power.
- **Workspace**: the folder that the Student has open in Kiro. Kiro does not tell the Power_Server which folder this is (Kiro does not declare the MCP `roots` capability, `docs/spike-power.md`), and the Power_Server does not try to find it.
- **Power_Data_Folder**: the folder whose path Kiro gives the Power_Server in the `PLUGIN_DATA` environment variable (in the spike, `C:\Users\<user>\.kiro\powers\data\power`). It is outside the Workspace. The Power keeps all its files there and nowhere else.
- **Repository_Data_File**: the one file in the Power_Data_Folder that holds the Haunted_Report and the Exorcism_Progress of one repository. There is one Repository_Data_File per repository, and its name includes the repository (Requirement 7.11). Its exact name and layout are decided in the design.
- **Engine**: the exorcism engine of `@haunted-repo/core` (`startSession`, `advance`, `buildInstructions`, `parseVerdict`, `parseEvent`, `parseProgress`, `formatProgress`, `hauntedShare`).
- **Detection**: `detectGhosts` of `@haunted-repo/core`, which builds a Haunted_Report from a public GitHub repository URL.
- **Haunted_Report**, **Ghost**, **Ghost_Text**, **Session_State**, **Step**, **Event**, **Tutor_Instructions**, **Verdict**, **Rating**, **Exorcism_Progress**, **Haunted_Share**, **Core_Question**: as defined in the glossary of `.kiro/specs/exorcism/requirements.md`.
- **Judgement**: the full text the Tutor writes to judge one Student answer: a short reason, then the Verdict line.
- **Invalid_Judgement_Count**: the number of consecutive judgement Power_Tool calls that `parseVerdict` rejected while the Step is `asking`. It is reset to 0 when a Verdict is accepted, after a Verdict_Failure, and after any accepted `advance`.
- **Verdict_Retry**: a request from the Power_Server to the Tutor to write the Judgement again, after `INVALID_VERDICT`, while Invalid_Judgement_Count is at most Max_Verdict_Retries.
- **Max_Verdict_Retries**: the largest number of Verdict_Retries in a row. Its value is 2, so the Tutor gets at most 3 consecutive rejected Judgements before a Verdict_Failure.
- **Verdict_Failure**: what happens when Invalid_Judgement_Count reaches Max_Verdict_Retries + 1.
- **GitHub_API**: the host `https://api.github.com`, the only one that `createGitHubClient` of `@haunted-repo/core` calls.

## Requirements

### Requirement 0: Tracer spike before the design

**User Story:** As the project director, I want a tiny Power installed and called in my real Kiro before the design is written, so that the design is based on how Kiro really runs a Power and not on guesses.

#### Acceptance Criteria

1. BEFORE `design.md` is written, a minimal Power SHALL be built in `packages/power/` with a `plugin.json`, one skill (`skills/<name>/SKILL.md`), an `mcp.json`, and an MCP server with one tool that returns its own working directory and the Workspace path it can see.
2. THE minimal Power SHALL be installed in Kiro IDE with "Import power from GitHub" from the `packages/power/` folder of this repository.
3. WHEN the minimal Power is installed, one call of its tool from the Kiro chat SHALL succeed.
4. THE result SHALL be written in `docs/spike-power.md`: the steps followed, whether the tool call succeeded, the working directory and the Workspace path the tool returned, and how Kiro started the server.
5. `design.md` SHALL NOT be written until the spike passes (criterion 3).
6. `design.md` SHALL use the result of the spike to answer Open Questions 2 (how the installed Power runs its server) and 5 (the Power_Data_Folder).
7. THE spike SHALL NOT replace the manual end-to-end check of Requirement 11.7, which stays as the final check.

### Requirement 1: Package the Power in the current Kiro format

**User Story:** As a student, I want to install Haunted Repo in my Kiro from a folder or from the GitHub repository, so that I can exorcise ghosts without installing anything else by hand.

#### Acceptance Criteria

1. THE Power SHALL be the folder `packages/power/` and SHALL contain a `plugin.json` with the fields `$schema` (`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`), `name` (kebab-case), `version` (semantic version), `description`, `author` (with at least `name`) and `keywords`, as described in kiro.dev/docs/powers/create.
2. THE `plugin.json` keywords SHALL include words a beginner would use for this task, at least `haunted`, `ghost`, `exorcise`, `exorcism` and `understand code`.
3. THE Power SHALL contain one `mcp.json` that declares the Power_Server as a `stdio` MCP server, and SHALL NOT declare any environment variable, key or token.
4. THE Power SHALL contain at least the Tutor_Skill under `skills/`, with a `SKILL.md` that has the front matter fields `name` and `description`.
5. WHEN the Student installs the Power with "Import power from a folder" (the `packages/power/` folder) or with "Import power from GitHub" (the URL of this repository), THE Power SHALL start the Power_Server with no further manual step except the ones the Tutor_Skill explains in plain English.
6. THE Power SHALL NOT include the compiled test files (`*.test.js`, `*.testutil.js`) in what the Power_Server runs (`PLAN.md`, note a).
7. THE Power_Server SHALL run on Node.js 24 on Windows, macOS and Linux.
8. THE Tutor_Skill SHALL contain this instruction: IF the Power_Tools are not available, THEN the Tutor SHALL tell the Student in English to check that Node.js 24 is installed and to restart Kiro, and SHALL NOT run an exorcism. This criterion is checked by the manual spike (Requirement 11.7), not by an automated test.

### Requirement 2: Find the ghosts of a public GitHub repository

**User Story:** As a student, I want to give the URL of my public repository and see its ghosts from easy to hard, so that I know where to start.

#### Acceptance Criteria

1. WHEN the Tutor calls the detection Power_Tool with a repository URL, THE Power_Server SHALL call Detection with that URL and return the Haunted_Report: for each Ghost its path, Floor, Difficulty_Score and reason, in the order of the report (easy to hard).
2. WHEN Detection succeeds, THE Power_Server SHALL save the Haunted_Report in the Repository_Data_File of that repository, inside the Power_Data_Folder (Requirement 7) and SHALL return the Haunted_Share and the suggested Ghost (exorcism Requirement 1.1).
3. IF Detection returns an error (`INVALID_URL`, `REPO_NOT_FOUND`, `RATE_LIMITED`, `NETWORK_ERROR`, `EMPTY_REPO` or `NO_SUPPORTED_FILES`), THEN THE Power_Server SHALL return the error code and an English message that says what happened and what the Student can do, and SHALL NOT change any saved file.
4. IF the repository is private or does not exist (GitHub answers `REPO_NOT_FOUND`), THEN THE message SHALL say that Haunted Repo only works with public repositories and that the URL may be wrong, and SHALL NOT ask the Student for a token or password.
5. IF Detection returns a Haunted_Report with `partial` set to `true` (rate limit reached halfway), THEN THE Power_Server SHALL return the report with an English warning that the list is incomplete.
6. IF Detection returns a Haunted_Report with `fewFiles` set to `true`, THEN THE Power_Server SHALL return the `message` of the report together with the Ghosts.
7. WHEN a Repository_Data_File already exists for the same repository, THE Power_Server SHALL replace its Haunted_Report and Exorcism_Progress only if the detection Power_Tool call carries an explicit confirmation input (for example `replace: true`); without that input, THE Power_Server SHALL refuse with an English message and SHALL NOT change any file. Detecting the ghosts of one repository SHALL NOT change the Repository_Data_File of any other repository. THE Tutor_Skill SHALL tell the Tutor to ask the Student before sending that input.

### Requirement 3: Get the Ghost_Text for the exorcism

**User Story:** As a student, I want the tutor to explain the real file of my repository, so that what I learn matches my code.

#### Acceptance Criteria

1. WHEN the Student picks a Ghost, THE Power_Server SHALL read the Ghost_Text from GitHub with the owner, repository and `ref` of the saved Haunted_Report, through `@haunted-repo/core`, and SHALL send the Event `pick-ghost` with that path and text to the Engine.
2. IF reading the Ghost_Text throws any error (including a 404, which the core client reports as `NETWORK_ERROR`, the internal `NOT_TEXT` code, or the plain `Error` of the 8-request budget), THEN THE Power_Server SHALL return an English message (the core message when there is one), SHALL NOT crash, SHALL NOT send `pick-ghost`, and SHALL keep the Session_State unchanged. THE Power_Server SHALL use a new GitHub client for each read.
3. THE Power_Server SHALL give the Engine the Ghost_Text unchanged.
4. THE `ref` of the Haunted_Report is the branch name, so the Ghost_Text is the current version of the file on that branch, which may differ from the one Detection scored. This is accepted.

### Requirement 4: Let the user's Kiro be the Tutor, guided by the Engine

**User Story:** As a student, I want my own Kiro to explain and ask the questions, following the rules of Haunted Repo, so that I get the approved exorcism without paying for any AI service.

#### Acceptance Criteria

1. THE Power_Server SHALL create the Session_State with `startSession` from the saved Haunted_Report, the saved Exorcism_Progress (if any) and the Student_Profile, and SHALL change it only with `advance`.
2. WHEN the Engine returns Tutor_Instructions, THE Power_Server SHALL give the Tutor their `text` unchanged, together with the current Step and the Events the Tutor may send next (`ALLOWED_EVENTS`).
3. THE Tutor_Skill SHALL tell the Tutor to follow the Tutor_Instructions exactly, to write to the Student only in English, to show one question per message, and to wait for the Student's answer before judging it.
4. THE Tutor_Skill SHALL tell the Tutor to call a Power_Tool after each explanation, Simpler_Explanation and model answer, with the text it wrote, so that the Power_Server sends `explanation-done`.
5. WHEN the Tutor sends an Event, THE Power_Server SHALL check it with `parseEvent` and `advance`; IF the Engine returns `INVALID_EVENT`, THEN THE Power_Server SHALL return the English message of the Engine and the Events allowed in the current Step, and SHALL keep the Session_State unchanged.
6. WHEN the Step is `asking` and a question is repeated after a Simpler_Explanation, THE Power_Server SHALL send the Engine the same question text as the `pendingQuestion` of the Session_State (`PLAN.md`, Low "al repetir una pregunta").
7. THE Power_Server SHALL NOT receive, store or send the text of the Student's answers; it receives only the Judgement written by the Tutor and the question text.
8. THE Tutor_Skill SHALL tell the Tutor to ask the Student whether they know Java before the first session starts, and THE Power_Server SHALL treat a missing answer as `knowsJava` set to `false` (exorcism Requirement 2.9).
9. THE Power_Server and the Power SHALL NOT call any AI API, and SHALL NOT need any key, token or paid account.
10. WHEN the Step is `self-check`, THE Tutor_Skill SHALL tell the Tutor to ask the Student "yes", "half" or "no" and send `self-check-answered` with that answer.
11. WHEN the Step is `failed`, THE Power_Server SHALL return the two options of the Engine (try the same Ghost again or pick another one), and THE Tutor_Skill SHALL tell the Tutor to let the Student choose.
12. WHEN the Step becomes `house-clean`, THE Power_Server SHALL return the Engine's message and a Haunted_Share of 0.

### Requirement 5: Accept only a strict verdict and ask for it again

**User Story:** As a student, I want my answers to be counted only from a clear verdict, so that the tool never guesses whether I was right.

#### Acceptance Criteria

1. WHEN the Tutor sends a Judgement, THE Power_Server SHALL pass the Judgement text to `parseVerdict` of the Engine unchanged: it SHALL NOT trim it, remove formatting, change letter case, or look for a Verdict anywhere else in the text.
2. THE Power_Server SHALL NOT decide a Verdict by any other means than `parseVerdict` (no keyword search, no default Verdict, no "closest match").
3. WHEN `parseVerdict` returns `right`, `half-right` or `wrong`, THE Power_Server SHALL send the Event `answer-rated` with that Rating and the question text; WHEN it returns `dont-know`, THE Power_Server SHALL send the Event `dont-know` with the question text.
4. IF `parseVerdict` returns `INVALID_VERDICT`, THEN THE Power_Server SHALL add 1 to Invalid_Judgement_Count; IF the new Invalid_Judgement_Count is at most Max_Verdict_Retries, THEN THE Power_Server SHALL keep the Session_State unchanged, SHALL NOT send any Event, and SHALL return a Verdict_Retry: an English request to write the Judgement again, which contains the message of `parseVerdict`, the four allowed last lines, and the number of tries left (Max_Verdict_Retries + 1 minus Invalid_Judgement_Count).
5. THE Verdict_Retry SHALL ask the Tutor to write the Judgement again and SHALL NOT ask the Student for a new answer.
6. IF `parseVerdict` returns `INVALID_VERDICT` and the new Invalid_Judgement_Count reaches Max_Verdict_Retries + 1, THEN THE Power_Server SHALL stop asking (Verdict_Failure), keep the Session_State unchanged, record no Rating, reset Invalid_Judgement_Count to 0, and return an English message for the Student that says the Tutor could not give a valid verdict, that the Step is still `asking`, and that the Student can continue with the same question or leave the Ghost.
7. THE Power_Server SHALL reset Invalid_Judgement_Count to 0 WHEN a Verdict is accepted, after a Verdict_Failure, and after any `advance` that the Engine accepts.
8. FOR ALL Judgement texts, THE Power_Server SHALL send an Event if and only if `parseVerdict` accepts the text, and the Rating of that Event SHALL be the Verdict that `parseVerdict` returned (strict-verdict property).
9. FOR ALL sequences of judgement Power_Tool calls, Invalid_Judgement_Count SHALL never be greater than Max_Verdict_Retries + 1, THE Power_Server SHALL return at most Max_Verdict_Retries Verdict_Retries in a row before a Verdict_Failure or an accepted Verdict, and the Session_State SHALL be equal to the one before after every rejected Judgement (bounded-retry property).
10. A Judgement that is empty, has only spaces, has the Verdict in bold (`**VERDICT: right**`), has a space before `VERDICT:`, ends with a full stop, or has more than one `VERDICT:` line SHALL count as `INVALID_VERDICT`, because `parseVerdict` rejects it. Trailing spaces after the Verdict line are accepted (`parseVerdict` uses `trimEnd`). A `VERDICT:` line that does not start at column 0 does not count as a second Verdict line.
11. WHEN the Tutor sends a Judgement and the Step is not `asking`, THE Power_Server SHALL return `INVALID_EVENT` with the allowed Events before calling `parseVerdict`, and SHALL NOT change Invalid_Judgement_Count.

### Requirement 6: Handle "I don't know"

**User Story:** As a beginner, I want "I don't know" to give me an easier explanation and a second chance, so that I do not give up.

#### Acceptance Criteria

1. THE Tutor_Skill SHALL tell the Tutor that an answer meaning "I don't know" in any language, an empty answer, or an answer that does not try to answer gets the Verdict `dont-know` (exorcism Requirement 5.1).
2. THE Power_Server SHALL NOT search the Student's words for "I don't know" or any other phrase; only the Verdict decides (exorcism Requirement 5.2).
3. WHEN the first `dont-know` for a question is accepted, THE Power_Server SHALL return the Engine's Tutor_Instructions for a Simpler_Explanation, and then the same question again (exorcism Requirements 5.3 to 5.5).
4. WHEN the second `dont-know` for the same question is accepted, THE Power_Server SHALL return the Engine's Tutor_Instructions for a short model answer, and then the next question or the final decision (exorcism Requirement 5.6).

### Requirement 7: Keep the data only on the user's own computer

**User Story:** As a student, I want my report and my progress saved only on my own computer, in the folder that Kiro gives the Power, so that nothing about me or my code goes anywhere else.

#### Acceptance Criteria

1. THE Power_Server SHALL save the Haunted_Report and the Exorcism_Progress of each repository as JSON in the Repository_Data_File of that repository, inside the Power_Data_Folder (one file per repository), and SHALL NOT write any file outside the Power_Data_Folder. THE Power_Server SHALL NOT try to find the Workspace and SHALL NOT need the MCP `roots` capability.
2. THE Power_Server SHALL write the Haunted_Report with `JSON.stringify` and the Exorcism_Progress with `formatProgress`, and SHALL read them back with `parseReport` and `parseProgress`. How both values sit in one Repository_Data_File is decided in the design.
3. WHEN a Ghost becomes `exorcised` or stays `haunted` after a full attempt, or the Student answers the self-check, THE Power_Server SHALL save the Exorcism_Progress before it returns the next Tutor_Instructions.
4. THE Power_Server SHALL NOT save the text of the Student's answers, the Ghost_Text or the texts the Tutor wrote.
5. IF a Repository_Data_File does not hold a valid Haunted_Report (`INVALID_REPORT`) or a valid Exorcism_Progress (`INVALID_PROGRESS`), THEN THE Power_Server SHALL return the error code and an English message that names the file, and SHALL overwrite or delete that file only if the Power_Tool call carries an explicit confirmation input (for example `replace: true`); without that input, THE Power_Server SHALL refuse and SHALL NOT change any file. THE Tutor_Skill SHALL tell the Tutor to ask the Student before sending that input.
6. IF the Power_Data_Folder or one of its files cannot be written (for example, no permission or a read-only folder), THEN THE Power_Server SHALL return an English message that says the progress was not saved, and SHALL keep the Session_State in memory.
7. THE Power_Server SHALL NOT send the Haunted_Report, the Exorcism_Progress or any usage data to any server, and SHALL NOT collect telemetry.
8. FOR ALL valid Exorcism_Progress values, saving them in a Repository_Data_File and reading them back SHALL give an equal value (save round-trip property).
9. THE Power_Server SHALL keep the Session_State of an unfinished attempt only in memory; an unfinished attempt SHALL NOT be resumed after the Power_Server stops (exorcism Requirement 10.8: the Ghost stays `haunted`).
10. IF the `PLUGIN_DATA` environment variable is missing, or the folder it names cannot be written, THEN THE Power_Server SHALL keep everything in memory and tell the Student in English that progress will not be saved.
11. THE Power_Data_Folder may be shared with another Power: Kiro names it after the last part of the import URL (`power` in the spike), not after the `name` in `plugin.json`, so another Power imported from a URL that ends in the same folder name may get the same folder. THEREFORE THE Power_Server SHALL use for each Repository_Data_File a name that includes the repository (owner and name) and marks it as a Haunted Repo file, and SHALL NOT read, change or delete any file in the Power_Data_Folder that does not have that kind of name. THE design SHALL check this naming against how Kiro really names the folder.

### Requirement 8: Use no network except GitHub

**User Story:** As a student, I want the Power to talk only to GitHub, so that I know where my data goes.

#### Acceptance Criteria

1. THE Power_Server SHALL make network requests only to the GitHub_API, and only through `@haunted-repo/core` (Detection and the GitHub client).
2. THE Power_Server SHALL NOT send any Authorization header or token to GitHub.
3. THE Power_Server SHALL send to GitHub only the repository owner, name, `ref` and file paths needed to read the repository; it SHALL NOT send the Exorcism_Progress, Judgements or anything the Student wrote.
4. FOR ALL runs of the Power_Server in the automated tests, every requested URL SHALL start with `https://api.github.com/` (network-allowlist property).

### Requirement 9: Behave clearly when the user's Kiro is unavailable or stops

**User Story:** As a student, I want to lose as little as possible if Kiro stops or fails in the middle, so that I can continue later.

#### Acceptance Criteria

1. IF the Tutor stops answering, the Kiro session ends or the Power_Server stops during an attempt, THEN THE Ghost SHALL stay `haunted`, and THE Repository_Data_Files saved in the Power_Data_Folder before that moment SHALL stay valid and unchanged.
2. WHEN the Power_Server starts and finds a saved Haunted_Report and Exorcism_Progress, THE Power_Server SHALL start a new session from them with `startSession`, so that `exorcised` Ghosts stay `exorcised`. THE Power_Server SHALL NOT save `knowsJava`; after a restart, THE Tutor_Skill SHALL tell the Tutor to ask the Student again whether they know Java (Requirement 4.8).
3. IF the Tutor calls a Power_Tool that needs a session and no session exists (for example, after a restart), THEN THE Power_Server SHALL return an English message that says how to start or continue, and SHALL NOT change any saved file.
4. IF the Tutor sends a Judgement or an Event when the Step does not expect it, THEN THE Power_Server SHALL follow Requirement 4.5 and SHALL NOT change Invalid_Judgement_Count.

### Requirement 10: Show how haunted the house is

**User Story:** As a student, I want to see how many ghosts are left, so that I see the house getting clean.

#### Acceptance Criteria

1. WHEN the Tutor asks for the status, THE Power_Server SHALL return, for each Ghost of the saved Haunted_Report, its path, Floor and state (`haunted` or `exorcised`), and the Haunted_Share as a number from 0 to 1 and as English text (for example, "3 of 5 ghosts still haunt this house").
2. THE Power_Server SHALL calculate the Haunted_Share only with `hauntedShare` of the Engine.

### Requirement 11: Tests, platform and limits of the change

**User Story:** As the project director, I want the Power tested as far as a test can go and built without touching the core, so that the engine already reviewed stays the same.

#### Acceptance Criteria

1. THIS spec SHALL NOT change any file under `packages/core/`. IF the design needs a change in `packages/core`, THEN the change SHALL be proposed to the project director first and handled in its own spec or approved change.
2. THE `packages/power/package.json` SHALL depend on `"@haunted-repo/core": "0.0.0"` and on `@modelcontextprotocol/sdk` with an exact version, and `package-lock.json` SHALL be updated (`PLAN.md`, "Para retomar").
3. THE placeholder `add` and its test SHALL be removed from `packages/power/src/` when the real code arrives.
4. THE project SHALL include property-based tests (fast-check) for: strict verdict (5.8), bounded retry (5.9), save round-trip (7.8) and network allowlist (8.4).
5. THE unit tests SHALL use a fake GitHub that is not more permissive than the real one (like the strict fake in `packages/core/src/ghost-detection/fakeGitHub.testutil.ts`; how the Power reuses it without a fragile relative import is decided in the design, see the Medium of PR #20 in `PLAN.md`) and a temporary folder for the Power_Data_Folder, and SHALL NOT call the network.
6. THE live test suite (`npm run test:live`) SHALL include at least one test where the Power_Server reads a real Ghost_Text of `lukeed/sirv` from the real GitHub_API.
7. THE use of the user's Kiro as the Tutor SHALL be checked by a manual spike in Kiro IDE: install the Power, exorcise one Ghost of `lukeed/sirv`, answer "I don't know" once, and see at least one Verdict_Retry. The result SHALL be written in `docs/`.
8. THE commands `npm run check` and `npm test` SHALL pass on Windows (PowerShell) and SHALL NOT call the network.

## Edge Cases

- **Invalid verdict:** the Judgement ends without an exact `VERDICT:` line (bold, extra space, full stop, wrong word, empty text). The Power_Server sends no Event, keeps the Session_State and asks the Tutor for the Judgement again (Requirement 5.4).
- **Repeated invalid verdict:** 3 consecutive judgement calls are rejected (Invalid_Judgement_Count reaches 1 + Max_Verdict_Retries). The Power_Server stops asking, records no Rating, resets the count, and tells the Student the Step is still `asking` and they can continue with the same question or leave the Ghost (Requirement 5.6).
- **Several Verdicts in one message:** `INVALID_VERDICT`, same path as an invalid verdict.
- **The Student answers "I don't know":** the Tutor gives `dont-know`; first time a Simpler_Explanation and the same question again, second time a model answer and the next question (Requirement 6).
- **The Student writes "I don't know" inside a longer real answer:** only the Tutor's Verdict counts; the Power_Server never reads the Student's words (Requirement 6.2).
- **Kiro unavailable or stopped halfway:** the unfinished attempt is lost and the Ghost stays `haunted`; finished Ghosts stay saved (Requirement 9).
- **The Power_Tools are not available** (for example, Node.js is missing or the server did not start): the Tutor_Skill tells the Tutor to ask the Student to check Node.js 24 and restart Kiro, and no exorcism runs (Requirement 1.8, checked by the manual spike).
- **A tool call with no session** (after a restart): an English message on how to continue (Requirement 9.3).
- **Repository unreachable:** network error or GitHub down: `NETWORK_ERROR` with an English message; nothing saved (Requirement 2.3).
- **Repository private or not found:** `REPO_NOT_FOUND` with a message that only public repositories work; no token is asked for (Requirement 2.4).
- **Rate limit (60 requests per hour without a token):** `RATE_LIMITED`, or a `partial` report with a warning (Requirements 2.3 and 2.5).
- **A Ghost file removed or renamed after detection:** the Ghost_Text cannot be read; English message; the Ghost stays `haunted` (Requirement 3.2).
- **The saved files are broken or edited by hand:** `INVALID_REPORT` or `INVALID_PROGRESS`; nothing is overwritten without an explicit `replace: true` input (Requirement 7.5).
- **The Workspace is read-only:** progress is not saved; the Student is told; the session continues in memory (Requirement 7.6).
- **The Workspace folder cannot be found:** everything stays in memory; the Student is told in English that progress will not be saved (Requirement 7.10).
- **Another Power shares the Power_Data_Folder** (it was imported from a URL that ends in the same folder name): the Power_Server touches only its own Repository_Data_Files and leaves every other file alone (Requirement 7.11).
- **Detecting a repository that already has a Repository_Data_File:** the Tutor asks the Student, and the saved report and progress of that repository are replaced only with an explicit `replace: true` input; the files of other repositories do not change (Requirement 2.7).
- **The Tutor sends an Event that the Step does not allow:** `INVALID_EVENT`, state unchanged, Invalid_Judgement_Count unchanged (Requirements 4.5 and 9.4).
- **The repeated question after a Simpler_Explanation has a different text:** the Power_Server sends the `pendingQuestion` text (Requirement 4.6).
- **All Ghosts are `exorcised`:** Step `house-clean` and Haunted_Share 0 (Requirement 4.12).

## Out of Scope

- Any change to `packages/core` (Requirement 11.1).
- Calling any AI API, or any network host other than the GitHub_API.
- Private repositories, GitHub tokens and any login.
- Resuming an unfinished attempt after a restart (only whole Ghosts are saved).
- Saving the Student's answers, the Ghost_Text or the Tutor's texts.
- Reading the Ghost_Text from the local disk or from a local clone (decided in Open Questions, item 1).
- Publishing the Power in the Kiro powers registry (kiro.dev/powers).
- The exorcism certificate and any teacher feature (`PLAN.md`, "Pendientes").
- One ghost per line, folders as rooms, a visual map inside Kiro (the Power shows the status as text).
- IDEs and agent clients other than Kiro, even if the Agent Plugins format may work there.
- What happens to an `exorcised` Ghost when its code changes (open product question in `product.md`).
- Kiro hooks. The Power does not install any hook.
- The visual design of the demo website (its own spec, after this one).

## Cut line

If the work runs late, this is what stays and what goes first.

- **Must have for the video:** Requirements 1, 2.1 to 2.5, 3, 4, 5, 6, 7.1 to 7.4, 8 and 11. Requirement 0 is the gate before the design, so it is always done first.
- **Cut first if late:** 2.7, 7.5, 9.2 and 10.

## Open Questions

These points need a decision by the project director or the reviewer before the design.

1. **Source of the Ghost_Text. Decided (15 Nov 2026, Luis Miguel): GitHub.** The Ghost_Text comes from GitHub, as Detection does, not from the local disk (Requirement 3), through `getFileText` of the existing GitHub client. This replaces the note "the Power reads the local disk" of the exorcism spec (Decision 4 and "Out of Scope").
2. **How the installed Power runs its server.** `dist/` is ignored by git, so a Power imported from GitHub would have no compiled server. Options for the design: commit one bundled server file, publish an npm package and start it with `npx`, or ask the Student to run `npm ci` and `npm run build`. Requirement 1.5 asks for no manual step beyond what the Tutor_Skill explains.
3. **`tech.md` is out of date.** It says "`POWER.md` + steering files + MCP server"; the current Kiro docs say `plugin.json` + `skills/` + `mcp.json`. `tech.md` should be fixed in a separate docs change.
4. **The value of Max_Verdict_Retries.** These requirements fix it at 2 (3 Judgements in total for one answer).
5. **The Power_Data_Folder.** Its name, and whether the Power should suggest adding it to `.gitignore` of the Student's project, are left to the design.
6. **"Kiro unavailable".** These requirements read it as "the Kiro session, the Tutor or the Power_Server stops". If it also means "the Kiro model returns an error", the Power cannot see that, because the Power_Server only receives tool calls.
