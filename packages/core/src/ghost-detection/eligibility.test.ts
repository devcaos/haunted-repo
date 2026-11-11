import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isEligible, languageOf } from "./eligibility.js";

describe("isEligible", () => {
  const eligible = [
    "index.ts",
    "src/app.tsx",
    "lib/util.js",
    "a/b/c.jsx",
    "tools/run.mjs",
    "tools/run.cjs",
    "src/Main.java",
    "src/main.py",
    "SRC/Index.TS",
    "src/Main.JAVA",
    "src/latest.java",
  ];
  it.each(eligible)("accepts %s", (path) => {
    expect(isEligible(path)).toBe(true);
  });

  const notEligible: [string, string][] = [
    ["README.md", "unsupported extension"],
    ["package-lock.json", "lock file"],
    ["style.css", "unsupported extension"],
    ["noextension", "no extension"],
    ["node_modules/pkg/index.js", "node_modules"],
    ["NODE_MODULES/pkg/index.js", "node_modules upper case"],
    ["dist/index.js", "dist"],
    ["build/index.js", "build"],
    ["out/index.js", "out"],
    ["vendor/lib.py", "vendor"],
    ["target/Main.java", "target"],
    ["coverage/x.js", "coverage"],
    [".git/hooks/x.js", ".git"],
    ["pkg/__pycache__/x.py", "__pycache__"],
    [".next/server/x.js", ".next"],
    ["src/types.d.ts", ".d.ts"],
    ["src/app.min.js", ".min.js"],
    ["src/api.generated.ts", ".generated."],
    ["src/api.gen.ts", ".gen."],
    ["vite.config.ts", ".config."],
    [".eslintrc.js", ".eslintrc."],
    ["setup.py", "setup.py"],
    ["pkg/setup.py", "setup.py in folder"],
    ["src/a.test.ts", ".test."],
    ["src/a.spec.js", ".spec."],
    ["src/test_a.py", "test_ prefix"],
    ["src/FooTest.java", "Test.java suffix"],
    ["src/__tests__/a.ts", "__tests__ folder"],
    ["test/a.py", "test folder"],
    ["tests/a.py", "tests folder"],
    ["spec/a.js", "spec folder"],
    ["src/Tests/a.ts", "tests folder upper case"],
  ];
  it.each(notEligible)("rejects %s (%s)", (path) => {
    expect(isEligible(path)).toBe(false);
  });

  it("does not treat the file name as a folder", () => {
    expect(isEligible("src/test.ts")).toBe(true);
    expect(isEligible("src/build.ts")).toBe(true);
  });
});

describe("languageOf", () => {
  const cases: [string, string | null][] = [
    ["a.ts", "TypeScript"],
    ["a.tsx", "TypeScript"],
    ["a.js", "JavaScript"],
    ["a.jsx", "JavaScript"],
    ["a.mjs", "JavaScript"],
    ["a.cjs", "JavaScript"],
    ["A.java", "Java"],
    ["a.py", "Python"],
    ["src/A.TS", "TypeScript"],
    ["a.md", null],
    ["Makefile", null],
  ];
  it.each(cases)("%s -> %s", (path, language) => {
    expect(languageOf(path)).toBe(language);
  });
});

describe("eligibility properties", () => {
  const folderArb = fc.constantFrom(
    "src",
    "lib",
    "app",
    "test",
    "tests",
    "spec",
    "node_modules",
    "dist",
    "build",
    "out",
    "vendor",
    "target",
    "coverage",
    ".git",
    "__pycache__",
    ".next",
    "SRC",
    "Node_Modules",
    "utils",
  );
  const nameArb = fc.constantFrom(
    "index",
    "main",
    "app",
    "Main",
    "FooTest",
    "test_a",
    "a.test",
    "b.spec",
    "c.min",
    "d.generated",
    "e.gen",
    "vite.config",
    "types.d",
    "setup",
  );
  const extArb = fc.constantFrom(
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".java",
    ".py",
    ".TS",
    ".md",
    ".json",
    "",
  );
  const pathArb = fc
    .tuple(fc.array(folderArb, { maxLength: 4 }), nameArb, extArb)
    .map(([folders, name, ext]) => [...folders, name + ext].join("/"));

  it("Property 2: eligible set does not depend on order", () => {
    // Feature: ghost-detection, Property 2: Eligible set does not depend on order
    fc.assert(
      fc.property(
        fc.array(fc.tuple(pathArb, fc.double({ noNaN: true })), {
          maxLength: 30,
        }),
        (items) => {
          const paths = items.map(([path]) => path);
          const shuffled = [...items]
            .sort((a, b) => a[1] - b[1])
            .map(([path]) => path);
          const eligibleOf = (list: string[]) =>
            new Set(list.filter(isEligible));
          expect(eligibleOf(shuffled)).toEqual(eligibleOf(paths));
        },
      ),
      { numRuns: 100 },
    );
  });
});
