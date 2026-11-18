// Pure rules of the dist size check (`npm run size`) and of the external
// address scan. No relative import and no Node import: `scripts/size.ts`
// imports this file under Node's type stripping, and `source.test.ts` too.

// Namespace names, not loads. The C2PA one is declared by the provenance
// block of the scene illustration (house-scene.svg), which is kept as it is.
export const SVG_NAMESPACES = [
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
  "http://c2pa.org/manifest",
];
const FULL_ADDRESS = /https?:\/\//i;
const PROTOCOL_RELATIVE = [
  /\burl\(\s*["']?\s*\/\//i,
  /@import\s+(?:url\(\s*)?["']?\s*\/\//i,
  /\b(?:src|href)\s*[=:]\s*["'`]?\s*\/\//i,
  /["'](?:src|href)["']\s*,\s*["'`]\s*\/\//i,
];

/** True when the text loads or links anything outside the site. */
export function hasExternalAddress(text: string): boolean {
  // Only a whole quoted namespace is removed, so "<ns>/a.png" is still caught.
  const rest = SVG_NAMESPACES.reduce(
    (t, ns) => t.replaceAll(`"${ns}"`, '""').replaceAll(`'${ns}'`, "''"),
    text,
  );
  return FULL_ADDRESS.test(rest) || PROTOCOL_RELATIVE.some((p) => p.test(rest));
}

export const SIZE_LIMIT = 307_200;
export const COUNTED_EXTENSIONS = [
  ".js",
  ".css",
  ".svg",
  ".woff2",
  ".woff",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
];
const ADDRESS_EXTENSIONS = [".html", ".css", ".svg"];
export const GALLERY_MARKER = "data-scenic-gallery";
export const MISSING_DIST_MESSAGE =
  "packages/web/dist was not found. Run npm run build first.";

/** One file of dist. `gzipBytes` is its gzipped size; `text` is set for text files. */
export interface DistFile {
  path: string; // relative to dist, with "/"
  gzipBytes: number;
  text?: string;
}

export interface CountedFile {
  path: string;
  bytes: number;
}

export interface DistReport {
  total: number;
  limit: number;
  counted: CountedFile[]; // largest first
  problems: string[];
}

function hasExtension(path: string, list: readonly string[]): boolean {
  const lower = path.toLowerCase();
  return list.some((ext) => lower.endsWith(ext));
}

export function checkDist(files: readonly DistFile[]): DistReport {
  const counted = files
    .filter((f) => hasExtension(f.path, COUNTED_EXTENSIONS))
    .map((f) => ({ path: f.path, bytes: f.gzipBytes }))
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  const total = counted.reduce((sum, f) => sum + f.bytes, 0);
  const problems: string[] = [];
  if (total >= SIZE_LIMIT) {
    problems.push(
      `Over the budget: ${formatBytes(total)} bytes gzipped, the limit is ${formatBytes(SIZE_LIMIT)}.`,
    );
  }
  for (const file of files) {
    const text = file.text ?? "";
    if (
      hasExtension(file.path, ADDRESS_EXTENSIONS) &&
      hasExternalAddress(text)
    ) {
      problems.push(`External address in ${file.path}.`);
    }
    if (/gallery/i.test(file.path) || text.includes(GALLERY_MARKER)) {
      problems.push(`Gallery code found in dist: ${file.path}.`);
    }
    if (file.path === "index.html" && /rel=["']?stylesheet/i.test(text)) {
      problems.push('index.html has rel="stylesheet".');
    }
  }
  return { total, limit: SIZE_LIMIT, counted, problems };
}

export function formatBytes(n: number): string {
  return n.toLocaleString("en-US");
}

/** The lines `npm run size` prints, pass or fail. */
export function formatReport(report: DistReport): string[] {
  return [
    `Size check: ${formatBytes(report.total)} bytes gzipped (limit ${formatBytes(report.limit)}).`,
    ...report.counted.map((f) => `  ${formatBytes(f.bytes)}  ${f.path}`),
    ...report.problems,
  ];
}
