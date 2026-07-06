import { defineConfig } from "drizzle-kit";

/**
 * Config for `drizzle-kit push` / `studio` during development. This targets a
 * local `dev.db` file in this package — the shipped app opens its own database
 * under Electron's userData directory (see `createDb`).
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "./dev.db",
  },
});
