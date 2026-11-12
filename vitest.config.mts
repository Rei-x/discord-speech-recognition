import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 20000,
    include: ["tests/**/*.test.ts"],
    // Integration tests share the same two bots, so they can't run at the same time
    fileParallelism: false,
    coverage: {
      include: ["src/**/*.ts"],
    },
  },
});
