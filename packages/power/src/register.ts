// Registers the six Power_Tools (design section 4). Handlers stay thin: they
// call HauntedPower and turn its answer into an MCP result. Tools without
// their real handler yet are stubs that answer NO_SESSION.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod";
import { INTERNAL_MESSAGE, NO_SESSION_MESSAGE } from "./messages.js";
import type { Answer, HauntedPower } from "./power.js";

/**
 * Two text items: a short message for the Student, then the JSON data.
 * A refused or failed call sets isError.
 */
export function toResult(answer: Answer): CallToolResult {
  return {
    content: [
      { type: "text", text: answer.message },
      { type: "text", text: JSON.stringify(answer) },
    ],
    isError: !answer.ok,
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
      return toResult({
        ok: false,
        code: "INTERNAL",
        message: INTERNAL_MESSAGE,
      });
    }
  };
}

async function noSession(): Promise<CallToolResult> {
  return toResult({
    ok: false,
    code: "NO_SESSION",
    message: NO_SESSION_MESSAGE,
  });
}

export function registerTools(server: McpServer, power: HauntedPower): void {
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
    safe(async ({ url, knowsJava, replace }) => {
      const input: Parameters<HauntedPower["findGhosts"]>[0] = { url };
      if (knowsJava !== undefined) input.knowsJava = knowsJava;
      if (replace !== undefined) input.replace = replace;
      return toResult(await power.findGhosts(input));
    }),
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
    safe(async ({ url, knowsJava }) => {
      const input: Parameters<HauntedPower["continueHouse"]>[0] = { url };
      if (knowsJava !== undefined) input.knowsJava = knowsJava;
      return toResult(await power.continueHouse(input));
    }),
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
