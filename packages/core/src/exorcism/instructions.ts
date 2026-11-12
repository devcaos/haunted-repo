import type { Ghost } from "../ghost-detection/types.js";
import { QUESTION_SETS } from "./questions.js";
import {
  RULE_SENTENCES,
  differentQuestionsSentence,
  sameQuestionSentence,
  type RuleId,
} from "./rules.js";
import { suggestGhost } from "./suggest.js";
import type {
  CurrentGhost,
  ExorcismStep,
  SessionState,
  TutorInstructions,
} from "./types.js";

/** A fence of backticks longer than any run of backticks inside the text. */
function fenceFor(text: string): string {
  let longest = 0;
  for (const run of text.match(/`+/g) ?? []) {
    if (run.length > longest) longest = run.length;
  }
  return "`".repeat(Math.max(3, longest + 1));
}

function fenced(text: string): string {
  const fence = fenceFor(text);
  return `${fence}\n${text}\n${fence}`;
}

function ghostBlock(current: CurrentGhost): string {
  return `Ghost: ${current.path}\n${fenced(current.text)}`;
}

function javaRule(state: SessionState): RuleId {
  return state.profile?.knowsJava === true ? "java-allowed" : "java-forbidden";
}

function render(
  step: ExorcismStep,
  title: string,
  blocks: string[],
  rules: RuleId[],
  sentenceOverrides: Partial<Record<RuleId, string>> = {},
): TutorInstructions {
  const bullets = rules
    .map((id) => `- ${sentenceOverrides[id] ?? RULE_SENTENCES[id]}`)
    .join("\n");
  const text = [title, ...blocks, `Rules:\n${bullets}`].join("\n\n");
  return { step, text, rules };
}

function requireCurrent(state: SessionState): CurrentGhost {
  if (state.current === null) {
    throw new Error(`Step ${state.step} needs a current ghost`);
  }
  return state.current;
}

function describeGhost(ghost: Ghost): string {
  return `${ghost.path} (${ghost.floor}): ${ghost.reason}`;
}

function buildChoosing(state: SessionState): TutorInstructions {
  const haunted = new Set(
    state.progress.ghosts
      .filter((g) => g.state === "haunted")
      .map((g) => g.path),
  );
  const hauntedGhosts = state.ghosts.filter((g) => haunted.has(g.path));
  const suggested = suggestGhost(state.ghosts, state.progress);
  const message =
    suggested === null
      ? "Tell the student that there is no haunted ghost left to pick."
      : `Tell the student which ghost is suggested to start with: ${describeGhost(suggested)}. Say that any haunted ghost can be picked instead.`;
  const list = hauntedGhosts.map((g) => `- ${describeGhost(g)}`).join("\n");
  return render(
    "choosing",
    "Step: choosing a ghost",
    [message, `Haunted ghosts:\n${list}`],
    ["probable-reasons"],
  );
}

function buildExplaining(state: SessionState): TutorInstructions {
  const current = requireCurrent(state);
  const retry = current.explanation !== "";
  const rules: RuleId[] = [
    "simple-english",
    "no-jargon",
    "what-before-how",
    "no-question",
    "no-lines",
    "max-words",
    javaRule(state),
    "probable-reasons",
    "separate-what-why",
    "admit-unknown",
  ];
  const blocks = [
    ghostBlock(current),
    "Task: explain this file to the student.",
  ];
  if (retry) {
    blocks.push(
      `Explanation given before:\n${fenced(current.explanation)}`,
      "Task: write another explanation of the same file.",
    );
    rules.push("new-analogy");
  }
  return render("explaining", "Step: explaining the ghost", blocks, rules);
}

function buildSelfCheck(): TutorInstructions {
  return render(
    "self-check",
    "Step: self-check",
    [
      "Tell the student that the ghost is exorcised. Then ask the student if the file is now understood.",
    ],
    ["probable-reasons", "self-check-options"],
  );
}

function buildFailed(): TutorInstructions {
  return render(
    "failed",
    "Step: ghost not exorcised",
    [
      "Tell the student that the ghost stays haunted for now. The student can try the same ghost again after a new explanation, or pick another ghost.",
    ],
    ["probable-reasons"],
  );
}

function buildHouseClean(): TutorInstructions {
  return render(
    "house-clean",
    "Step: house clean",
    ["Tell the student that the house is clean: no haunted ghost is left."],
    ["probable-reasons"],
  );
}

function requirePending(current: CurrentGhost): string {
  if (current.pendingQuestion === null) {
    throw new Error("This step needs a pending question");
  }
  return current.pendingQuestion;
}

function buildAsking(state: SessionState): TutorInstructions {
  const current = requireCurrent(state);
  const judging: RuleId[] = [
    "no-lines",
    "judge-behaviour",
    "reason-then-verdict",
    "verdict-format",
    "one-verdict",
    "dont-know-verdict",
    "not-wrong-other-reason",
    "admit-unknown",
    "probable-reasons",
    "simple-english",
    "no-jargon",
    javaRule(state),
  ];
  if (current.pendingQuestion !== null) {
    const rules: RuleId[] = ["same-question", "ask-then-wait", ...judging];
    return render(
      "asking",
      "Step: asking the same question again",
      [
        ghostBlock(current),
        `Task: ask the question again, then judge the answer.\nQuestion: ${current.pendingQuestion}`,
      ],
      rules,
      { "same-question": sameQuestionSentence(current.pendingQuestion) },
    );
  }
  const objective = QUESTION_SETS[current.kind][current.questionIndex];
  const earlier = (state.asked[current.path] ?? []).slice(
    0,
    current.attemptStart,
  );
  const rules: RuleId[] = ["one-question", "concrete-file", "ask-then-wait"];
  const overrides: Partial<Record<RuleId, string>> = {};
  if (earlier.length > 0) {
    rules.push("different-questions");
    overrides["different-questions"] = differentQuestionsSentence(earlier);
  }
  rules.push(...judging);
  return render(
    "asking",
    "Step: asking a question",
    [
      ghostBlock(current),
      `Task: ask one question about this file. Objective of the question: ${objective}.`,
    ],
    rules,
    overrides,
  );
}

function buildSimplifying(state: SessionState): TutorInstructions {
  const current = requireCurrent(state);
  const question = requirePending(current);
  const blocks = [
    ghostBlock(current),
    `Question the student could not answer: ${question}`,
    `Explanation given before:\n${fenced(current.explanation)}`,
  ];
  if (current.simpler.length > 0) {
    const list = current.simpler
      .map((s, i) => `Simpler explanation ${i + 1}:\n${fenced(s)}`)
      .join("\n\n");
    blocks.push(list);
  }
  blocks.push(
    "Task: write a simpler explanation of the part of the file that the question is about.",
  );
  return render("simplifying", "Step: simpler explanation", blocks, [
    "new-analogy",
    "only-this-part",
    "max-words",
    "no-question",
    "no-lines",
    "separate-what-why",
    "simple-english",
    "no-jargon",
    javaRule(state),
    "admit-unknown",
    "probable-reasons",
  ]);
}

function buildModelAnswer(state: SessionState): TutorInstructions {
  const current = requireCurrent(state);
  const question = requirePending(current);
  return render(
    "model-answer",
    "Step: model answer",
    [
      ghostBlock(current),
      `Question: ${question}`,
      "Task: show a short model answer to this question.",
    ],
    [
      "model-answer-short",
      "no-question",
      "no-lines",
      "simple-english",
      "no-jargon",
      javaRule(state),
      "admit-unknown",
      "probable-reasons",
    ],
  );
}

export function buildInstructions(state: SessionState): TutorInstructions {
  switch (state.step) {
    case "choosing":
      return buildChoosing(state);
    case "explaining":
      return buildExplaining(state);
    case "self-check":
      return buildSelfCheck();
    case "failed":
      return buildFailed();
    case "house-clean":
      return buildHouseClean();
    case "asking":
      return buildAsking(state);
    case "simplifying":
      return buildSimplifying(state);
    case "model-answer":
      return buildModelAnswer(state);
  }
}
