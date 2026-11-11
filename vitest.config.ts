import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.live.test.ts"],
  },
});
