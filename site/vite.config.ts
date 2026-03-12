import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/pachinko/",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        demo: resolve(__dirname, "demo/index.html"),
        api: resolve(__dirname, "api/index.html"),
      },
    },
  },
});
