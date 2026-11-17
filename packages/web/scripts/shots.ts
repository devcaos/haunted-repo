// Run with: npm run shots   (root script)
// Hand-run only: npm run check, npm test and CI never run this file.
// Needs Chromium for Playwright, installed once with:
//   npx playwright@1.65.1 install chromium
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

if (!existsSync(dist)) {
  console.error("packages/web/dist was not found. Run npm run build first.");
  process.exit(1);
}
