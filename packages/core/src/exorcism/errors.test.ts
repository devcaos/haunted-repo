import { describe, expect, it } from "vitest";
import { fail, ok } from "./errors.js";

describe("exorcism errors", () => {
  it("ok wraps a value", () => {
    expect(ok(5)).toStrictEqual({ ok: true, value: 5 });
  });

  it("fail wraps a code and an English message", () => {
    expect(fail("INVALID_EVENT", "Bad event.")).toStrictEqual({
      ok: false,
      error: { code: "INVALID_EVENT", message: "Bad event." },
    });
  });
});
