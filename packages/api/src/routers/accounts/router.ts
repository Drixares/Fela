import { ORPCError } from "@orpc/server";
import { accounts, getAccountBalance, getAccountBalances } from "@repo/db";
import type { Account, Db } from "@repo/db";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { ACCOUNT_TYPES } from "../../client.js";
import { base } from "../../context.js";

/** An account row plus its derived balance — the shape the renderer consumes. */
type AccountWithBalance = Account & { balance: number };

const accountTypeSchema = z.enum(ACCOUNT_TYPES);
const nameSchema = z.string().trim().min(1).max(100);
// Opening balance in minor units (cents); may be negative (e.g. an overdraft).
const balanceSchema = z.int();
const idSchema = z.int().positive();

/** Attach the derived balance to an account row already read from the db. */
function withBalance(db: Db, account: Account): AccountWithBalance {
  return { ...account, balance: getAccountBalance(db, account.id) };
}

const notFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No account with id ${id}` });

/**
 * Account procedures — the ledger's foundational slice (see the V1 PRD, #1).
 * Every balance returned is derived (opening balance + signed sum of the
 * account's transactions), never stored, so it can never drift from the ledger.
 */
export const accountsRouter = base.router({
  /**
   * Every account with its current balance, computed in a single grouped query.
   * Archived accounts are hidden by default so the overview stays focused on
   * live accounts; pass `includeArchived` to bring them back for past reports.
   */
  list: base
    .input(z.object({ includeArchived: z.boolean().default(false) }).optional())
    .handler(async ({ context, input }): Promise<AccountWithBalance[]> => {
      const rows = await context.db
        .select()
        .from(accounts)
        .orderBy(asc(accounts.name))
        .all();

      const balances = new Map(
        getAccountBalances(context.db).map((b) => [b.accountId, b.balance])
      );

      return rows
        .filter((account) => input?.includeArchived || !account.archived)
        .map((account) => ({
          ...account,
          balance: balances.get(account.id) ?? account.initialBalance,
        }));
    }),

  /**
   * Create an account. The opening balance defaults to zero; the returned
   * `balance` equals it since a fresh account has no transactions yet.
   */
  create: base
    .input(
      z.object({
        name: nameSchema,
        type: accountTypeSchema,
        initialBalance: balanceSchema.default(0),
      })
    )
    .handler(async ({ context, input }): Promise<AccountWithBalance> => {
      const created = context.db
        .insert(accounts)
        .values({
          name: input.name,
          type: input.type,
          initialBalance: input.initialBalance,
        })
        .returning()
        .get();

      return { ...created, balance: created.initialBalance };
    }),

  /**
   * Edit an account's name, type and/or opening balance. Only the fields sent
   * are touched; the balance is re-derived from the (possibly new) opening
   * balance and the existing transactions.
   */
  update: base
    .input(
      z.object({
        id: idSchema,
        name: nameSchema.optional(),
        type: accountTypeSchema.optional(),
        initialBalance: balanceSchema.optional(),
      })
    )
    .handler(async ({ context, input }): Promise<AccountWithBalance> => {
      const { id, ...changes } = input;

      // With no fields to change, skip the write (an empty `.set({})` is an
      // error) and just read the account back — still a 404 if it is gone.
      const updated =
        Object.keys(changes).length === 0
          ? context.db.select().from(accounts).where(eq(accounts.id, id)).get()
          : context.db
              .update(accounts)
              .set(changes)
              .where(eq(accounts.id, id))
              .returning()
              .get();

      if (!updated) {
        throw notFound(id);
      }

      return withBalance(context.db, updated);
    }),

  /**
   * Archive an account (default) or restore it. Archiving only flips a flag —
   * transactions are never touched — so the account's history stays intact for
   * past reports while it drops off the current overview.
   */
  archive: base
    .input(z.object({ id: idSchema, archived: z.boolean().default(true) }))
    .handler(async ({ context, input }): Promise<AccountWithBalance> => {
      const updated = context.db
        .update(accounts)
        .set({ archived: input.archived })
        .where(eq(accounts.id, input.id))
        .returning()
        .get();

      if (!updated) {
        throw notFound(input.id);
      }

      return withBalance(context.db, updated);
    }),
});
