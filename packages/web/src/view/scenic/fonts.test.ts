/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The font credits and licence texts that ship with the site (Requirement 21.8).
function fontFile(name: string): string {
  return fileURLToPath(
    new URL(`../../../public/fonts/${name}`, import.meta.url),
  );
}

describe("font credits", () => {
  it("has the credits and both licence texts", () => {
    for (const name of [
      "CREDITS.txt",
      "OFL-creepster.txt",
      "OFL-im-fell-english.txt",
    ]) {
      expect(existsSync(fontFile(name)), name).toBe(true);
    }
  });

  it("names both fonts, both holders and the SIL Open Font Licence", () => {
    const credits = readFileSync(fontFile("CREDITS.txt"), "utf8");
    expect(credits).toContain("Creepster");
    expect(credits).toContain("IM Fell English");
    expect(credits).toContain("Font Diner, Inc");
    expect(credits).toContain("Igino Marini");
    expect(credits).toContain("SIL Open Font License");
  });

  it("the licence texts start with the right holder and hold the licence", () => {
    const creepster = readFileSync(fontFile("OFL-creepster.txt"), "utf8");
    const imFell = readFileSync(fontFile("OFL-im-fell-english.txt"), "utf8");
    expect(creepster).toContain("Copyright (c) 2011, Font Diner, Inc");
    expect(imFell).toContain("Copyright (c) 2010, Igino Marini");
    for (const text of [creepster, imFell]) {
      expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
      expect(text).toContain("PERMISSION & CONDITIONS");
      expect(text).toContain("DISCLAIMER");
    }
  });
});
