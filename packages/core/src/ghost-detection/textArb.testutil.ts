import fc from "fast-check";

const indentArb = fc
  .tuple(fc.nat(10), fc.nat(10))
  .map(([tabs, spaces]) => "\t".repeat(tabs) + " ".repeat(spaces));
const keywordArb = fc.constantFrom(
  "if",
  "elif",
  "for",
  "while",
  "switch",
  "case",
  "catch",
);
const plainArb = fc.string().filter((s) => !/[\r\n]/.test(s));

export const branchLineArb = fc
  .tuple(indentArb, keywordArb)
  .map(([indent, keyword]) => `${indent}${keyword} (x) {`);

export const lineArb = fc.oneof(
  plainArb,
  branchLineArb,
  fc.tuple(indentArb, plainArb).map(([indent, s]) => indent + s),
  plainArb.map((s) => `// ${s}`),
  plainArb.map((s) => `# ${s}`),
  plainArb.map((s) => `/* ${s}`),
  plainArb.map((s) => ` * ${s}`),
  fc.constantFrom(
    'import a from "b"',
    "from x import y",
    'const a = require("b")',
  ),
  fc.nat(100).map((n) => "x".repeat(501 + n)),
);

export const textArb = fc
  .array(lineArb, { maxLength: 40 })
  .map((lines) => lines.join("\n"));
