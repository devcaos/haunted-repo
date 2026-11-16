import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["**/dist/", "**/node_modules/", "**/bundle/"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // The Power server talks MCP over stdout; a stray console call would break it.
    // Logs, if any, use process.stderr.write.
    files: ["packages/power/src/**/*.ts"],
    rules: { "no-console": "error" },
  },
  prettier, // last: turns off every rule that fights with Prettier
);
