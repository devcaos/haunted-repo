import type { DetectErrorInfo, ErrorCode, Result } from "./types.js";

/** Internal code: a file is not valid UTF-8 text. Not part of the public ErrorCode. */
export type InternalCode = "NOT_TEXT";

export class DetectError extends Error {
  readonly code: ErrorCode | InternalCode;

  constructor(code: ErrorCode | InternalCode, message: string) {
    super(message);
    this.name = "DetectError";
    this.code = code;
  }

  /** Public shape for a Result. NOT_TEXT never leaves the orchestrator, so it is cast. */
  get info(): DetectErrorInfo {
    return { code: this.code as ErrorCode, message: this.message };
  }
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(code: ErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}

export function isCode(
  error: unknown,
  code: ErrorCode | InternalCode,
): boolean {
  return error instanceof DetectError && error.code === code;
}
