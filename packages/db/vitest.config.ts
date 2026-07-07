import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These tests load `better-sqlite3`, a native module built against
    // Electron's ABI (see `vitest.mjs`). Run in a single forked worker so every
    // test shares one process whose ABI matches, rather than spawning many.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    include: ["src/**/*.test.ts"],
  },
});
