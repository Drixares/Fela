import { call } from "@orpc/server";

import { base } from "../../context.js";
import {
  archiveAccountBase,
  archiveAccountHandler,
} from "./mutations/archive-account.js";
import {
  createAccountBase,
  createAccountHandler,
} from "./mutations/create-account.js";
import {
  updateAccountBase,
  updateAccountHandler,
} from "./mutations/update-account.js";
import {
  listAccountsBase,
  listAccountsHandler,
} from "./queries/list-accounts.js";

/**
 * Account procedures — the ledger's foundational slice (see the V1 PRD, #1).
 * Every balance returned is derived (opening balance + signed sum of the
 * account's transactions), never stored, so it can never drift from the ledger.
 */
export const accountsRouter = base.router({
  list: listAccountsBase
    .route({ method: "GET" })
    .handler(async ({ context, input }) => {
      return await call(listAccountsHandler, input, { context });
    }),

  create: createAccountBase.handler(async ({ context, input }) => {
    return await call(createAccountHandler, input, { context });
  }),

  update: updateAccountBase.handler(async ({ context, input }) => {
    return await call(updateAccountHandler, input, { context });
  }),

  archive: archiveAccountBase.handler(async ({ context, input }) => {
    return await call(archiveAccountHandler, input, { context });
  }),
});
