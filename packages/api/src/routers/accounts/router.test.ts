import { call } from "@orpc/server";
import { accounts, transactions } from "@repo/db";
import { expect, test } from "vitest";

import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

test("accounts.list returns every account with its derived balance, sorted by name", async () => {
  const context = createTestContext();

  // Arrange: two accounts. Seeding goes through the db directly because there
  // is no create procedure yet — that lands in a later slice of #1. Assertions,
  // however, go through the real procedure under test.
  const [checking] = context.db
    .insert(accounts)
    .values({
      name: "Compte courant",
      type: "checking",
      initialBalance: 10_000,
    })
    .returning()
    .all();
  context.db
    .insert(accounts)
    .values({ name: "Livret A", type: "savings", initialBalance: 500_000 })
    .run();

  // A -25.00 € expense on the checking account: its balance must drop to 75.00 €.
  context.db
    .insert(transactions)
    .values({ accountId: checking!.id, amount: -2_500, date: new Date() })
    .run();

  const result = await call(appRouter.accounts.list, undefined, { context });

  expect(result.map((a) => a.name)).toEqual(["Compte courant", "Livret A"]);
  expect(result.find((a) => a.name === "Compte courant")?.balance).toBe(7_500);
  expect(result.find((a) => a.name === "Livret A")?.balance).toBe(500_000);
});
