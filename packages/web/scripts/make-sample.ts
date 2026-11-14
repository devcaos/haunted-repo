// Run with: npm run sample:make   (root script)
// Hand-run only: npm run check and npm test never run this file.
import { rename, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { makeSample } from "../src/sample/makeSample.ts";

const webRoot = fileURLToPath(new URL("..", import.meta.url));

async function main(): Promise<void> {
  // Uses Node's global fetch, no token.
  const result = await makeSample({});
  if (!result.ok) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }
  const { reportJson, filesJson, licenceText, requests } = result.value;
  const outputs = [
    { target: join(webRoot, "src", "sample", "report.json"), text: reportJson },
    { target: join(webRoot, "src", "sample", "files.json"), text: filesJson },
    { target: join(webRoot, "public", "sirv-license.txt"), text: licenceText },
  ];

  try {
    for (const { target, text } of outputs) {
      await writeFile(`${target}.tmp`, text, "utf8");
    }
  } catch (error) {
    for (const { target } of outputs) {
      await rm(`${target}.tmp`, { force: true });
    }
    console.error("Could not write the sample files:", error);
    process.exitCode = 1;
    return;
  }

  for (const { target } of outputs) {
    await rename(`${target}.tmp`, target);
    console.log(`Wrote ${relative(process.cwd(), target)}`);
  }
  console.log(`Requests by the detection client: ${requests.detection}`);
  console.log(`Requests by the download client: ${requests.downloads}`);
}

await main();
