import { call } from "@orpc/server";
import { transactions } from "@repo/db";
import { expect, test } from "vitest";

import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

test("accounts.create returns the new account with its opening balance", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking", initialBalance: 10_000 },
    { context }
  );

  expect(account).toMatchObject({
    name: "Compte courant",
    type: "checking",
    initialBalance: 10_000,
    currency: "EUR",
    archived: false,
    balance: 10_000,
  });
  expect(account.id).toBeGreaterThan(0);

  // The created account is immediately visible through list.
  const list = await call(appRouter.accounts.list, undefined, { context });
  expect(list.map((a) => a.name)).toEqual(["Compte courant"]);
});

test("accounts.create defaults the opening balance to zero", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Espèces", type: "cash" },
    { context }
  );

  expect(account.initialBalance).toBe(0);
  expect(account.balance).toBe(0);
});

test("accounts.create rejects a blank name and an unknown type", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.accounts.create,
      { name: "  ", type: "checking" },
      { context }
    )
  ).rejects.toThrow();

  await expect(
    call(
      appRouter.accounts.create,
      // @ts-expect-error — exercising a type the contract forbids
      { name: "Bizarre", type: "crypto_wallet" },
      { context }
    )
  ).rejects.toThrow();
});

test("accounts.list returns every account with its derived balance, sorted by name", async () => {
  const context = createTestContext();

  const checking = await call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking", initialBalance: 10_000 },
    { context }
  );
  await call(
    appRouter.accounts.create,
    { name: "Livret A", type: "savings", initialBalance: 500_000 },
    { context }
  );

  // A -25.00 € expense on the checking account: its balance must drop to 75.00 €.
  context.db
    .insert(transactions)
    .values({ accountId: checking.id, amount: -2_500, date: new Date() })
    .run();

  const result = await call(appRouter.accounts.list, undefined, { context });

  expect(result.map((a) => a.name)).toEqual(["Compte courant", "Livret A"]);
  expect(result.find((a) => a.name === "Compte courant")?.balance).toBe(7_500);
  expect(result.find((a) => a.name === "Livret A")?.balance).toBe(500_000);
});

test("accounts.update changes name, type and opening balance and re-derives the balance", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Cmpte", type: "checking", initialBalance: 10_000 },
    { context }
  );

  // A +40.00 € inflow already sits on the account.
  context.db
    .insert(transactions)
    .values({ accountId: account.id, amount: 4_000, date: new Date() })
    .run();

  const updated = await call(
    appRouter.accounts.update,
    {
      id: account.id,
      name: "Compte courant",
      type: "savings",
      initialBalance: 20_000,
    },
    { context }
  );

  expect(updated).toMatchObject({
    id: account.id,
    name: "Compte courant",
    type: "savings",
    initialBalance: 20_000,
    // 20 000 opening + 4 000 transaction
    balance: 24_000,
  });
});

test("accounts.update leaves untouched fields alone", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking", initialBalance: 10_000 },
    { context }
  );

  const updated = await call(
    appRouter.accounts.update,
    { id: account.id, name: "Compte joint" },
    { context }
  );

  expect(updated).toMatchObject({
    name: "Compte joint",
    type: "checking",
    initialBalance: 10_000,
  });
});

test("accounts.update with only an id changes nothing and returns the account", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking", initialBalance: 10_000 },
    { context }
  );

  const updated = await call(
    appRouter.accounts.update,
    { id: account.id },
    { context }
  );

  expect(updated).toMatchObject({
    id: account.id,
    name: "Compte courant",
    type: "checking",
    initialBalance: 10_000,
    balance: 10_000,
  });
});

test("accounts.update on a missing account rejects", async () => {
  const context = createTestContext();

  await expect(
    call(appRouter.accounts.update, { id: 999, name: "Fantôme" }, { context })
  ).rejects.toThrow();
});

test("accounts.archive hides an account from the current list but keeps its history", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Ancien compte", type: "checking", initialBalance: 10_000 },
    { context }
  );
  context.db
    .insert(transactions)
    .values({ accountId: account.id, amount: -2_500, date: new Date() })
    .run();

  const archived = await call(
    appRouter.accounts.archive,
    { id: account.id },
    { context }
  );
  expect(archived.archived).toBe(true);

  // Gone from the current overview…
  const current = await call(appRouter.accounts.list, undefined, { context });
  expect(current).toHaveLength(0);

  // …but its history and derived balance survive for past reports.
  const withArchived = await call(
    appRouter.accounts.list,
    { includeArchived: true },
    { context }
  );
  expect(withArchived).toHaveLength(1);
  expect(withArchived[0]).toMatchObject({ archived: true, balance: 7_500 });

  const rows = context.db.select().from(transactions).all();
  expect(rows).toHaveLength(1);
});

test("accounts.archive can restore an archived account", async () => {
  const context = createTestContext();

  const account = await call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking" },
    { context }
  );
  await call(appRouter.accounts.archive, { id: account.id }, { context });

  const restored = await call(
    appRouter.accounts.archive,
    { id: account.id, archived: false },
    { context }
  );

  expect(restored.archived).toBe(false);
  const current = await call(appRouter.accounts.list, undefined, { context });
  expect(current.map((a) => a.name)).toEqual(["Compte courant"]);
});
