import { call } from "@orpc/server";
import { expect, test } from "vitest";

import type { ServerContext } from "../../context.js";
import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

test("budgets.create then get returns everythingElse equal to the total with no lines", async () => {
  const context = createTestContext();

  const created = await call(
    appRouter.budgets.create,
    { month: "2026-03", income: 300_000, totalBudget: 250_000 },
    { context }
  );

  expect(created).toEqual({
    month: "2026-03",
    income: 300_000,
    totalBudget: 250_000,
    lines: [],
    everythingElse: 250_000,
  });

  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );

  expect(fetched).toEqual(created);
});

test("budgets.create on a month that already has a budget is rejected", async () => {
  const context = createTestContext();

  await call(
    appRouter.budgets.create,
    { month: "2026-03", income: 300_000, totalBudget: 250_000 },
    { context }
  );

  await expect(
    call(
      appRouter.budgets.create,
      { month: "2026-03", income: 100_000, totalBudget: 90_000 },
      { context }
    )
  ).rejects.toThrow();
});

test("budgets.get on a month with no budget returns null", async () => {
  const context = createTestContext();

  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );

  expect(fetched).toBeNull();
});

test("budgets validation rejects malformed month keys", async () => {
  const context = createTestContext();

  for (const month of ["2026-3", "2026-13", "2026-00", "march", "2026/03"]) {
    await expect(
      call(
        appRouter.budgets.create,
        { month, income: 1_000, totalBudget: 1_000 },
        { context }
      )
    ).rejects.toThrow();
  }
});

test("budgets validation rejects non-positive amounts", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.budgets.create,
      { month: "2026-03", income: 0, totalBudget: 1_000 },
      { context }
    )
  ).rejects.toThrow();

  await expect(
    call(
      appRouter.budgets.create,
      { month: "2026-03", income: 1_000, totalBudget: -5 },
      { context }
    )
  ).rejects.toThrow();
});

test("two distinct months do not interfere with each other", async () => {
  const context = createTestContext();

  await call(
    appRouter.budgets.create,
    { month: "2026-03", income: 300_000, totalBudget: 250_000 },
    { context }
  );
  await call(
    appRouter.budgets.create,
    { month: "2026-04", income: 320_000, totalBudget: 260_000 },
    { context }
  );

  const march = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );
  const april = await call(
    appRouter.budgets.get,
    { month: "2026-04" },
    { context }
  );

  expect(march).toMatchObject({ income: 300_000, totalBudget: 250_000 });
  expect(april).toMatchObject({ income: 320_000, totalBudget: 260_000 });
});

test("budgets.update changing income and/or total is reflected on the next get", async () => {
  const context = createTestContext();

  await call(
    appRouter.budgets.create,
    { month: "2026-03", income: 300_000, totalBudget: 250_000 },
    { context }
  );

  const updated = await call(
    appRouter.budgets.update,
    { month: "2026-03", income: 310_000, totalBudget: 240_000 },
    { context }
  );

  expect(updated).toMatchObject({
    income: 310_000,
    totalBudget: 240_000,
    everythingElse: 240_000,
  });

  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );
  expect(fetched).toMatchObject({ income: 310_000, totalBudget: 240_000 });

  // Partial update: only the income changes; the total is left untouched.
  const incomeOnly = await call(
    appRouter.budgets.update,
    { month: "2026-03", income: 305_000 },
    { context }
  );
  expect(incomeOnly).toMatchObject({ income: 305_000, totalBudget: 240_000 });
});

test("budgets.update on a month with no budget rejects", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.budgets.update,
      { month: "2026-03", income: 100_000 },
      { context }
    )
  ).rejects.toThrow();
});

/** Create an expense/income category and return its id — a line's target. */
async function makeCategory(
  context: ServerContext,
  name: string,
  kind: "expense" | "income"
): Promise<number> {
  const category = await call(
    appRouter.categories.create,
    { name, kind },
    { context }
  );
  return category.id;
}

/** Seed a budget for a month and return the context so tests can add lines. */
async function seedBudget(
  context: ServerContext,
  month: string,
  income: number,
  totalBudget: number
): Promise<void> {
  await call(
    appRouter.budgets.create,
    { month, income, totalBudget },
    { context }
  );
}

test("budgets.setLine on an expense category decreases everythingElse by that amount", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);
  const groceries = await makeCategory(context, "Courses", "expense");

  const result = await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: groceries, amount: 60_000 },
    { context }
  );

  expect(result).toMatchObject({
    month: "2026-03",
    totalBudget: 250_000,
    lines: [{ categoryId: groceries, amount: 60_000 }],
    everythingElse: 190_000,
  });

  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );
  expect(fetched).toMatchObject({
    lines: [{ categoryId: groceries, amount: 60_000 }],
    everythingElse: 190_000,
  });
});

test("budgets.setLine on an income category is rejected", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);
  const salary = await makeCategory(context, "Salaire", "income");

  await expect(
    call(
      appRouter.budgets.setLine,
      { month: "2026-03", categoryId: salary, amount: 10_000 },
      { context }
    )
  ).rejects.toThrow();
});

test("budgets.setLine on a non-existent category is rejected", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);

  await expect(
    call(
      appRouter.budgets.setLine,
      { month: "2026-03", categoryId: 9_999, amount: 10_000 },
      { context }
    )
  ).rejects.toThrow();
});

test("budgets.setLine on a month with no budget is rejected", async () => {
  const context = createTestContext();
  const groceries = await makeCategory(context, "Courses", "expense");

  await expect(
    call(
      appRouter.budgets.setLine,
      { month: "2026-03", categoryId: groceries, amount: 10_000 },
      { context }
    )
  ).rejects.toThrow();
});

test("budgets.setLine repeated on the same category upserts (no duplicate row)", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);
  const groceries = await makeCategory(context, "Courses", "expense");

  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: groceries, amount: 60_000 },
    { context }
  );
  const result = await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: groceries, amount: 80_000 },
    { context }
  );

  expect(result.lines).toEqual([{ categoryId: groceries, amount: 80_000 }]);
  expect(result.everythingElse).toBe(170_000);
});

test("budgets.setLine auto-increases the total when lines sum above it", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 100_000);
  const rent = await makeCategory(context, "Loyer", "expense");
  const groceries = await makeCategory(context, "Courses", "expense");

  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: rent, amount: 80_000 },
    { context }
  );

  // 80_000 + 40_000 = 120_000 > 100_000 → total rises to 120_000.
  const result = await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: groceries, amount: 40_000 },
    { context }
  );

  expect(result.totalBudget).toBe(120_000);
  expect(result.everythingElse).toBe(0);

  // The raise persists — the next read sees the new total, never negative.
  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );
  expect(fetched).toMatchObject({ totalBudget: 120_000, everythingElse: 0 });
});

test("budgets.removeLine returns the amount to everythingElse and leaves the total unchanged", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 100_000);
  const rent = await makeCategory(context, "Loyer", "expense");
  const groceries = await makeCategory(context, "Courses", "expense");

  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: rent, amount: 80_000 },
    { context }
  );
  // Push above the total so it auto-increases to 120_000.
  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: groceries, amount: 40_000 },
    { context }
  );

  const result = await call(
    appRouter.budgets.removeLine,
    { month: "2026-03", categoryId: groceries },
    { context }
  );

  // Total stays at the raised 120_000; the freed 40_000 flows to "everything else".
  expect(result.totalBudget).toBe(120_000);
  expect(result.lines).toEqual([{ categoryId: rent, amount: 80_000 }]);
  expect(result.everythingElse).toBe(40_000);
});

test("budgets.removeLine on a line that was never set is a no-op", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);
  const groceries = await makeCategory(context, "Courses", "expense");

  const result = await call(
    appRouter.budgets.removeLine,
    { month: "2026-03", categoryId: groceries },
    { context }
  );

  expect(result.lines).toEqual([]);
  expect(result.everythingElse).toBe(250_000);
});

test("budgets.update lowering the total below the sum of lines is rejected", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);
  const rent = await makeCategory(context, "Loyer", "expense");

  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: rent, amount: 90_000 },
    { context }
  );

  await expect(
    call(
      appRouter.budgets.update,
      { month: "2026-03", totalBudget: 50_000 },
      { context }
    )
  ).rejects.toThrow();

  // A total at or above the sum of lines is still accepted.
  const ok = await call(
    appRouter.budgets.update,
    { month: "2026-03", totalBudget: 90_000 },
    { context }
  );
  expect(ok).toMatchObject({ totalBudget: 90_000, everythingElse: 0 });
});

test("deleting a category drops its budget line and returns the amount to everythingElse", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 300_000, 250_000);
  const rent = await makeCategory(context, "Loyer", "expense");
  const groceries = await makeCategory(context, "Courses", "expense");

  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: rent, amount: 90_000 },
    { context }
  );
  await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: groceries, amount: 60_000 },
    { context }
  );

  await call(appRouter.categories.delete, { id: groceries }, { context });

  // The line for the deleted category is gone; its 60_000 flows back to
  // "everything else" (250_000 − 90_000). No orphan line survives.
  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );
  expect(fetched).toMatchObject({
    totalBudget: 250_000,
    lines: [{ categoryId: rent, amount: 90_000 }],
    everythingElse: 160_000,
  });
});

test("budgeting beyond income is allowed", async () => {
  const context = createTestContext();
  await seedBudget(context, "2026-03", 100_000, 100_000);
  const rent = await makeCategory(context, "Loyer", "expense");

  // A line larger than income auto-increases the total past income — not blocked.
  const result = await call(
    appRouter.budgets.setLine,
    { month: "2026-03", categoryId: rent, amount: 150_000 },
    { context }
  );

  expect(result).toMatchObject({
    income: 100_000,
    totalBudget: 150_000,
    everythingElse: 0,
  });
});
