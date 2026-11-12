import type { Result } from "../ghost-detection/types.js";
import type { ExorcismErrorCode, ExorcismErrorInfo } from "./types.js";

export function ok<T>(value: T): Result<T, ExorcismErrorInfo> {
  return { ok: true, value };
}

export function fail<T = never>(
  code: ExorcismErrorCode,
  message: string,
): Result<T, ExorcismErrorInfo> {
  return { ok: false, error: { code, message } };
}
