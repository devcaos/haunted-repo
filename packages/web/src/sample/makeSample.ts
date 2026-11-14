import { createGitHubClient, detectGhosts } from "@haunted-repo/core";
import type { Result } from "@haunted-repo/core";

// The single definition of the sample. sampleData.ts imports these from here.
export const SAMPLE_REPO_URL = "https://github.com/lukeed/sirv";
export const SAMPLE_SHA = "1135207e92c40354543cbd15c763c7a61d79d432";

const OWNER = "lukeed";
const REPO = "sirv";
const LICENCE_PATH = "license";

export interface SampleOutput {
  reportJson: string; // JSON.stringify(report, null, 2) + "\n"
  filesJson: string; // JSON.stringify({ copyright, texts }, null, 2) + "\n"
  licenceText: string; // the Licence_Text, unchanged
  requests: { detection: number; downloads: number }; // per Core client
}

/** First line whose trimmed text starts with "Copyright" (any case), trimmed; null if none. */
export function copyrightLineOf(licenceText: string): string | null {
  for (const line of licenceText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("copyright")) return trimmed;
  }
  return null;
}

/**
 * Runs detection at the Sample_SHA and downloads every ghost text and the licence.
 * Returns an error and no output if any step fails. Never writes files.
 */
export async function makeSample(opts: {
  fetch?: typeof fetch;
}): Promise<Result<SampleOutput, string>> {
  try {
    // detectGhosts does not expose its client, so its requests are counted here.
    let detection = 0;
    const countingFetch: typeof fetch = (input, init) => {
      detection++;
      return (opts.fetch ?? fetch)(input, init);
    };
    // `ref` is documented in Core as TEST ONLY. This hand-run script needs a fixed
    // commit so the committed sample never changes; Core is not changed.
    const detected = await detectGhosts(SAMPLE_REPO_URL, {
      ref: SAMPLE_SHA,
      fetch: countingFetch,
    });
    if (!detected.ok) {
      return {
        ok: false,
        error: `Detection failed (${detected.error.code}): ${detected.error.message}`,
      };
    }
    const report = detected.value;

    // A second client, with its own request budget, for the downloads.
    const client = createGitHubClient({ fetch: opts.fetch });
    const texts: Record<string, string> = {};
    for (const ghost of report.ghosts) {
      texts[ghost.path] = await client.getFileText(
        OWNER,
        REPO,
        SAMPLE_SHA,
        ghost.path,
      );
    }
    const licenceText = await client.getFileText(
      OWNER,
      REPO,
      SAMPLE_SHA,
      LICENCE_PATH,
    );
    const copyright = copyrightLineOf(licenceText);
    if (copyright === null) {
      return {
        ok: false,
        error: `The "${LICENCE_PATH}" file has no copyright line.`,
      };
    }
    return {
      ok: true,
      value: {
        reportJson: JSON.stringify(report, null, 2) + "\n",
        filesJson: JSON.stringify({ copyright, texts }, null, 2) + "\n",
        licenceText,
        requests: { detection, downloads: client.requestCount },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Could not make the sample: ${message}` };
  }
}
