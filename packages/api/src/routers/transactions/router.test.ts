import { call } from "@orpc/server";
import { createTransfer } from "@repo/db";
import { expect, test } from "vitest";

import type { ServerContext } from "../../context.js";
import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/** Create an account and return its id — a fixture for the transaction tests. */
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

test("transactions.create records an outflow and drops the account balance", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context); // opens at 100.00 €

  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_500, // -25.00 € expense
      date: new Date("2026-03-01"),
      payee: "Carrefour",
    },
    { context }
  );

  expect(tx).toMatchObject({
    accountId,
    amount: -2_500,
    payee: "Carrefour",
    categoryId: null,
    note: null,
    accountName: "Compte courant",
    categoryName: null,
  });
  expect(tx.id).toBeGreaterThan(0);

  // The account balance reflects the entry immediately.
  expect(await balanceOf(context, accountId)).toBe(7_500);
});

test("transactions.create records an inflow with a category and resolves its name", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const group = await call(
    appRouter.categories.createGroup,
    { name: "Revenus" },
    { context }
  );
  const category = await call(
    appRouter.categories.create,
    { name: "Salaire", kind: "income", groupId: group.id },
    { context }
  );

  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: 250_000,
      date: new Date("2026-03-05"),
      payee: "Employeur",
      categoryId: category.id,
      note: "Mars",
    },
    { context }
  );

  expect(tx).toMatchObject({
    amount: 250_000,
    categoryId: category.id,
    categoryName: "Salaire",
    note: "Mars",
  });
  expect(await balanceOf(context, accountId)).toBe(260_000);
});

test("transactions.create blank payee and note are stored as null", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const tx = await call(
    appRouter.transactions.create,
    { accountId, amount: -1_000, date: new Date("2026-03-01"), payee: "  " },
    { context }
  );

  expect(tx.payee).toBeNull();
  expect(tx.note).toBeNull();
});

test("transactions.create rejects an unknown account, unknown category and a zero amount", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await expect(
    call(
      appRouter.transactions.create,
      { accountId: 999, amount: -1_000, date: new Date() },
      { context }
    )
  ).rejects.toThrow();

  await expect(
    call(
      appRouter.transactions.create,
      { accountId, amount: -1_000, date: new Date(), categoryId: 999 },
      { context }
    )
  ).rejects.toThrow();

  await expect(
    call(
      appRouter.transactions.create,
      { accountId, amount: 0, date: new Date() },
      { context }
    )
  ).rejects.toThrow();
});

test("transactions.list returns every account's transactions, most recent first", async () => {
  const context = createTestContext();
  const checking = await makeAccount(context, "Compte courant");
  const cash = await makeAccount(context, "Espèces", 5_000);

  await call(
    appRouter.transactions.create,
    {
      accountId: checking,
      amount: -2_500,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId: cash,
      amount: -800,
      date: new Date("2026-03-03"),
      payee: "Boulangerie",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId: checking,
      amount: 4_000,
      date: new Date("2026-03-02"),
      payee: "Remboursement",
    },
    { context }
  );

  const all = await call(appRouter.transactions.list, undefined, { context });
  expect(all.map((t) => t.payee)).toEqual([
    "Boulangerie", // 03-03
    "Remboursement", // 03-02
    "Carrefour", // 03-01
  ]);
  // Rows from every account carry their account's name for display.
  expect(all.find((t) => t.payee === "Boulangerie")?.accountName).toBe(
    "Espèces"
  );

  // Filtered to a single account, only that account's rows come back.
  const checkingOnly = await call(
    appRouter.transactions.list,
    { accountId: checking },
    { context }
  );
  expect(checkingOnly.map((t) => t.payee)).toEqual([
    "Remboursement",
    "Carrefour",
  ]);
});

test("transactions.update changes fields, moves the entry and re-derives the balance", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context); // 100.00 €
  const other = await makeAccount(context, "Livret", 0);

  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_500,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
    },
    { context }
  );
  expect(await balanceOf(context, accountId)).toBe(7_500);

  const updated = await call(
    appRouter.transactions.update,
    {
      id: tx.id,
      amount: -4_000,
      payee: "Auchan",
      note: "Courses de la semaine",
    },
    { context }
  );

  expect(updated).toMatchObject({
    id: tx.id,
    amount: -4_000,
    payee: "Auchan",
    note: "Courses de la semaine",
  });
  // 100.00 € − 40.00 €
  expect(await balanceOf(context, accountId)).toBe(6_000);

  // Moving the entry to another account shifts the balance to it.
  await call(
    appRouter.transactions.update,
    { id: tx.id, accountId: other },
    { context }
  );
  expect(await balanceOf(context, accountId)).toBe(10_000);
  expect(await balanceOf(context, other)).toBe(-4_000);
});

test("transactions.update can clear the category and the payee", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const category = await call(
    appRouter.categories.create,
    { name: "Courses", kind: "expense" },
    { context }
  );

  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_500,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
      categoryId: category.id,
    },
    { context }
  );

  const cleared = await call(
    appRouter.transactions.update,
    { id: tx.id, categoryId: null, payee: null },
    { context }
  );

  expect(cleared.categoryId).toBeNull();
  expect(cleared.categoryName).toBeNull();
  expect(cleared.payee).toBeNull();
});

test("transactions.update on a missing transaction rejects", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.transactions.update,
      { id: 999, amount: -1_000 },
      { context }
    )
  ).rejects.toThrow();
});

test("transactions.delete removes the entry and restores the balance", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_500,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
    },
    { context }
  );
  expect(await balanceOf(context, accountId)).toBe(7_500);

  const result = await call(
    appRouter.transactions.delete,
    { id: tx.id },
    { context }
  );
  expect(result).toEqual({ id: tx.id });

  expect(await balanceOf(context, accountId)).toBe(10_000);
  const list = await call(appRouter.transactions.list, undefined, { context });
  expect(list).toHaveLength(0);
});

test("transactions.delete on a missing transaction rejects", async () => {
  const context = createTestContext();

  await expect(
    call(appRouter.transactions.delete, { id: 999 }, { context })
  ).rejects.toThrow();
});

test("the full manual cycle keeps the balance in step at every stage", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context, "Espèces", 0);

  // Saisie
  const tx = await call(
    appRouter.transactions.create,
    { accountId, amount: -1_500, date: new Date("2026-03-01"), payee: "Tabac" },
    { context }
  );
  expect(await balanceOf(context, accountId)).toBe(-1_500);

  // Modification
  await call(
    appRouter.transactions.update,
    { id: tx.id, amount: -2_000 },
    { context }
  );
  expect(await balanceOf(context, accountId)).toBe(-2_000);

  // Suppression
  await call(appRouter.transactions.delete, { id: tx.id }, { context });
  expect(await balanceOf(context, accountId)).toBe(0);
});

test("transactions.update and delete refuse to touch a transfer leg", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 10_000);
  const to = await makeAccount(context, "Livret", 0);

  createTransfer(context.db, {
    fromAccountId: from,
    toAccountId: to,
    amount: 3_000,
    date: new Date("2026-03-01"),
  });

  const legs = await call(appRouter.transactions.list, undefined, { context });
  expect(legs).toHaveLength(2);

  for (const leg of legs) {
    await expect(
      call(
        appRouter.transactions.update,
        { id: leg.id, amount: -1 },
        { context }
      )
    ).rejects.toThrow();
    await expect(
      call(appRouter.transactions.delete, { id: leg.id }, { context })
    ).rejects.toThrow();
  }

  // The transfer is left intact — both balances still reflect it.
  expect(await balanceOf(context, from)).toBe(7_000);
  expect(await balanceOf(context, to)).toBe(3_000);
});
