import { ORPCError } from "@orpc/server";
import { createTransfer, getTransfer } from "@repo/db";
import { base } from "src/context";

import { assertAccountExists } from "../utils/assert-account-exists";
import { normalizeText } from "../utils/normalize-text";
import { createTransferSchema } from "../validators";

export const createTransferBase = base.input(createTransferSchema);

/**
 * Record a transfer between two distinct accounts. Both accounts must exist,
 * and the amount is a positive number of cents. Returns the reassembled
 * transfer (source, destination, amount) rather than the raw legs.
 */
export const createTransferHandler = createTransferBase.handler(
  async ({ context, input }) => {
    if (input.fromAccountId === input.toAccountId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot transfer to the same account",
      });
    }
    assertAccountExists(context.db, input.fromAccountId);
    assertAccountExists(context.db, input.toAccountId);

    const transferId = createTransfer(context.db, {
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      date: input.date,
      payee: normalizeText(input.payee) ?? undefined,
      note: normalizeText(input.note) ?? undefined,
    });

    // createTransfer just wrote the two legs, so getTransfer cannot be null.
    return getTransfer(context.db, transferId)!;
  }
);
