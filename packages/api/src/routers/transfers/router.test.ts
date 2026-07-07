import { call } from "@orpc/server";
import { expect, test } from "vitest";

import type { ServerContext } from "../../context.js";
import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/** Create an account and return its id — a fixture for the transfer tests. */
async function makeAccount(
  context: ServerContext,
  name = "Compte courant",
  initialBalance = 10_000
): Promise<number> {
  const account = await call(
    appRouter.accounts.create,
    { name, type: "checking", initialBalance },
    { context }
  );
  return account.id;
}

/** The balance of a single account, read back through the accounts list. */
async function balanceOf(
  context: ServerContext,
  accountId: number
): Promise<number> {
  const accounts = await call(appRouter.accounts.list, undefined, { context });
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`No account ${accountId} in list`);
  return account.balance;
}

test("transfers.create moves money as two coherent, category-less legs", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 10_000);
  const to = await makeAccount(context, "Livret", 0);

  const transfer = await call(
    appRouter.transfers.create,
    {
      fromAccountId: from,
      toAccountId: to,
      amount: 3_000,
      date: new Date("2026-03-01"),
      payee: "Épargne",
    },
    { context }
  );

  expect(transfer).toMatchObject({
    fromAccountId: from,
    toAccountId: to,
    amount: 3_000,
  });
  expect(transfer.transferId).toBeTruthy();

  // The money left one account and arrived in the other, balancing out.
  expect(await balanceOf(context, from)).toBe(7_000);
  expect(await balanceOf(context, to)).toBe(3_000);

  // Two linked legs, sharing the id, neither filed under a category.
  const legs = await call(appRouter.transactions.list, undefined, { context });
  expect(legs).toHaveLength(2);
  expect(legs.every((leg) => leg.transferId === transfer.transferId)).toBe(
    true
  );
  expect(legs.every((leg) => leg.categoryId === null)).toBe(true);
  const source = legs.find((leg) => leg.accountId === from);
  const dest = legs.find((leg) => leg.accountId === to);
  expect(source?.amount).toBe(-3_000);
  expect(dest?.amount).toBe(3_000);
});

test("transfers.create rejects same account, unknown account and a non-positive amount, writing nothing", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 10_000);
  const to = await makeAccount(context, "Livret", 0);

  // Same source and destination.
  await expect(
    call(
      appRouter.transfers.create,
      {
        fromAccountId: from,
        toAccountId: from,
        amount: 1_000,
        date: new Date(),
      },
      { context }
    )
  ).rejects.toThrow();

  // Unknown destination account.
  await expect(
    call(
      appRouter.transfers.create,
      {
        fromAccountId: from,
        toAccountId: 999,
        amount: 1_000,
        date: new Date(),
      },
      { context }
    )
  ).rejects.toThrow();

  // Non-positive amount.
  await expect(
    call(
      appRouter.transfers.create,
      { fromAccountId: from, toAccountId: to, amount: 0, date: new Date() },
      { context }
    )
  ).rejects.toThrow();

  // None of the rejected attempts wrote a row, and both balances are untouched.
  const legs = await call(appRouter.transactions.list, undefined, { context });
  expect(legs).toHaveLength(0);
  expect(await balanceOf(context, from)).toBe(10_000);
  expect(await balanceOf(context, to)).toBe(0);
});

test("transfers.update changes both legs atomically and leaves no orphan", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 10_000);
  const to = await makeAccount(context, "Livret", 0);
  const other = await makeAccount(context, "Espèces", 0);

  const transfer = await call(
    appRouter.transfers.create,
    {
      fromAccountId: from,
      toAccountId: to,
      amount: 3_000,
      date: new Date("2026-03-01"),
    },
    { context }
  );

  // Raise the amount and redirect the destination to a third account.
  const updated = await call(
    appRouter.transfers.update,
    {
      transferId: transfer.transferId,
      toAccountId: other,
      amount: 5_000,
      payee: "Loyer",
    },
    { context }
  );

  expect(updated).toMatchObject({
    transferId: transfer.transferId,
    fromAccountId: from,
    toAccountId: other,
    amount: 5_000,
    payee: "Loyer",
  });

  // Exactly two legs still share the id — one negative on the (unchanged)
  // source, one positive on the new destination; the old one no longer moves.
  const legs = await call(appRouter.transactions.list, undefined, { context });
  expect(legs.filter((l) => l.transferId === transfer.transferId)).toHaveLength(
    2
  );
  expect(await balanceOf(context, from)).toBe(5_000);
  expect(await balanceOf(context, other)).toBe(5_000);
  expect(await balanceOf(context, to)).toBe(0);
});

test("transfers.update rejects a same-account or unknown-account edit, writing nothing", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 10_000);
  const to = await makeAccount(context, "Livret", 0);

  const transfer = await call(
    appRouter.transfers.create,
    {
      fromAccountId: from,
      toAccountId: to,
      amount: 3_000,
      date: new Date("2026-03-01"),
    },
    { context }
  );

  // Collapsing both legs onto one account is refused.
  await expect(
    call(
      appRouter.transfers.update,
      { transferId: transfer.transferId, toAccountId: from },
      { context }
    )
  ).rejects.toThrow();

  // Pointing a leg at an account that does not exist is refused.
  await expect(
    call(
      appRouter.transfers.update,
      { transferId: transfer.transferId, toAccountId: 999 },
      { context }
    )
  ).rejects.toThrow();

  // A rejected edit writes nothing: the two legs are byte-for-byte as created —
  // same count, accounts, amounts and no category — so neither is left orphaned
  // or half-updated, and both balances still hold.
  const legs = await call(appRouter.transactions.list, undefined, { context });
  expect(legs.filter((l) => l.transferId === transfer.transferId)).toHaveLength(
    2
  );
  expect(legs.every((l) => l.categoryId === null)).toBe(true);
  const source = legs.find((l) => l.accountId === from);
  const dest = legs.find((l) => l.accountId === to);
  expect(source?.amount).toBe(-3_000);
  expect(dest?.amount).toBe(3_000);
  expect(await balanceOf(context, from)).toBe(7_000);
  expect(await balanceOf(context, to)).toBe(3_000);
});

test("transfers.update on a missing transfer rejects", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.transfers.update,
      { transferId: "does-not-exist", amount: 1_000 },
      { context }
    )
  ).rejects.toThrow();
});

test("transfers.delete removes both legs and restores the balances", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 10_000);
  const to = await makeAccount(context, "Livret", 0);

  const transfer = await call(
    appRouter.transfers.create,
    {
      fromAccountId: from,
      toAccountId: to,
      amount: 3_000,
      date: new Date("2026-03-01"),
    },
    { context }
  );

  const result = await call(
    appRouter.transfers.delete,
    { transferId: transfer.transferId },
    { context }
  );
  expect(result).toEqual({ transferId: transfer.transferId });

  // Both legs are gone — no orphan left behind — and the balances are as before.
  const legs = await call(appRouter.transactions.list, undefined, { context });
  expect(legs).toHaveLength(0);
  expect(await balanceOf(context, from)).toBe(10_000);
  expect(await balanceOf(context, to)).toBe(0);
});

test("transfers.delete on a missing transfer rejects", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.transfers.delete,
      { transferId: "does-not-exist" },
      { context }
    )
  ).rejects.toThrow();
});
