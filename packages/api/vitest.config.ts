import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The test seam loads `better-sqlite3`, a native module built against
    // Electron's ABI. Run in a single forked worker so every test shares one
    // process whose ABI matches (see `vitest.mjs`), rather than spawning many.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    include: ["src/**/*.test.ts"],
  },
});
