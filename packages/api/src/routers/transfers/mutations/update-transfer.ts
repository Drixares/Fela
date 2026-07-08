import { ORPCError } from "@orpc/server";
import { getTransfer, updateTransfer } from "@repo/db";
import { base } from "src/context";

import { assertAccountExists } from "../utils/assert-account-exists";
import { normalizeText } from "../utils/normalize-text";
import { transferNotFound } from "../utils/transfer-not-found";
import { updateTransferSchema } from "../validators";

export const updateTransferBase = base.input(updateTransferSchema);

/**
 * Edit an existing transfer. Only the fields sent are touched; the two legs
 * are rewritten together so they stay coherent. The resulting source and
 * destination must be two distinct, existing accounts. Moving or re-sizing the
 * transfer re-derives both accounts' balances on the next read.
 */
export const updateTransferHandler = updateTransferBase.handler(
  async ({ context, input }) => {
    const current = getTransfer(context.db, input.transferId);
    if (!current) {
      throw transferNotFound(input.transferId);
    }

    // Resolve the effective accounts (fall back to the current legs) so the
    // distinctness and existence checks run against what the edit will store.
    const fromAccountId = input.fromAccountId ?? current.fromAccountId;
    const toAccountId = input.toAccountId ?? current.toAccountId;
    if (fromAccountId === toAccountId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot transfer to the same account",
      });
    }
    if (input.fromAccountId !== undefined) {
      assertAccountExists(context.db, input.fromAccountId);
    }
    if (input.toAccountId !== undefined) {
      assertAccountExists(context.db, input.toAccountId);
    }

    const updated = updateTransfer(context.db, input.transferId, {
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      date: input.date,
      payee: input.payee !== undefined ? normalizeText(input.payee) : undefined,
      note: input.note !== undefined ? normalizeText(input.note) : undefined,
    });

    // getTransfer above proved the transfer exists; the edit can only return it.
    return updated!;
  }
);
