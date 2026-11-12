import { describe, expect, it } from "vitest";
import { formatVerdict, parseVerdict } from "./verdict.js";
import type { Verdict } from "./types.js";

const ALL: Verdict[] = ["right", "half-right", "wrong", "dont-know"];

describe("formatVerdict", () => {
  it("adds the verdict line after the trimmed reason", () => {
    expect(formatVerdict("Good answer.  \n\n", "right")).toBe(
      "Good answer.\nVERDICT: right",
    );
  });

  it("returns only the verdict line when the reason is empty", () => {
    expect(formatVerdict("  \n ", "wrong")).toBe("VERDICT: wrong");
  });
});

describe("parseVerdict", () => {
  it.each(ALL)("accepts %s", (v) => {
    expect(parseVerdict(`Reason.\nVERDICT: ${v}`)).toEqual({
      ok: true,
      value: v,
    });
  });

  it("accepts a trailing carriage return", () => {
    expect(parseVerdict("Reason.\r\nVERDICT: right\r\n")).toEqual({
      ok: true,
      value: "right",
    });
  });

  it("accepts trailing blank lines and spaces", () => {
    expect(parseVerdict("VERDICT: wrong  \n\n  \n")).toEqual({
      ok: true,
      value: "wrong",
    });
  });

  it.each([
    ["empty text", ""],
    ["only blank lines", "\n \n"],
    ["no verdict line", "Just a reason."],
    ["unknown verdict", "Reason.\nVERDICT: maybe"],
    ["text after the verdict", "VERDICT: right\nThanks!"],
    ["verdict not alone on its line", "Reason. VERDICT: right"],
  ])("rejects %s", (_name, text) => {
    const r = parseVerdict(text);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("INVALID_VERDICT");
      expect(r.error.message).toContain("The last line must be exactly one of");
    }
  });

  it("rejects two VERDICT lines", () => {
    const r = parseVerdict("VERDICT: right\nMore.\nVERDICT: wrong");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toContain("more than one VERDICT line");
    }
  });
});
