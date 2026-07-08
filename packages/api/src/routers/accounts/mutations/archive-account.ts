import { accounts } from "@repo/db";
import { eq } from "drizzle-orm";
import { base } from "src/context";

import { accountNotFound } from "../utils/account-not-found";
import { withBalance } from "../utils/with-balance";
import { archiveAccountSchema } from "../validators";

export const archiveAccountBase = base.input(archiveAccountSchema);

/**
 * Archive an account (default) or restore it. Archiving only flips a flag —
 * transactions are never touched — so the account's history stays intact for
 * past reports while it drops off the current overview.
 */
export const archiveAccountHandler = archiveAccountBase.handler(
  async ({ context, input }) => {
    const updated = context.db
      .update(accounts)
      .set({ archived: input.archived })
      .where(eq(accounts.id, input.id))
      .returning()
      .get();

    if (!updated) {
      throw accountNotFound(input.id);
    }

    return withBalance(context.db, updated);
  }
);
