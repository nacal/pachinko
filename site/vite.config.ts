import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/pachinko/",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        demo: resolve(__dirname, "demo.html"),
        api: resolve(__dirname, "api.html"),
      },
    },
  },
});
