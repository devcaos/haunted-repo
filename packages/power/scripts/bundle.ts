// Builds bundle/server.mjs: one ESM file with our code, the MCP SDK, zod and
// @haunted-repo/core inside it, so Kiro can run it from a plain copy of the
// Power folder, with no node_modules (design section 2). Node 24 runs this
// file directly.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// The package folder, so relative paths work from any working directory.
const packageDir = fileURLToPath(new URL("..", import.meta.url));

await build({
  absWorkingDir: packageDir,
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outfile: "bundle/server.mjs",
  minify: false,
  legalComments: "none",
  sourcemap: false,
  // Bundle core from its source, not from packages/core/dist/.
  alias: { "@haunted-repo/core": "../core/src/index.ts" },
  // Some libraries inside the SDK call require(); ESM has no require.
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  logLevel: "warning",
});
