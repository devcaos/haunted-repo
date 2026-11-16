import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@haunted-repo/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      // Test helpers of core for Power tests (kiro-power design section 3).
      // Works like @rollup/plugin-alias: "core-testutil/x" becomes
      // "<core src>/x", so the key has no trailing slash.
      "core-testutil": fileURLToPath(
        new URL("./packages/core/src", import.meta.url),
      ),
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.live.test.ts"],
  },
});
