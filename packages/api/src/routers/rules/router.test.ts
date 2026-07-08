import { call } from "@orpc/server";
import { expect, test } from "vitest";

import type { ServerContext } from "../../context.js";
import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/** Create a category and return its id — a fixture for the rule tests. */
async function makeCategory(
  context: ServerContext,
  name = "Courses"
): Promise<number> {
  const category = await call(
    appRouter.categories.create,
    { name, kind: "expense" },
    { context }
  );
  return category.id;
}

/** Create an account and return its id — a fixture for the retroactive tests. */
async function makeAccount(
  context: ServerContext,
  name = "Compte courant"
): Promise<number> {
  const account = await call(
    appRouter.accounts.create,
    { name, type: "checking", initialBalance: 0 },
    { context }
  );
  return account.id;
}

/** Record one transaction and return its id. */
async function record(
  context: ServerContext,
  accountId: number,
  payee: string,
  categoryId: number | null = null
): Promise<number> {
  const tx = await call(
    appRouter.transactions.create,
    {
      accountId,
      amount: -1_000,
      date: new Date("2026-03-01"),
      payee,
      categoryId,
    },
    { context }
  );
  return tx.id;
}

/** The category id currently filed on a transaction, read back through the list. */
async function categoryOf(
  context: ServerContext,
  transactionId: number
): Promise<number | null> {
  const list = await call(appRouter.transactions.list, undefined, { context });
  const tx = list.transactions.find((t) => t.id === transactionId);
  if (!tx) throw new Error(`No transaction ${transactionId} in list`);
  return tx.categoryId;
}

// ── CRUD ──

test("rules.create appends a « label contains X → category Y » rule and rules.list returns it in application order", async () => {
  const context = createTestContext();
  const groceriesId = await makeCategory(context, "Courses");
  const salaryId = await makeCategory(context, "Salaire");

  const first = await call(
    appRouter.rules.create,
    { pattern: "CARREFOUR", categoryId: groceriesId },
    { context }
  );
  expect(first).toMatchObject({
    pattern: "CARREFOUR",
    categoryId: groceriesId,
    sortOrder: 0,
  });

  const second = await call(
    appRouter.rules.create,
    { pattern: "EMPLOYEUR", categoryId: salaryId },
    { context }
  );
  expect(second.sortOrder).toBe(1);

  const rules = await call(appRouter.rules.list, undefined, { context });
  expect(rules.map((rule) => [rule.pattern, rule.categoryId])).toEqual([
    ["CARREFOUR", groceriesId],
    ["EMPLOYEUR", salaryId],
  ]);
});

test("rules.create refuses a rule targeting a category that does not exist", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.rules.create,
      { pattern: "CARREFOUR", categoryId: 999 },
      { context }
    )
  ).rejects.toThrowError(/no category with id 999/i);
});

test("rules.update edits the pattern and/or the target category, keeping the rule's place in the order", async () => {
  const context = createTestContext();
  const groceriesId = await makeCategory(context, "Courses");
  const restaurantId = await makeCategory(context, "Restaurants");

  const rule = await call(
    appRouter.rules.create,
    { pattern: "CARREFOUR", categoryId: groceriesId },
    { context }
  );

  const updated = await call(
    appRouter.rules.update,
    { id: rule.id, pattern: "CARREFOUR MARKET", categoryId: restaurantId },
    { context }
  );
  expect(updated).toMatchObject({
    id: rule.id,
    pattern: "CARREFOUR MARKET",
    categoryId: restaurantId,
    sortOrder: rule.sortOrder,
  });

  await expect(
    call(appRouter.rules.update, { id: rule.id, categoryId: 999 }, { context })
  ).rejects.toThrowError(/no category with id 999/i);

  await expect(
    call(appRouter.rules.update, { id: 999, pattern: "X" }, { context })
  ).rejects.toThrowError(/no categorization rule with id 999/i);
});

test("rules.delete removes the rule and rules.list no longer returns it", async () => {
  const context = createTestContext();
  const groceriesId = await makeCategory(context);

  const rule = await call(
    appRouter.rules.create,
    { pattern: "CARREFOUR", categoryId: groceriesId },
    { context }
  );

  const result = await call(
    appRouter.rules.delete,
    { id: rule.id },
    { context }
  );
  expect(result).toEqual({ id: rule.id });
  expect(await call(appRouter.rules.list, undefined, { context })).toEqual([]);

  await expect(
    call(appRouter.rules.delete, { id: rule.id }, { context })
  ).rejects.toThrowError(/no categorization rule/i);
});

// ── Referential clean-up ──

test("deleting a category deletes the rules targeting it, or re-points them with the reassignment", async () => {
  const context = createTestContext();
  const groceriesId = await makeCategory(context, "Courses");
  const foodId = await makeCategory(context, "Alimentation");

  await call(
    appRouter.rules.create,
    { pattern: "CARREFOUR", categoryId: groceriesId },
    { context }
  );

  // Reassigned delete → the rule follows the transactions to the target.
  await call(
    appRouter.categories.delete,
    { id: groceriesId, reassignToId: foodId },
    { context }
  );
  let rules = await call(appRouter.rules.list, undefined, { context });
  expect(rules.map((rule) => rule.categoryId)).toEqual([foodId]);

  // Plain delete → the rule cannot mean anything anymore and is removed.
  await call(appRouter.categories.delete, { id: foodId }, { context });
  rules = await call(appRouter.rules.list, undefined, { context });
  expect(rules).toEqual([]);
});

// ── Ordering ──

test("rules.reorder rewrites the application order to the given id sequence", async () => {
  const context = createTestContext();
  const categoryId = await makeCategory(context);

  const patterns = ["CARREFOUR", "EMPLOYEUR", "PAUL"];
  const ids: number[] = [];
  for (const pattern of patterns) {
    const rule = await call(
      appRouter.rules.create,
      { pattern, categoryId },
      { context }
    );
    ids.push(rule.id);
  }

  await call(
    appRouter.rules.reorder,
    { orderedIds: [ids[2]!, ids[0]!, ids[1]!] },
    { context }
  );

  const rules = await call(appRouter.rules.list, undefined, { context });
  expect(rules.map((rule) => rule.pattern)).toEqual([
    "PAUL",
    "CARREFOUR",
    "EMPLOYEUR",
  ]);
});

test("rules.reorder refuses a sequence that is not exactly the current set of rules", async () => {
  const context = createTestContext();
  const categoryId = await makeCategory(context);

  const rule = await call(
    appRouter.rules.create,
    { pattern: "CARREFOUR", categoryId },
    { context }
  );

  // Missing a rule, naming an unknown one, or repeating one — all refused, so
  // a stale screen can never silently drop part of the order.
  await expect(
    call(appRouter.rules.reorder, { orderedIds: [] }, { context })
  ).rejects.toThrowError(/BAD_REQUEST|every rule/i);
  await expect(
    call(appRouter.rules.reorder, { orderedIds: [rule.id, 999] }, { context })
  ).rejects.toThrowError(/BAD_REQUEST|every rule/i);
  await expect(
    call(
      appRouter.rules.reorder,
      { orderedIds: [rule.id, rule.id] },
      { context }
    )
  ).rejects.toThrowError(/BAD_REQUEST|every rule/i);
});

// ── Retroactive application (issue #15) ──

test("rules.matchingCount counts the existing transactions a pattern would reclassify", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const transport = await makeCategory(context, "Transport");

  await record(context, accountId, "SNCF PARIS"); // uncategorised → would change
  await record(context, accountId, "sncf lyon"); // case-insensitive → would change
  await record(context, accountId, "CARREFOUR"); // no match
  await record(context, accountId, "SNCF ALREADY", transport); // already Transport → no change

  const { count } = await call(
    appRouter.rules.matchingCount,
    { pattern: "SNCF", categoryId: transport },
    { context }
  );
  expect(count).toBe(2);
});

test("rules.matchingCount never counts a transfer leg", async () => {
  const context = createTestContext();
  const source = await makeAccount(context, "Courant");
  const destination = await makeAccount(context, "Livret");
  const transport = await makeCategory(context, "Transport");

  await call(
    appRouter.transfers.create,
    {
      fromAccountId: source,
      toAccountId: destination,
      amount: 5_000,
      date: new Date("2026-03-01"),
      payee: "SNCF remboursement",
    },
    { context }
  );

  const { count } = await call(
    appRouter.rules.matchingCount,
    { pattern: "SNCF", categoryId: transport },
    { context }
  );
  expect(count).toBe(0);
});

test("creating a rule does NOT touch existing transactions on its own", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const transport = await makeCategory(context, "Transport");
  const sncf = await record(context, accountId, "SNCF PARIS");

  await call(
    appRouter.rules.create,
    { pattern: "SNCF", categoryId: transport },
    { context }
  );

  // Rules classify incoming rows at import time; a bare create rewrites nothing.
  expect(await categoryOf(context, sncf)).toBeNull();
});

test("rules.applyRetroactive reclassifies the matching transactions on explicit demand", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const transport = await makeCategory(context, "Transport");
  const sncfA = await record(context, accountId, "SNCF PARIS");
  const sncfB = await record(context, accountId, "sncf lyon");
  const carrefour = await record(context, accountId, "CARREFOUR");

  const rule = await call(
    appRouter.rules.create,
    { pattern: "SNCF", categoryId: transport },
    { context }
  );

  const result = await call(
    appRouter.rules.applyRetroactive,
    { id: rule.id },
    { context }
  );
  expect(result).toEqual({ updated: 2 });

  expect(await categoryOf(context, sncfA)).toBe(transport);
  expect(await categoryOf(context, sncfB)).toBe(transport);
  // A non-matching row is left exactly as it was.
  expect(await categoryOf(context, carrefour)).toBeNull();
});

test("rules.applyRetroactive leaves transfer legs untouched", async () => {
  const context = createTestContext();
  const source = await makeAccount(context, "Courant");
  const destination = await makeAccount(context, "Livret");
  const transport = await makeCategory(context, "Transport");
  const spend = await record(context, source, "SNCF PARIS");

  await call(
    appRouter.transfers.create,
    {
      fromAccountId: source,
      toAccountId: destination,
      amount: 5_000,
      date: new Date("2026-03-01"),
      payee: "SNCF virement",
    },
    { context }
  );

  const rule = await call(
    appRouter.rules.create,
    { pattern: "SNCF", categoryId: transport },
    { context }
  );
  const result = await call(
    appRouter.rules.applyRetroactive,
    { id: rule.id },
    { context }
  );

  // Only the real spend is reclassified; both transfer legs are skipped.
  expect(result).toEqual({ updated: 1 });
  expect(await categoryOf(context, spend)).toBe(transport);
  const list = await call(appRouter.transactions.list, undefined, { context });
  const legs = list.transactions.filter((t) => t.transferId !== null);
  expect(legs).toHaveLength(2);
  expect(legs.every((t) => t.categoryId === null)).toBe(true);
});

test("rules.applyRetroactive refuses an unknown rule id", async () => {
  const context = createTestContext();

  await expect(
    call(appRouter.rules.applyRetroactive, { id: 999 }, { context })
  ).rejects.toThrowError(/no categorization rule/i);
});
