import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/worker-entry.ts"],
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
