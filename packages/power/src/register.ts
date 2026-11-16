// Registers the six Power_Tools (design section 4). For now every handler is
// a stub that answers NO_SESSION; the real handlers arrive in later tasks.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod";
import { INTERNAL_MESSAGE, NO_SESSION_MESSAGE } from "./messages.js";

type ErrorAnswer = { ok: false; code: string; message: string };

/** Two text items: a short message for the Student, then the JSON data. */
function errorResult(answer: ErrorAnswer): CallToolResult {
  return {
    content: [
      { type: "text", text: answer.message },
      { type: "text", text: JSON.stringify(answer) },
    ],
    isError: true,
  };
}

/** A tool never throws to Kiro: a bug becomes an INTERNAL error answer. */
function safe<A extends unknown[]>(
  handler: (...args: A) => Promise<CallToolResult>,
): (...args: A) => Promise<CallToolResult> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch {
      return errorResult({
        ok: false,
        code: "INTERNAL",
        message: INTERNAL_MESSAGE,
      });
    }
  };
}

async function noSession(): Promise<CallToolResult> {
  return errorResult({
    ok: false,
    code: "NO_SESSION",
    message: NO_SESSION_MESSAGE,
  });
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "find_ghosts",
    {
      description:
        "Find the ghosts (key files) of a public GitHub repository, from easy to hard, and start an exorcism session.",
      inputSchema: {
        url: z.string(),
        knowsJava: z.boolean().optional(),
        replace: z.boolean().optional(),
      },
    },
    safe(noSession),
  );

  server.registerTool(
    "continue_house",
    {
      description:
        "Continue a saved haunted house: start a new session from the saved ghosts and progress of a repository.",
      inputSchema: {
        url: z.string(),
        knowsJava: z.boolean().optional(),
      },
    },
    safe(noSession),
  );

  server.registerTool(
    "pick_ghost",
    {
      description:
        "Pick the ghost (file path) to exorcise next. The Power reads its text from GitHub.",
      inputSchema: { path: z.string() },
    },
    safe(noSession),
  );

  server.registerTool(
    "send_event",
    {
      description:
        "Tell the Power what the Tutor just did: an explanation, a self-check answer, retrying or leaving a ghost.",
      inputSchema: {
        type: z.enum([
          "explanation-done",
          "self-check-answered",
          "retry-ghost",
          "leave-ghost",
        ]),
        text: z.string().optional(),
        answer: z.enum(["yes", "half", "no"]).optional(),
      },
    },
    safe(noSession),
  );

  server.registerTool(
    "judge_answer",
    {
      description:
        "Send the Tutor's judgement of the Student's answer. The last line must be exactly one VERDICT line.",
      inputSchema: {
        question: z.string(),
        judgement: z.string(),
      },
    },
    safe(noSession),
  );

  server.registerTool(
    "house_status",
    {
      description:
        "Show every ghost of the current house, haunted or exorcised, and how much of the house is still haunted.",
    },
    safe(noSession),
  );
}
