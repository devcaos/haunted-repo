import { parseReport } from "../ghost-detection/parseReport.js";
import type { Result } from "../ghost-detection/types.js";
import { fail, ok } from "./errors.js";
import { advance, startSession, type StartOptions } from "./engine.js";
import { parseEvent } from "./event.js";
import { isExorcismProgress } from "./progress.js";
import type {
  ExorcismErrorInfo,
  ExorcismProgress,
  RecordedEvent,
  SessionRecording,
  SessionState,
  StudentProfile,
  TutorInstructions,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): Result<never, ExorcismErrorInfo> {
  return fail("INVALID_SESSION", message);
}

function parseRecordedEvent(
  raw: unknown,
  index: number,
): Result<RecordedEvent, ExorcismErrorInfo> {
  const where = `events[${index}]`;
  const parsed = parseEvent(raw);
  if (!parsed.ok) {
    return invalid(`${where} is not a valid event: ${parsed.error.message}`);
  }
  const event = parsed.value;
  // parseEvent succeeded, so raw is a plain object.
  const sample = (raw as Record<string, unknown>)["sampleAnswer"];
  if (sample === undefined) return ok(event);
  if (event.type !== "answer-rated" && event.type !== "dont-know") {
    return invalid(
      `${where}.sampleAnswer is only allowed on "answer-rated" and "dont-know".`,
    );
  }
  if (typeof sample !== "string") {
    return invalid(`${where}.sampleAnswer must be a string.`);
  }
  return ok({ ...event, sampleAnswer: sample });
}

/** Parses the JSON text of a session recording. Never throws. */
export function parseRecording(
  jsonText: string,
): Result<SessionRecording, ExorcismErrorInfo> {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(jsonText);
    } catch {
      return invalid("The recording is not valid JSON text.");
    }
    if (!isRecord(raw)) return invalid("The recording must be an object.");

    const report = parseReport(JSON.stringify(raw["report"]));
    if (!report.ok) {
      return invalid(`The report is not valid: ${report.error.message}`);
    }
    const paths = new Set<string>();
    for (const ghost of report.value.ghosts) {
      if (paths.has(ghost.path)) {
        return invalid(`The report repeats the ghost path "${ghost.path}".`);
      }
      paths.add(ghost.path);
    }

    const rawProgress = raw["progress"];
    let progress: ExorcismProgress | null = null;
    if (rawProgress !== null) {
      if (!isExorcismProgress(rawProgress)) {
        return invalid("The progress is not valid.");
      }
      progress = rawProgress;
    }

    const rawProfile = raw["profile"];
    let profile: StudentProfile | null = null;
    if (rawProfile !== null) {
      if (
        !isRecord(rawProfile) ||
        typeof rawProfile["knowsJava"] !== "boolean"
      ) {
        return invalid(
          "The profile must be null or an object with a boolean knowsJava.",
        );
      }
      profile = { knowsJava: rawProfile["knowsJava"] };
    }

    const rawEvents = raw["events"];
    if (!Array.isArray(rawEvents)) {
      return invalid("The recording must have an events list.");
    }
    const events: RecordedEvent[] = [];
    for (const [index, item] of rawEvents.entries()) {
      const event = parseRecordedEvent(item, index);
      if (!event.ok) return event;
      events.push(event.value);
    }

    return ok({ report: report.value, progress, profile, events });
  } catch {
    return invalid("The recording could not be read.");
  }
}

export function formatRecording(recording: SessionRecording): string {
  return JSON.stringify(recording);
}

export interface ReplayStep {
  state: SessionState;
  instructions: TutorInstructions;
}

/**
 * Runs the events of a recording through the engine.
 * steps[0] is the start; steps[i] is the result of event i (1-based).
 * The sampleAnswer field is never read. Never throws.
 */
export function replay(
  recording: SessionRecording,
): Result<{ steps: ReplayStep[] }, ExorcismErrorInfo> {
  try {
    const options: StartOptions = {};
    if (recording.progress !== null) options.progress = recording.progress;
    if (recording.profile !== null) options.profile = recording.profile;
    const first = startSession(recording.report, options);
    const steps: ReplayStep[] = [first];
    let state = first.state;
    for (const [index, event] of recording.events.entries()) {
      const result = advance(state, event);
      if (!result.ok) {
        return invalid(
          `Event ${index + 1} (${event.type}) is not accepted in the step "${state.step}". ${result.error.message}`,
        );
      }
      state = result.state;
      steps.push({ state: result.state, instructions: result.instructions });
    }
    return ok({ steps });
  } catch {
    return invalid("The recording could not be replayed.");
  }
}
