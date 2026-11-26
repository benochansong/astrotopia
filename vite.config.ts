import { defineConfig } from "vitest/config";
export default defineConfig({
  base: "./",
  test: { include: ["tests/**/*.test.ts"] },
  build: {
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
    chunkSizeWarningLimit: 1500,
  },
});
