import { deleteTransfer } from "@repo/db";
import { base } from "src/context";

import { transferNotFound } from "../utils/transfer-not-found";
import { deleteTransferSchema } from "../validators";

export const deleteTransferBase = base.input(deleteTransferSchema);

/**
 * Delete a transfer. Both legs are removed together, so no orphaned leg is
 * ever left behind, and both accounts' balances are re-derived on the next
 * read. Rejects if no transfer has that id.
 */
export const deleteTransferHandler = deleteTransferBase.handler(
  async ({ context, input }) => {
    const deleted = deleteTransfer(context.db, input.transferId);
    if (!deleted) {
      throw transferNotFound(input.transferId);
    }
    return { transferId: input.transferId };
  }
);
