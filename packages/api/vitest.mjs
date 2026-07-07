// Runs vitest through Electron's bundled Node runtime.
//
// The test seam builds a real `@repo/db` context, which loads `better-sqlite3`
// — a native module rebuilt against Electron's ABI (by the desktop app's
// `install-app-deps` postinstall). The system Node that would normally run
// vitest can't load that build. Launching Electron with ELECTRON_RUN_AS_NODE=1
// gives us a plain Node process whose ABI matches, so the driver loads cleanly.
// Vitest's forked workers inherit this env, so they load it too.
//
// Mirrors `packages/db/drizzle.mjs`. Usage: `node vitest.mjs <vitest args>`.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const electron = require("electron"); // resolves to the Electron executable path

// vitest ships its CLI entry as ./vitest.mjs next to its package.json.
const vitestBin = path.join(
  path.dirname(require.resolve("vitest/package.json")),
  "vitest.mjs"
);

const { status } = spawnSync(electron, [vitestBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
});

process.exit(status ?? 1);
