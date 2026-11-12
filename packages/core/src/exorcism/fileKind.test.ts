import { describe, expect, it } from "vitest";
import { classifyFileKind } from "./fileKind.js";

describe("classifyFileKind", () => {
  describe("general", () => {
    it("empty and comment-only files are general", () => {
      expect(classifyFileKind("", "TypeScript")).toBe("general");
      expect(classifyFileKind("// nothing here\n# nor here\n", "Python")).toBe(
        "general",
      );
    });

    it("code without functions or types is general", () => {
      expect(
        classifyFileKind("const a = 1;\nconst b = 2;\n", "JavaScript"),
      ).toBe("general");
      expect(classifyFileKind("class Foo {\n  int x;\n}\n", "Java")).toBe(
        "general",
      );
      expect(classifyFileKind("X = 1\nY = 2\n", "Python")).toBe("general");
    });
  });

  describe("entry-point", () => {
    it("detects entry markers per language", () => {
      expect(
        classifyFileKind(
          "const s = createServer(h);\ns.listen(80);\n",
          "TypeScript",
        ),
      ).toBe("entry-point");
      expect(classifyFileKind("run(process.argv);\n", "JavaScript")).toBe(
        "entry-point",
      );
      expect(
        classifyFileKind(
          "class App {\n  public static void main(String[] args) {\n  }\n}\n",
          "Java",
        ),
      ).toBe("entry-point");
      expect(
        classifyFileKind(
          'def main():\n    pass\nif __name__ == "__main__":\n    main()\n',
          "Python",
        ),
      ).toBe("entry-point");
    });

    it("a barrel of re-exports is an entry point", () => {
      const barrel = 'export * from "./a.js";\nexport { b } from "./b.js";\n';
      expect(classifyFileKind(barrel, "TypeScript")).toBe("entry-point");
    });

    it("a file with only imports is a barrel", () => {
      expect(classifyFileKind("import os\nfrom a import b\n", "Python")).toBe(
        "entry-point",
      );
    });
  });

  describe("data-shape", () => {
    it("TypeScript types file", () => {
      const text =
        "export interface User {\n  name: string;\n  age: number;\n}\nexport type Id = string;\n";
      expect(classifyFileKind(text, "TypeScript")).toBe("data-shape");
    });

    it("TypeScript types with function types still count as data-shape (spike fixture)", () => {
      const text = [
        "export type Result<T> = { ok: true; value: T } | { ok: false };",
        "export interface Client {",
        "  fetchText: (path: string) => Promise<string>;",
        "}",
        "export type Handler = (x: number) => void;",
      ].join("\n");
      expect(classifyFileKind(text, "TypeScript")).toBe("data-shape");
    });

    it("Java record", () => {
      expect(
        classifyFileKind("public record Point(int x, int y) {}\n", "Java"),
      ).toBe("data-shape");
    });

    it("Python dataclass", () => {
      const text = "@dataclass\nclass P:\n    x: int\n    y: int\n";
      expect(classifyFileKind(text, "Python")).toBe("data-shape");
    });

    it("Python TypedDict", () => {
      expect(
        classifyFileKind("class P(TypedDict):\n    x: int\n", "Python"),
      ).toBe("data-shape");
    });

    it("types with branches are not data-shape", () => {
      const text = "type A = string;\nif (x) {\n}\n";
      expect(classifyFileKind(text, "TypeScript")).not.toBe("data-shape");
    });
  });

  describe("logic", () => {
    it("loops and conditions (spike fixture)", () => {
      const text = [
        "function total(items: number[]): number {",
        "  let sum = 0;",
        "  for (const i of items) {",
        "    if (i > 0) {",
        "      sum += i;",
        "    }",
        "  }",
        "  return sum;",
        "}",
      ].join("\n");
      expect(classifyFileKind(text, "TypeScript")).toBe("logic");
    });

    it("arrow function in JavaScript", () => {
      expect(classifyFileKind("const f = (a) => a + 1;\n", "JavaScript")).toBe(
        "logic",
      );
    });

    it("Java method", () => {
      const text =
        "class A {\n  public int twice(int x) {\n    return x * 2;\n  }\n}\n";
      expect(classifyFileKind(text, "Java")).toBe("logic");
    });

    it("Java if line is not a method", () => {
      const text = "class A {\n  int x;\n  void f() {\n  }\n}\n";
      expect(classifyFileKind(text, "Java")).toBe("logic");
      const noMethod = "class A {\n  static {\n    if (x) {\n    }\n  }\n}\n";
      expect(classifyFileKind(noMethod, "Java")).toBe("general");
    });

    it("Python def", () => {
      expect(classifyFileKind("def f(x):\n    return x\n", "Python")).toBe(
        "logic",
      );
      expect(
        classifyFileKind("async def f(x):\n    return x\n", "Python"),
      ).toBe("logic");
    });

    it("Java class with only fields and getters is logic (documented limit)", () => {
      const text = [
        "public class User {",
        "  private String name;",
        "  public String getName() {",
        "    return name;",
        "  }",
        "}",
      ].join("\n");
      expect(classifyFileKind(text, "Java")).toBe("logic");
    });
  });

  it("is stable for the same input", () => {
    const text = "export interface A { x: number }\n";
    expect(classifyFileKind(text, "TypeScript")).toBe(
      classifyFileKind(text, "TypeScript"),
    );
  });
});
