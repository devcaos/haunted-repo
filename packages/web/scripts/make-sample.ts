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

  const removeTempFiles = async (): Promise<void> => {
    for (const { target } of outputs) {
      await rm(`${target}.tmp`, { force: true });
    }
  };

  try {
    for (const { target, text } of outputs) {
      await writeFile(`${target}.tmp`, text, "utf8");
    }
  } catch (error) {
    await removeTempFiles();
    console.error("Could not write the sample files:", error);
    process.exitCode = 1;
    return;
  }

  const replaced: string[] = [];
  try {
    for (const { target } of outputs) {
      await rename(`${target}.tmp`, target);
      replaced.push(relative(process.cwd(), target));
      console.log(`Wrote ${relative(process.cwd(), target)}`);
    }
  } catch (error) {
    await removeTempFiles();
    console.error("Could not replace the sample files:", error);
    if (replaced.length > 0) {
      // The sample data is committed, so git can put the old files back.
      console.error(
        `The sample data is now mixed. Restore it with: git restore ${replaced.join(" ")}`,
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Requests by the detection client: ${requests.detection}`);
  console.log(`Requests by the download client: ${requests.downloads}`);
}

await main();
