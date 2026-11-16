// Feature: kiro-power, Property 5: Safe file names
import path from "node:path";
import { parseRepoUrl } from "@haunted-repo/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dataFileName, isOwnDataFile } from "./dataFile.js";

interface Ref {
  owner: string;
  repo: string;
}

const OWNER_CHARS = [
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
];
const REPO_CHARS = [...OWNER_CHARS, ".", "_"];
// Characters parseRepoUrl must refuse; they show up now and then so the
// filter below really decides what is accepted.
const BAD_CHARS = ["/", "\\", ":", "@", " ", "%", "é"];

function part(chars: string[], maxLength: number): fc.Arbitrary<string> {
  return fc.string({
    unit: fc.oneof(
      { weight: 20, arbitrary: fc.constantFrom(...chars) },
      { weight: 1, arbitrary: fc.constantFrom(...BAD_CHARS) },
    ),
    minLength: 1,
    maxLength,
  });
}

/** Owner and repo exactly as parseRepoUrl accepts them, in any letter case. */
const refArb: fc.Arbitrary<Ref> = fc
  .tuple(part(OWNER_CHARS, 39), part(REPO_CHARS, 100))
  .map(([owner, repo]) => parseRepoUrl(`https://github.com/${owner}/${repo}`))
  .filter((result) => result.ok)
  .map((result) => (result.ok ? result.value : { owner: "", repo: "" }));

/** Changes the letter case of some characters only. */
function mixCase(text: string, flips: boolean[]): string {
  return [...text]
    .map((char, i) =>
      flips[i % flips.length] ? char.toUpperCase() : char.toLowerCase(),
    )
    .join("");
}

const FOLDER = path.resolve("haunted-data-folder");

describe("Property 5: Safe file names", () => {
  /** **Validates: Requirements 7.1, 7.11** */
  it("gives a lowercase own-file name that stays inside the folder", () => {
    fc.assert(
      fc.property(refArb, ({ owner, repo }) => {
        const name = dataFileName(owner, repo);
        expect(name).toBe(name.toLowerCase());
        expect(isOwnDataFile(name)).toBe(true);
        expect(name).not.toMatch(/[/\\:]/);
        const full = path.join(FOLDER, name);
        expect(path.dirname(full)).toBe(FOLDER);
        expect(path.relative(FOLDER, full)).toBe(name);
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements 7.1, 7.11** */
  it("gives the same name for letter case only, and different names otherwise", () => {
    fc.assert(
      fc.property(
        refArb,
        refArb,
        fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
        (a, b, flips) => {
          const recased = {
            owner: mixCase(a.owner, flips),
            repo: mixCase(a.repo, flips),
          };
          expect(dataFileName(recased.owner, recased.repo)).toBe(
            dataFileName(a.owner, a.repo),
          );

          const sameIgnoringCase =
            a.owner.toLowerCase() === b.owner.toLowerCase() &&
            a.repo.toLowerCase() === b.repo.toLowerCase();
          expect(
            dataFileName(a.owner, a.repo) === dataFileName(b.owner, b.repo),
          ).toBe(sameIgnoringCase);
        },
      ),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements 7.1, 7.11** */
  it("keeps references apart that only differ in where owner ends", () => {
    // Owner "a--b" with repo "c" and owner "a" with repo "b--c" (design section 5).
    fc.assert(
      fc.property(
        part(OWNER_CHARS, 10).filter((s) => /^[A-Za-z0-9-]+$/.test(s)),
        part(OWNER_CHARS, 10).filter((s) => /^[A-Za-z0-9-]+$/.test(s)),
        part(OWNER_CHARS, 10).filter((s) => /^[A-Za-z0-9-]+$/.test(s)),
        (x, y, z) => {
          const left = dataFileName(`${x}-${y}`, z);
          const right = dataFileName(x, `${y}-${z}`);
          expect(left).not.toBe(right);
        },
      ),
      { numRuns: 100 },
    );
  });
});
