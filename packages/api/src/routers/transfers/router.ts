import { ORPCError } from "@orpc/server";
import {
  accounts,
  createTransfer,
  deleteTransfer,
  getTransfer,
  updateTransfer,
} from "@repo/db";
import type { Db } from "@repo/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { base } from "../../context.js";

const idSchema = z.int().positive();
// A transfer moves a strictly positive amount, in minor units (cents); the sign
// (which account loses, which gains) is carried by the two legs, not the input.
const amountSchema = z.int().positive();
// Free-text fields, shared by both legs; blank input collapses to null.
const payeeSchema = z.string().max(200).nullish();
const noteSchema = z.string().max(1000).nullish();
// A transferId is the shared uuid of the two legs (see createTransfer in @repo/db).
const transferIdSchema = z.string().min(1);

/** Trim a free-text field, collapsing an empty or whitespace-only value to null. */
function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Throw NOT_FOUND unless an account with `id` exists — guards create/update. */
function assertAccountExists(db: Db, id: number): void {
  const account = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  if (!account) {
    throw new ORPCError("NOT_FOUND", { message: `No account with id ${id}` });
  }
}

const transferNotFound = (id: string): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No transfer with id ${id}` });

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
  /**
   * Record a transfer between two distinct accounts. Both accounts must exist,
   * and the amount is a positive number of cents. Returns the reassembled
   * transfer (source, destination, amount) rather than the raw legs.
   */
  create: base
    .input(
      z.object({
        fromAccountId: idSchema,
        toAccountId: idSchema,
        amount: amountSchema,
        date: z.date(),
        payee: payeeSchema,
        note: noteSchema,
      })
    )
    .handler(async ({ context, input }) => {
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
    }),

  /**
   * Edit an existing transfer. Only the fields sent are touched; the two legs
   * are rewritten together so they stay coherent. The resulting source and
   * destination must be two distinct, existing accounts. Moving or re-sizing the
   * transfer re-derives both accounts' balances on the next read.
   */
  update: base
    .input(
      z.object({
        transferId: transferIdSchema,
        fromAccountId: idSchema.optional(),
        toAccountId: idSchema.optional(),
        amount: amountSchema.optional(),
        date: z.date().optional(),
        payee: payeeSchema,
        note: noteSchema,
      })
    )
    .handler(async ({ context, input }) => {
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
        payee:
          input.payee !== undefined ? normalizeText(input.payee) : undefined,
        note: input.note !== undefined ? normalizeText(input.note) : undefined,
      });

      // getTransfer above proved the transfer exists; the edit can only return it.
      return updated!;
    }),

  /**
   * Delete a transfer. Both legs are removed together, so no orphaned leg is
   * ever left behind, and both accounts' balances are re-derived on the next
   * read. Rejects if no transfer has that id.
   */
  delete: base
    .input(z.object({ transferId: transferIdSchema }))
    .handler(async ({ context, input }) => {
      const deleted = deleteTransfer(context.db, input.transferId);
      if (!deleted) {
        throw transferNotFound(input.transferId);
      }
      return { transferId: input.transferId };
    }),
});
