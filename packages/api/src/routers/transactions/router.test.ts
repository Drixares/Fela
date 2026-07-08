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
  expect(all.transactions.map((t) => t.payee)).toEqual([
    "Boulangerie", // 03-03
    "Remboursement", // 03-02
    "Carrefour", // 03-01
  ]);
  // Rows from every account carry their account's name for display.
  expect(
    all.transactions.find((t) => t.payee === "Boulangerie")?.accountName
  ).toBe("Espèces");

  // Filtered to a single account, only that account's rows come back.
  const checkingOnly = await call(
    appRouter.transactions.list,
    { accountId: checking },
    { context }
  );
  expect(checkingOnly.transactions.map((t) => t.payee)).toEqual([
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
  expect(list.transactions).toHaveLength(0);
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

/** Create an expense category and return its id — a fixture for the filter tests. */
async function makeCategory(
  context: ServerContext,
  name: string
): Promise<number> {
  const category = await call(
    appRouter.categories.create,
    { name, kind: "expense" },
    { context }
  );
  return category.id;
}

test("transactions.list search matches payee and note, ignoring case", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_000,
      date: new Date("2026-03-01"),
      payee: "Amazon Marketplace",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: 1_500,
      date: new Date("2026-03-02"),
      payee: "Employeur",
      note: "Remboursement Amazon",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -3_000,
      date: new Date("2026-03-03"),
      payee: "Carrefour",
    },
    { context }
  );

  const amazon = await call(
    appRouter.transactions.list,
    { search: "amazon" },
    { context }
  );
  expect(amazon.transactions.map((t) => t.payee)).toEqual([
    "Employeur", // matched through its note
    "Amazon Marketplace",
  ]);
  expect(amazon.count).toBe(2);
  expect(amazon.sum).toBe(-500);

  const carrefour = await call(
    appRouter.transactions.list,
    { search: "CARREFOUR" },
    { context }
  );
  expect(carrefour.transactions).toHaveLength(1);
});

test("transactions.list search treats LIKE wildcards literally", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -1_000,
      date: new Date("2026-03-01"),
      payee: "Promo 100%",
    },
    { context }
  );
  // Would match a raw `%100%%` LIKE pattern if `%` were left as a wildcard.
  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -1_000,
      date: new Date("2026-03-02"),
      payee: "Promo 1004",
    },
    { context }
  );

  const result = await call(
    appRouter.transactions.list,
    { search: "100%" },
    { context }
  );
  expect(result.transactions.map((t) => t.payee)).toEqual(["Promo 100%"]);
});

test("transactions.list filters by period with inclusive bounds", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  for (const [date, payee] of [
    ["2026-02-28", "Avant"],
    ["2026-03-01", "Début"],
    ["2026-03-15", "Fin"],
    ["2026-04-01", "Après"],
  ] as const) {
    await call(
      appRouter.transactions.create,
      { accountId, amount: -1_000, date: new Date(date), payee },
      { context }
    );
  }

  const march = await call(
    appRouter.transactions.list,
    { from: new Date("2026-03-01"), to: new Date("2026-03-15") },
    { context }
  );
  expect(march.transactions.map((t) => t.payee)).toEqual(["Fin", "Début"]);

  const openEnded = await call(
    appRouter.transactions.list,
    { from: new Date("2026-03-15") },
    { context }
  );
  expect(openEnded.transactions.map((t) => t.payee)).toEqual(["Après", "Fin"]);
});

test("transactions.list filters by category, combined with the account", async () => {
  const context = createTestContext();
  const checking = await makeAccount(context, "Compte courant");
  const cash = await makeAccount(context, "Espèces", 0);
  const courses = await makeCategory(context, "Courses");
  const loisirs = await makeCategory(context, "Loisirs");

  await call(
    appRouter.transactions.create,
    {
      accountId: checking,
      amount: -2_000,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
      categoryId: courses,
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId: cash,
      amount: -800,
      date: new Date("2026-03-02"),
      payee: "Marché",
      categoryId: courses,
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId: checking,
      amount: -1_500,
      date: new Date("2026-03-03"),
      payee: "Cinéma",
      categoryId: loisirs,
    },
    { context }
  );

  const allCourses = await call(
    appRouter.transactions.list,
    { categoryId: courses },
    { context }
  );
  expect(allCourses.transactions.map((t) => t.payee)).toEqual([
    "Marché",
    "Carrefour",
  ]);

  const checkingCourses = await call(
    appRouter.transactions.list,
    { categoryId: courses, accountId: checking },
    { context }
  );
  expect(checkingCourses.transactions.map((t) => t.payee)).toEqual([
    "Carrefour",
  ]);
});

test("transactions.list categoryId null keeps only uncategorized rows, excluding transfer legs", async () => {
  const context = createTestContext();
  const checking = await makeAccount(context, "Compte courant");
  const savings = await makeAccount(context, "Livret", 0);
  const courses = await makeCategory(context, "Courses");

  await call(
    appRouter.transactions.create,
    {
      accountId: checking,
      amount: -2_000,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
      categoryId: courses,
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId: checking,
      amount: -900,
      date: new Date("2026-03-02"),
      payee: "Mystère",
    },
    { context }
  );
  // A transfer's legs carry no category by design — they are not a filing todo.
  createTransfer(context.db, {
    fromAccountId: checking,
    toAccountId: savings,
    amount: 1_000,
    date: new Date("2026-03-03"),
  });

  const uncategorized = await call(
    appRouter.transactions.list,
    { categoryId: null },
    { context }
  );
  expect(uncategorized.transactions.map((t) => t.payee)).toEqual(["Mystère"]);
  expect(uncategorized.count).toBe(1);
});

test("transactions.list filters by amount magnitude, regardless of sign", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  for (const [amount, payee] of [
    [-2_500, "Petite dépense"],
    [-10_000, "Grosse dépense"],
    [5_000, "Revenu moyen"],
  ] as const) {
    await call(
      appRouter.transactions.create,
      { accountId, amount, date: new Date("2026-03-01"), payee },
      { context }
    );
  }

  const atLeast30 = await call(
    appRouter.transactions.list,
    { minAmount: 3_000 },
    { context }
  );
  expect(new Set(atLeast30.transactions.map((t) => t.payee))).toEqual(
    new Set(["Grosse dépense", "Revenu moyen"])
  );

  const between = await call(
    appRouter.transactions.list,
    { minAmount: 3_000, maxAmount: 6_000 },
    { context }
  );
  expect(between.transactions.map((t) => t.payee)).toEqual(["Revenu moyen"]);
});

test("transactions.list count and sum aggregate the filtered rows", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_500,
      date: new Date("2026-03-01"),
      payee: "Amazon",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -4_000,
      date: new Date("2026-03-02"),
      payee: "Amazon",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: 250_000,
      date: new Date("2026-03-05"),
      payee: "Employeur",
    },
    { context }
  );

  // « Combien chez Amazon ? » — the aggregates answer directly.
  const amazon = await call(
    appRouter.transactions.list,
    { search: "amazon" },
    { context }
  );
  expect(amazon.count).toBe(2);
  expect(amazon.sum).toBe(-6_500);

  const everything = await call(appRouter.transactions.list, undefined, {
    context,
  });
  expect(everything.count).toBe(3);
  expect(everything.sum).toBe(243_500);

  const nothing = await call(
    appRouter.transactions.list,
    { search: "introuvable" },
    { context }
  );
  expect(nothing.transactions).toEqual([]);
  expect(nothing.count).toBe(0);
  expect(nothing.sum).toBe(0);
});

test("transactions.bulkCategorize files many transactions under a category at once", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const courses = await makeCategory(context, "Courses");

  const ids: number[] = [];
  for (const payee of ["Carrefour", "Auchan", "Marché"]) {
    const tx = await call(
      appRouter.transactions.create,
      { accountId, amount: -1_000, date: new Date("2026-03-01"), payee },
      { context }
    );
    ids.push(tx.id);
  }

  const result = await call(
    appRouter.transactions.bulkCategorize,
    { ids, categoryId: courses },
    { context }
  );
  expect(result).toEqual({ updated: 3 });

  const filed = await call(
    appRouter.transactions.list,
    { categoryId: courses },
    { context }
  );
  expect(filed.count).toBe(3);
  expect(filed.transactions.every((t) => t.categoryName === "Courses")).toBe(
    true
  );
});

test("transactions.bulkCategorize with null clears the category", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const courses = await makeCategory(context, "Courses");

  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -1_000,
      date: new Date("2026-03-01"),
      payee: "Carrefour",
      categoryId: courses,
    },
    { context }
  );

  await call(
    appRouter.transactions.bulkCategorize,
    { ids: [tx.id], categoryId: null },
    { context }
  );

  const uncategorized = await call(
    appRouter.transactions.list,
    { categoryId: null },
    { context }
  );
  expect(uncategorized.transactions.map((t) => t.id)).toEqual([tx.id]);
});

test("transactions.bulkCategorize rejects an unknown category and unknown transactions", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const courses = await makeCategory(context, "Courses");

  const tx = await call(
    appRouter.transactions.create,
    { accountId, amount: -1_000, date: new Date("2026-03-01") },
    { context }
  );

  await expect(
    call(
      appRouter.transactions.bulkCategorize,
      { ids: [tx.id], categoryId: 999 },
      { context }
    )
  ).rejects.toThrow();

  await expect(
    call(
      appRouter.transactions.bulkCategorize,
      { ids: [tx.id, 999], categoryId: courses },
      { context }
    )
  ).rejects.toThrow();

  // The valid row was not silently recategorized by the failed calls.
  const list = await call(appRouter.transactions.list, undefined, { context });
  expect(list.transactions[0]?.categoryId).toBeNull();
});

test("transactions.bulkCategorize refuses transfer legs and changes nothing", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant");
  const to = await makeAccount(context, "Livret", 0);
  const courses = await makeCategory(context, "Courses");

  createTransfer(context.db, {
    fromAccountId: from,
    toAccountId: to,
    amount: 3_000,
    date: new Date("2026-03-01"),
  });
  const plain = await call(
    appRouter.transactions.create,
    { accountId: from, amount: -1_000, date: new Date("2026-03-02") },
    { context }
  );

  const all = await call(appRouter.transactions.list, undefined, { context });
  const leg = all.transactions.find((t) => t.transferId !== null);
  if (!leg) throw new Error("Expected a transfer leg");

  await expect(
    call(
      appRouter.transactions.bulkCategorize,
      { ids: [plain.id, leg.id], categoryId: courses },
      { context }
    )
  ).rejects.toThrow();

  // Atomic: the plain transaction was not filed either.
  const after = await call(appRouter.transactions.list, undefined, {
    context,
  });
  expect(after.transactions.every((t) => t.categoryId === null)).toBe(true);
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
  expect(legs.transactions).toHaveLength(2);

  for (const leg of legs.transactions) {
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

test("transactions.list direction filter keeps only outflows or only inflows", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -2_500,
      date: new Date("2026-03-02"),
      payee: "Carrefour",
    },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: 250_000,
      date: new Date("2026-03-05"),
      payee: "Employeur",
    },
    { context }
  );

  const outflows = await call(
    appRouter.transactions.list,
    { direction: "outflow" },
    { context }
  );
  expect(outflows.count).toBe(1);
  expect(outflows.sum).toBe(-2_500);
  expect(outflows.transactions.every((t) => t.amount < 0)).toBe(true);

  const inflows = await call(
    appRouter.transactions.list,
    { direction: "inflow" },
    { context }
  );
  expect(inflows.count).toBe(1);
  expect(inflows.sum).toBe(250_000);
  expect(inflows.transactions.every((t) => t.amount > 0)).toBe(true);
});
