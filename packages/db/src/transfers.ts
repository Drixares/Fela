import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Db } from "./index";
import { transactions } from "./schema";
import type { Transaction } from "./schema";

export interface TransferInput {
  fromAccountId: number;
  toAccountId: number;
  /** Amount to move, in minor units (cents). Must be strictly positive. */
  amount: number;
  date: Date;
  payee?: string;
  note?: string;
}

/**
 * Move money between two of the user's own accounts.
 *
 * A transfer is neither income nor expense, so it is recorded as two linked
 * legs sharing one `transferId`: a negative leg on the source account and a
 * positive leg on the destination. Both rows are inserted inside a single SQL
 * transaction, so a half-written transfer can never leave the balances wrong.
 *
 * @returns the shared `transferId` of the two created legs.
 * @throws if the amount is not positive or the two accounts are the same.
 */
export function createTransfer(db: Db, input: TransferInput): string {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Transfer amount must be a positive integer (minor units)");
  }
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Cannot transfer to the same account");
  }

  const transferId = randomUUID();

  db.transaction((tx) => {
    tx.insert(transactions)
      .values([
        {
          accountId: input.fromAccountId,
          amount: -input.amount,
          date: input.date,
          payee: input.payee,
          note: input.note,
          transferId,
        },
        {
          accountId: input.toAccountId,
          amount: input.amount,
          date: input.date,
          payee: input.payee,
          note: input.note,
          transferId,
        },
      ])
      .run();
  });

  return transferId;
}

export interface Transfer {
  transferId: string;
  /** Account the money left (the negative leg). */
  fromAccountId: number;
  /** Account the money arrived in (the positive leg). */
  toAccountId: number;
  /** Amount moved, in minor units (cents), always positive. */
  amount: number;
  date: Date;
  payee: string | null;
  note: string | null;
  /** The two underlying transaction rows, source leg first. */
  legs: [Transaction, Transaction];
}

/**
 * Reassemble a transfer from its two legs into a single object (source,
 * destination, amount) — the inverse of {@link createTransfer}. Useful for
 * display and for editing or deleting a transfer as one unit.
 *
 * @returns the transfer, or `null` if no legs exist for the id.
 * @throws if the legs are malformed (not exactly one negative and one
 *   positive row), which would indicate corrupted data.
 */
export function getTransfer(db: Db, transferId: string): Transfer | null {
  const legs = db
    .select()
    .from(transactions)
    .where(eq(transactions.transferId, transferId))
    .all();

  if (legs.length === 0) {
    return null;
  }

  const from = legs.find((leg) => leg.amount < 0);
  const to = legs.find((leg) => leg.amount > 0);

  if (legs.length !== 2 || !from || !to) {
    throw new Error(
      `Malformed transfer ${transferId}: expected one negative and one positive leg, got ${legs.length}`
    );
  }

  return {
    transferId,
    fromAccountId: from.accountId,
    toAccountId: to.accountId,
    amount: to.amount,
    date: from.date,
    payee: from.payee,
    note: from.note,
    legs: [from, to],
  };
}
