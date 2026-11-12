import { describe, expect, it } from "vitest";
import { objectiveOf, QUESTION_SETS } from "./questions.js";
import type { FileKind } from "./types.js";

const KINDS: FileKind[] = ["data-shape", "logic", "entry-point", "general"];

describe("QUESTION_SETS", () => {
  it("has exactly 3 non-empty objectives per kind", () => {
    for (const kind of KINDS) {
      expect(QUESTION_SETS[kind]).toHaveLength(3);
      for (const objective of QUESTION_SETS[kind]) {
        expect(objective.trim()).not.toBe("");
      }
    }
  });

  it("has no digit and no 'line' or 'syntax' as a target", () => {
    for (const kind of KINDS) {
      for (const objective of QUESTION_SETS[kind]) {
        expect(objective).not.toMatch(/\d/);
        expect(objective).not.toMatch(/\bli?nes?\b/i);
        expect(objective).not.toMatch(/\bsyntax\b/i);
      }
    }
  });

  it("does not ask data-shape what goes in and what comes out", () => {
    for (const objective of QUESTION_SETS["data-shape"]) {
      expect(objective).not.toContain("what goes in and what comes out");
    }
  });

  it("uses the Core_Question objective at index 0", () => {
    expect(QUESTION_SETS["data-shape"][0]).toBe("what the file is for");
    expect(QUESTION_SETS.logic[0]).toBe("what the file does");
    expect(QUESTION_SETS["entry-point"][0]).toBe(
      "what the file starts or connects",
    );
    expect(QUESTION_SETS.general[0]).toBe("what the file is for");
  });

  it("has the exact objectives 1 and 2 of the design", () => {
    expect(QUESTION_SETS["data-shape"].slice(1)).toEqual([
      "what data one record carries",
      "what happens when one piece of data is missing",
    ]);
    expect(QUESTION_SETS.logic.slice(1)).toEqual([
      "what goes in and what comes out",
      "when it fails or what can go wrong",
    ]);
    expect(QUESTION_SETS["entry-point"].slice(1)).toEqual([
      "which other parts it uses and in what order",
      "what happens if one of those parts fails",
    ]);
    expect(QUESTION_SETS.general.slice(1)).toEqual([
      "what you would notice in the project if the file did not exist",
      "what could go wrong in it",
    ]);
  });

  it("objectiveOf returns the objective at the index", () => {
    for (const kind of KINDS) {
      expect(objectiveOf(kind, 0)).toBe(QUESTION_SETS[kind][0]);
      expect(objectiveOf(kind, 1)).toBe(QUESTION_SETS[kind][1]);
      expect(objectiveOf(kind, 2)).toBe(QUESTION_SETS[kind][2]);
    }
  });
});
