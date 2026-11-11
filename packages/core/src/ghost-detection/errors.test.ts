import { describe, expect, test } from "vitest";
import { DetectError, fail, isCode, ok } from "./errors.js";

describe("errors", () => {
  test("ok wraps a value", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });

  test("fail builds an error result", () => {
    expect(fail("INVALID_URL", "bad url")).toEqual({
      ok: false,
      error: { code: "INVALID_URL", message: "bad url" },
    });
  });

  test("DetectError keeps code and message", () => {
    const e = new DetectError("RATE_LIMITED", "slow down");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.message).toBe("slow down");
    expect(e.info).toEqual({ code: "RATE_LIMITED", message: "slow down" });
  });

  test("DetectError supports the internal NOT_TEXT code", () => {
    expect(isCode(new DetectError("NOT_TEXT", "binary"), "NOT_TEXT")).toBe(
      true,
    );
  });

  test("isCode matches only the same code", () => {
    const e = new DetectError("EMPTY_REPO", "empty");
    expect(isCode(e, "EMPTY_REPO")).toBe(true);
    expect(isCode(e, "NETWORK_ERROR")).toBe(false);
  });

  test("isCode is false for a plain Error and non-errors", () => {
    expect(isCode(new Error("x"), "NETWORK_ERROR")).toBe(false);
    expect(isCode("NETWORK_ERROR", "NETWORK_ERROR")).toBe(false);
    expect(isCode(undefined, "NETWORK_ERROR")).toBe(false);
  });
});
