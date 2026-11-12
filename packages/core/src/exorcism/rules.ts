/** Closed list of tutor rule ids, each with one fixed English sentence. */
export const RULE_IDS = [
  "simple-english",
  "no-jargon",
  "what-before-how",
  "no-question",
  "no-lines",
  "max-words",
  "java-allowed",
  "java-forbidden",
  "probable-reasons",
  "separate-what-why",
  "admit-unknown",
  "not-wrong-other-reason",
  "one-question",
  "concrete-file",
  "different-questions",
  "same-question",
  "new-analogy",
  "only-this-part",
  "model-answer-short",
  "judge-behaviour",
  "reason-then-verdict",
  "verdict-format",
  "one-verdict",
  "ask-then-wait",
  "dont-know-verdict",
  "self-check-options",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

/**
 * For `different-questions` and `same-question` the value is the fixed prefix.
 * The full sentence is built with `differentQuestionsSentence` and
 * `sameQuestionSentence`, which add the question texts.
 */
export const RULE_SENTENCES: Readonly<Record<RuleId, string>> = {
  "simple-english": "Write in English, with simple words and short sentences.",
  "no-jargon":
    "Avoid jargon. Define any technical term you must use in one sentence, with an everyday analogy.",
  "what-before-how":
    "Say first WHAT the file does in the project, and only then HOW it does it, in small pieces.",
  "no-question": "Do not ask any question in this message.",
  "no-lines":
    "Never ask about specific lines, line numbers or syntax details. A question may ask the student to predict a behaviour, but not about one specific line.",
  "max-words": "Use at most about 150 words and leave out secondary details.",
  "java-allowed": "You may compare with Java.",
  "java-forbidden": "Do not compare with Java. Use everyday analogies only.",
  "probable-reasons":
    'Present every reason for why the code does something as the probable reason ("probably", "most likely"), never as a sure fact.',
  "separate-what-why":
    "Separate what the code does (it can be read in the file) from why the author wrote it that way (a guess).",
  "admit-unknown":
    "If you cannot tell the reason from the file, say so instead of inventing one.",
  "not-wrong-other-reason":
    "Do not give the verdict `wrong` only because the answer gives a different probable reason than yours.",
  "one-question": "Write exactly one question in your message.",
  "concrete-file":
    "Write the question about this concrete file, using its real names, data and behaviour.",
  "different-questions": "These questions were already asked about this file:",
  "same-question": "Ask the student exactly this question again:",
  "new-analogy":
    "Use a new everyday analogy, different from the one used before.",
  "only-this-part":
    "Explain only the part that the question is about, and add the details the first explanation left out.",
  "model-answer-short": "Show a short model answer to the question.",
  "judge-behaviour":
    "Judge the behaviour that the answer describes, not the exact words used.",
  "reason-then-verdict":
    "Give a short reason in plain language, and then the verdict.",
  "verdict-format":
    "End your judgement with one last line that is exactly `VERDICT: right`, `VERDICT: half-right`, `VERDICT: wrong` or `VERDICT: dont-know`.",
  "one-verdict":
    "Give exactly one verdict per message and per question, never the verdicts of several questions in one message.",
  "ask-then-wait":
    "First write only the question and stop. Wait for the student's answer. Only then write your judgement: a short reason and the VERDICT line. Never answer the question yourself, and never put the question and the verdict in the same message.",
  "dont-know-verdict":
    'If the answer means "I don\'t know" in any language, or is empty, or does not try to answer, the verdict is `dont-know`.',
  "self-check-options":
    'Ask the student whether the file is now understood, with the options "yes", "half" and "no".',
};

/** Full sentence of `different-questions`, listing the earlier questions. */
export function differentQuestionsSentence(
  questions: readonly string[],
): string {
  return `${RULE_SENTENCES["different-questions"]} ${questions
    .map((q) => `"${q}"`)
    .join(" ")} Write different questions that keep the same objective.`;
}

/** Full sentence of `same-question`, with the question to repeat. */
export function sameQuestionSentence(question: string): string {
  return `${RULE_SENTENCES["same-question"]} "${question}"`;
}
