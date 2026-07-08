import { call } from "@orpc/server";

import { base } from "../../context.js";
import {
  bulkCategorizeBase,
  bulkCategorizeHandler,
} from "./mutations/bulk-categorize.js";
import {
  createTransactionBase,
  createTransactionHandler,
} from "./mutations/create-transaction.js";
import {
  deleteTransactionBase,
  deleteTransactionHandler,
} from "./mutations/delete-transaction.js";
import {
  updateTransactionBase,
  updateTransactionHandler,
} from "./mutations/update-transaction.js";
import {
  listTransactionsBase,
  listTransactionsHandler,
} from "./queries/list-transactions.js";

/**
 * Transaction procedures — manual ledger entry (see the V1 PRD, #1, and issue
 * #6). The renderer only displays; every movement is created, edited and
 * removed here, and because balances are always derived from the signed sum of
 * these rows (see `getAccountBalance`), each write is reflected in the affected
 * account's balance immediately, with no cached total to keep in sync.
 */
export const transactionsRouter = base.router({
  list: listTransactionsBase.handler(async ({ context, input }) => {
    return await call(listTransactionsHandler, input, { context });
  }),

  bulkCategorize: bulkCategorizeBase.handler(async ({ context, input }) => {
    return await call(bulkCategorizeHandler, input, { context });
  }),

  create: createTransactionBase.handler(async ({ context, input }) => {
    return await call(createTransactionHandler, input, { context });
  }),

  update: updateTransactionBase.handler(async ({ context, input }) => {
    return await call(updateTransactionHandler, input, { context });
  }),

  delete: deleteTransactionBase.handler(async ({ context, input }) => {
    return await call(deleteTransactionHandler, input, { context });
  }),
});
