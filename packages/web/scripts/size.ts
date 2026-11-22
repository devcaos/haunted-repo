// Run with: npm run size   (root script, part of npm run check)
// I/O only: the rules live in ../src/tooling/distRules.ts.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import {
  MISSING_DIST_MESSAGE,
  checkDist,
  formatReport,
  type DistFile,
} from "../src/tooling/distRules.ts";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const TEXT_FILE = /\.(?:html|css|svg|js)$/i;

if (!existsSync(dist)) {
  console.error(MISSING_DIST_MESSAGE);
  process.exit(1);
}

const files: DistFile[] = [];
for (const name of readdirSync(dist, { recursive: true, encoding: "utf8" })) {
  const full = join(dist, name);
  if (!statSync(full).isFile()) continue;
  const bytes = readFileSync(full);
  const path = name.replaceAll("\\", "/");
  const file: DistFile = { path, gzipBytes: gzipSync(bytes).length };
  if (TEXT_FILE.test(path)) file.text = bytes.toString("utf8");
  files.push(file);
}

const report = checkDist(files);
const lines = formatReport(report);
for (const line of lines) console.log(line);
process.exit(report.problems.length === 0 ? 0 : 1);
