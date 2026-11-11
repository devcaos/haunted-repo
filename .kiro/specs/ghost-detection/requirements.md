# Requirements Document

## Introduction

Ghost detection is the first real feature of Haunted Repo. The user gives the URL of a public GitHub repository. The system downloads a limited part of it, picks a few key source files (the "ghosts"), measures how hard each one is to read, and returns them ordered from easy to hard, like floors in a haunted house: easy files in the attic, hard files in the basement.

Everything is done by plain, deterministic code. There is no AI call, no server, no database, no token and no secret. The only network service used is the public GitHub API, without authentication.

This spec follows the approach approved on 11 Nov 2026: Haunted Repo does not explain every file. It picks a few key files and gives an overview. This replaces the older idea in `product.md` and `tech.md` that a hook marks every file written by the agent. Those two steering files will need a later update (not part of this spec).

Deadline: finished and tested by 20 Nov 2026.

## Glossary

- **Ghost_Detector**: the code that takes a repository URL and returns a Haunted_Report.
- **Repo_URL**: text typed by the user that points to a public GitHub repository.
- **Repo_Reference**: the parsed form of a Repo_URL: owner and repository name.
- **Ref**: the name of the default branch used, or the commit SHA when the caller passes the test-only `ref` option. It is never read from the Repo_URL.
- **GitHub_Client**: the part of Ghost_Detector that talks to the public GitHub API without authentication.
- **Eligible_File**: a file that can be a ghost (see Requirement 3).
- **Supported_Language**: one of TypeScript, JavaScript, Java or Python.
- **Key_Score**: a number that says how likely an Eligible_File is to be a key file of the project.
- **Ghost**: one of the key files picked by Ghost_Detector (between 3 and 5).
- **Difficulty_Score**: an integer from 0 to 100 that says how hard a Ghost is to read. 0 is the easiest.
- **Factors**: the measured values used for the Difficulty_Score: lines of code, branching keywords, maximum indentation depth and number of imports.
- **Branching_Keyword**: one of `if`, `else if`, `elif`, `for`, `while`, `switch`, `case`, `catch` counted as whole words in code.
- **Floor**: a label for a Ghost: `attic` (Difficulty_Score 0 to 33), `middle floor` (34 to 66) or `basement` (67 to 100).
- **Haunted_Report**: the JSON-serialisable result: overview plus the ordered list of Ghosts.
- **Limits**: the fixed numbers in Requirement 2.

## Requirements

### Requirement 1: Accept a public GitHub repository URL

**User Story:** As a student, I want to paste the link of my GitHub repository, so that Haunted Repo can look at my project without any setup.

#### Acceptance Criteria

1. WHEN a Repo_URL has the form `github.com/owner/repo`, with an optional `https://` or `http://` prefix, an optional `www.`, an optional trailing `/` or `.git`, and optional extra path parts after the repository name (for example `/tree/main/src`), THE Ghost_Detector SHALL produce a Repo_Reference with the owner and the repository name, and SHALL ignore the extra path parts.
2. IF a Repo_URL is empty, is not a GitHub URL, or lacks an owner or a repository name, THEN THE Ghost_Detector SHALL return the error `INVALID_URL` with an English message that shows an example of a valid URL.
3. WHEN the GitHub API answers that the repository does not exist or is not public, THE Ghost_Detector SHALL return the error `REPO_NOT_FOUND` with an English message saying that only public repositories are supported.
4. WHEN the GitHub API answers that the rate limit is exceeded, THE Ghost_Detector SHALL return the error `RATE_LIMITED` with an English message that says when the limit resets, using the reset time given by GitHub.
5. THE Ghost_Detector SHALL work without any token, key or environment variable.
6. THE Ghost_Detector SHALL format a Repo_Reference as the URL `https://github.com/owner/repo`.
7. FOR ALL valid Repo_References, formatting to a URL and parsing back SHALL give an equal Repo_Reference (round-trip property).

### Requirement 2: Read the repository and download files within limits

**User Story:** As a student, I want the analysis to finish with a clear result even for big repositories, so that I am never left waiting or confused, and the demo stays inside GitHub's free limits.

#### Acceptance Criteria

1. WHEN the optional `ref` option of `detectGhosts` is not given, THE GitHub_Client SHALL use the default branch reported by GitHub.
2. WHEN the optional `ref` option of `detectGhosts` is given, THE GitHub_Client SHALL read that commit SHA instead of the default branch.
3. THE GitHub_Client SHALL read the file list of the repository with one recursive tree request.
4. WHEN GitHub reports that the tree is truncated, or the tree has more than 5,000 entries, THE Ghost_Detector SHALL keep working with the first 5,000 entries and set `truncated` to `true` in the overview.
5. IF a network failure or a timeout of 10 seconds happens on any request, THEN THE Ghost_Detector SHALL return the error `NETWORK_ERROR` with an English message that suggests trying again.
6. IF the repository is empty or has no default branch, THEN THE Ghost_Detector SHALL return the error `EMPTY_REPO` with an English message.
7. THE Ghost_Detector SHALL use at most 8 GitHub API requests for one analysis: 1 for the repository, 1 for the tree and up to 6 for file contents (5 picks plus at most 1 replacement for a skipped file).
8. WHEN the size reported by GitHub for a picked file is greater than 100 KB (102,400 bytes), THE Ghost_Detector SHALL skip the file and pick the next Eligible_File with the highest Key_Score instead, as long as the request limit of criterion 7 is respected.
9. WHEN a skipped file exists, THE Ghost_Detector SHALL list its path and the reason `TOO_LARGE` in `skipped` in the overview.
10. IF the content of a picked file is not valid UTF-8, THEN THE Ghost_Detector SHALL skip the file, list it in `skipped` with the reason `NOT_TEXT`, and continue with the other files.
11. IF the rate limit is reached while downloading file contents after at least one file was read, THEN THE Ghost_Detector SHALL return the Haunted_Report built from the files already read and set `partial` to `true` in the overview.
12. IF Eligible_Files exist but every one of them is skipped (all `TOO_LARGE` or `NOT_TEXT`), THEN THE Ghost_Detector SHALL return the error `NO_SUPPORTED_FILES` with an English message that mentions the skipped files.

### Requirement 3: Decide which files are eligible

**User Story:** As a student, I want Haunted Repo to look only at real source code, so that the ghosts are files worth understanding.

#### Acceptance Criteria

1. THE Ghost_Detector SHALL treat a file as an Eligible_File only WHEN its extension is `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.java` or `.py`.
2. THE Ghost_Detector SHALL exclude every file whose path contains one of the folders `node_modules`, `dist`, `build`, `out`, `vendor`, `target`, `coverage`, `.git`, `__pycache__` or `.next`.
3. THE Ghost_Detector SHALL exclude declaration files (`.d.ts`), minified files (name ends with `.min.js`), lock files, files whose name contains `.generated.` or `.gen.`, and config-only files (name matches `*.config.*`, `.eslintrc.*` or `setup.py`).
4. THE Ghost_Detector SHALL exclude test files (name contains `.test.` or `.spec.`, name starts with `test_`, name ends with `Test.java`, or the path contains a `test`, `tests`, `__tests__` or `spec` folder).
5. IF no Eligible_File exists, including when the only files in a Supported_Language are test files, THEN THE Ghost_Detector SHALL return the error `NO_SUPPORTED_FILES` with an English message that lists the four Supported_Languages and says that test files alone are not analysed.
6. THE Ghost_Detector SHALL produce the same set of Eligible_Files for the same list of paths, whatever the order of the list.

### Requirement 4: Pick the key files

**User Story:** As a student, I want only the few most important files, so that I know where to start instead of facing the whole project.

#### Acceptance Criteria

1. THE Ghost_Detector SHALL compute the Key_Score of each Eligible_File from the path and the file size reported by the tree, without reading imports and without downloading the file.
2. THE Ghost_Detector SHALL add 40 points to the Key_Score WHEN the file name without extension is `main`, `index`, `app`, `server`, `program` or `__main__`.
3. THE Ghost_Detector SHALL add 30 points WHEN the file is in the repository root, 20 points WHEN its parent folder is `src`, `app` or `lib` at the repository root, and 10 points WHEN its path has exactly one more folder level than those, and 0 points otherwise.
4. THE Ghost_Detector SHALL add between 0 and 30 points for size, growing in a straight line from 0 points at 200 bytes to 30 points at 20,000 bytes, and staying at 30 points above that.
5. THE Ghost_Detector SHALL pick the 5 Eligible_Files with the highest Key_Score, breaking ties by path in ascending alphabetical order.
6. WHEN the repository has fewer than 5 Eligible_Files, THE Ghost_Detector SHALL pick all of them.
7. WHEN the Ghost_Detector picks 1 or 2 files, THE Ghost_Detector SHALL return a Haunted_Report with `fewFiles` set to `true` and an English message that says the repository is a small project.
8. WHEN the repository is a monorepo, THE Ghost_Detector SHALL apply the same rules to the whole tree, so that the location points of Requirement 4.3 are counted from the repository root only.
9. FOR ALL lists of paths and sizes, running the pick twice on the same input SHALL return the same Ghosts in the same order (determinism property).

### Requirement 5: Calculate the Difficulty_Score

**User Story:** As a student, I want to see why a file is easy or hard, so that I trust the order and a teacher can check it.

#### Acceptance Criteria

1. THE Ghost_Detector SHALL measure for each Ghost the Factors: `lines` (non-empty lines), `branches` (number of Branching_Keywords), `maxIndent` (deepest indentation level, counting 4 spaces or 1 tab as one level) and `imports` (lines starting with `import`, `from ... import`, or containing `require(`).
2. THE Ghost_Detector SHALL ignore lines that contain only a comment (starting with `//`, `#`, `/*` or `*`) when measuring `lines` and `branches`.
3. THE Ghost_Detector SHALL calculate the Difficulty_Score as a weighted sum of the four Factors, each Factor capped at a fixed maximum so that no Factor passes its weight: `lines` 40 points (cap 400 lines), `branches` 30 points (cap 60), `maxIndent` 20 points (cap 8 levels) and `imports` 10 points (cap 20), rounded to the nearest integer.
4. THE Ghost_Detector SHALL return for each Ghost the four Factor values and a `reason` of one English sentence that names the Factor with the highest share of the score.
5. THE Ghost_Detector SHALL measure a line of more than 500 characters as a single line, and SHALL measure files with Windows (`\r\n`) or Unix (`\n`) line endings with the same result.
6. FOR ALL file contents, the Difficulty_Score SHALL be an integer from 0 to 100 (range property).
7. FOR ALL file contents, measuring the same content twice SHALL give the same Difficulty_Score (determinism property).
8. FOR ALL file contents, adding one line that contains a Branching_Keyword SHALL NOT lower the Difficulty_Score (monotonic property).
9. FOR ALL file contents, replacing `\n` by `\r\n` SHALL NOT change the Factors or the Difficulty_Score (invariant property).

### Requirement 6: Order the ghosts, describe the house and return a plain result

**User Story:** As a student, I want the ghosts ordered from easy to hard with floor names, and as a developer of later features, I want a plain data result that can be saved and read back, so that the exorcism feature can use it.

#### Acceptance Criteria

1. THE Ghost_Detector SHALL order the Ghosts by Difficulty_Score ascending, breaking ties by path in ascending alphabetical order.
2. THE Ghost_Detector SHALL give each Ghost the Floor that matches its Difficulty_Score.
3. THE Ghost_Detector SHALL include in the overview the repository owner and name, the ref used, the number of Eligible_Files found (`analysed`), the number of Ghosts picked (`picked`), and the flags `truncated`, `fewFiles` and `partial`.
4. THE Ghost_Detector SHALL show the picked Ghosts in this order in each Haunted_Report, with the fields `path`, `language`, `difficultyScore`, `floor`, `factors` and `reason`.
5. FOR ALL lists of Ghosts, the order SHALL be the same whatever the order in which the files were downloaded (confluence property).
6. THE Ghost_Detector SHALL return either a Haunted_Report or an error object with `code` and `message`, and SHALL NOT throw for the errors defined in this spec.
7. THE Haunted_Report SHALL contain only JSON-serialisable values (strings, numbers, booleans, arrays and plain objects).
8. FOR ALL valid Haunted_Reports, converting to JSON text and parsing it back SHALL produce an equal Haunted_Report (round-trip property).
9. IF JSON text is not a valid Haunted_Report, THEN THE Haunted_Report parser SHALL return the error `INVALID_REPORT` with an English message.
10. THE Haunted_Report SHALL NOT contain any state about whether a ghost was exorcised.

### Requirement 7: Tests, platform and location

**User Story:** As the project director, I want the feature tested against the real GitHub, run on my own computer and usable in the demo website, so that the demo does not break by surprise.

#### Acceptance Criteria

1. THE project SHALL include at least one automated live test, in a file named `*.live.test.ts`, that calls the real public GitHub API on the repository `lukeed/sirv` and checks that a valid Haunted_Report comes back.
2. THE live test SHALL pin the analysed commit by passing the test-only `ref` option of `detectGhosts` with the commit SHA `1135207e92c40354543cbd15c763c7a61d79d432`, an option that is not reachable from any Repo_URL.
3. THE live test SHALL run only through the command `npm run test:live`, and THE commands `npm test` and `npm run check` SHALL NOT run it.
4. IF GitHub rate-limits the live test, THEN THE live test SHALL fail with an English message that says to wait and retry.
5. WHEN a mock of the GitHub API is used, THE mock SHALL return the same status codes, the same fields and the same errors as the real GitHub API, and SHALL reject requests that the real API would reject.
6. THE project SHALL include property-based tests for the properties stated in Requirements 1.7, 3.6, 4.9, 5.6, 5.7, 5.8, 5.9, 6.5 and 6.8.
7. THE Ghost_Detector SHALL run on Node.js 24 with TypeScript in strict mode, and all commands SHALL work in Windows PowerShell.
8. THE Ghost_Detector SHALL live in the shared package `packages/core` (`@haunted-repo/core`), so that the demo website and the Power use the same code.
9. THE Ghost_Detector SHALL run in Node.js 24 and in a browser, using only the global `fetch`, `TextDecoder` and `AbortSignal` and no Node-only APIs.
## Edge Cases

- Empty repository: `EMPTY_REPO`.
- Repository with only documentation, or with only test files in a Supported_Language: `NO_SUPPORTED_FILES`.
- URL with extra path parts (for example `/tree/main/src`): the extra parts are ignored and the default branch is analysed.
- Eligible_Files exist but all of them are skipped (`TOO_LARGE` or `NOT_TEXT`): `NO_SUPPORTED_FILES` with a message that mentions the skipped files.
- Repository with 1 or 2 Eligible_Files: report returned with `fewFiles` set to `true` and a "small project" message.
- File with non-UTF-8 bytes: skipped as `NOT_TEXT`.
- File with a line longer than 500 characters: counted as one line.
- File larger than 100 KB: skipped as `TOO_LARGE`.
- Tree larger than 5,000 entries: `truncated` is `true`.
- Monorepo: same rules for the whole tree.
- Network failure or timeout: `NETWORK_ERROR`.
- Rate limit reached before any file is read: `RATE_LIMITED`; after some files were read: partial report.
- Empty file (0 lines): Difficulty_Score is 0.

## Out of Scope

- Explanations and questions (later exorcism spec).
- The Kiro hook and any marking of files written by the agent.
- Ghost state (exorcised or not) and where reports are stored. The storage format and any interface are decided in the design.
- Private repositories and any authentication.
- Languages other than TypeScript, JavaScript, Java and Python.
- One ghost per line of code.
- Git history analysis and import-graph analysis.
- The demo website and Power packaging.
- Any AI call, any server and any database.
- Teacher features and the exorcism certificate.
- Updating `product.md` and `tech.md` (a later task).
