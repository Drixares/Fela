// Runs drizzle-kit through Electron's bundled Node runtime.
//
// `better-sqlite3` is a native module rebuilt against Electron's ABI (by the
// desktop app's `install-app-deps` postinstall), so it can't be loaded by the
// system Node that would normally run drizzle-kit. Launching Electron with
// ELECTRON_RUN_AS_NODE=1 gives us a plain Node process whose ABI matches that
// build, so drizzle-kit's better-sqlite3 driver loads cleanly.
//
// Usage: `node drizzle.mjs <drizzle-kit args>` (see the db:* package scripts).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const electron = require("electron"); // resolves to the Electron executable path

// drizzle-kit's exports map hides ./bin.cjs, so resolve it by hand from the
// hoisted node_modules root (derived from the Electron path).
const marker = `node_modules${path.sep}`;
const nodeModules = electron.slice(
  0,
  electron.lastIndexOf(marker) + marker.length
);
const drizzleKit = path.join(nodeModules, "drizzle-kit", "bin.cjs");

const { status } = spawnSync(electron, [drizzleKit, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
});

process.exit(status ?? 1);
