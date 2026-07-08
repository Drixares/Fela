import { categorizationRules } from "@repo/db";
import { asc } from "drizzle-orm";
import { base } from "src/context";

/** Every rule, in application order — the shape the rules screen renders. */
export const listRulesHandler = base.handler(async ({ context }) => {
  return context.db
    .select()
    .from(categorizationRules)
    .orderBy(asc(categorizationRules.sortOrder), asc(categorizationRules.id))
    .all();
});
