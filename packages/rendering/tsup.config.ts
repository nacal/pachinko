import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    target: ["es2020"],
    outDir: "dist",
  },
  {
    entry: ["src/worker-entry.ts"],
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: true,
    target: ["es2020"],
    outDir: "dist",
  },
]);
