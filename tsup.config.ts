import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["cjs", "esm"],
    target: "node14",
    splitting: false,
    sourcemap: false,
    clean: true,
    minify: false,
    dts: true,
    outDir: "dist",
  },
]);