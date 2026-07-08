import { call } from "@orpc/server";

import { base } from "../../context.js";
import {
  createTransferBase,
  createTransferHandler,
} from "./mutations/create-transfer.js";
import {
  deleteTransferBase,
  deleteTransferHandler,
} from "./mutations/delete-transfer.js";
import {
  updateTransferBase,
  updateTransferHandler,
} from "./mutations/update-transfer.js";

/**
 * Transfer procedures — move money between two of the user's own accounts as a
 * single unit (see the V1 PRD, #1, and issue #7). A transfer is neither income
 * nor expense: it is two linked legs sharing one `transferId` (a negative leg on
 * the source, a positive leg on the destination), carrying no category. The db
 * helpers (`createTransfer`, `updateTransfer`, `deleteTransfer`) write both legs
 * inside one SQL transaction, so a half-written transfer can never leave a leg
 * orphaned or the balances wrong; these procedures add the account checks and
 * map failures to typed oRPC errors. Balances are always re-derived from the
 * signed sum of the underlying rows, so every write shows up immediately.
 */
export const transfersRouter = base.router({
  create: createTransferBase.handler(async ({ context, input }) => {
    return await call(createTransferHandler, input, { context });
  }),

  update: updateTransferBase.handler(async ({ context, input }) => {
    return await call(updateTransferHandler, input, { context });
  }),

  delete: deleteTransferBase.handler(async ({ context, input }) => {
    return await call(deleteTransferHandler, input, { context });
  }),
});
