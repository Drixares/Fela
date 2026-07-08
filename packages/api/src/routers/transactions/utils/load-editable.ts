import { ORPCError } from "@orpc/server";
import type { Db, Transaction } from "@repo/db";
import { transactions } from "@repo/db";
import { eq } from "drizzle-orm";

import { transactionNotFound } from "./not-found";

/**
 * Load a plain (non-transfer) transaction by id, or throw. A transfer is stored
 * as two linked legs sharing a `transferId`; editing or deleting a single leg
 * would unbalance the transfer, so the CRUD procedures refuse to touch one and
 * transfers must be managed as a unit (see `createTransfer` in @repo/db).
 */
export function loadEditable(db: Db, id: number): Transaction {
  const tx = db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();

  if (!tx) {
    throw transactionNotFound(id);
  }
  if (tx.transferId !== null) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cannot edit or delete a transfer leg directly",
    });
  }
  return tx;
}
