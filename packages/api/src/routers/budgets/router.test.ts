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

test("budgets.seedFromPrevious copies income, total and all lines from the nearest prior month", async () => {
  const context = createTestContext();
  const rent = await makeCategory(context, "Loyer", "expense");
  const groceries = await makeCategory(context, "Courses", "expense");

  // An older month that must be ignored — only the *nearest* prior is copied.
  await seedBudget(context, "2026-01", 200_000, 150_000);

  // The nearest prior month, with two lines to copy.
  await seedBudget(context, "2026-03", 300_000, 250_000);
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

  const seeded = await call(
    appRouter.budgets.seedFromPrevious,
    { month: "2026-05" },
    { context }
  );

  expect(seeded).toEqual({
    month: "2026-05",
    income: 300_000,
    totalBudget: 250_000,
    lines: [
      { categoryId: rent, amount: 90_000 },
      { categoryId: groceries, amount: 60_000 },
    ],
    everythingElse: 100_000,
  });

  // The seeded budget is persisted — the next read returns the same view.
  const fetched = await call(
    appRouter.budgets.get,
    { month: "2026-05" },
    { context }
  );
  expect(fetched).toEqual(seeded);
});

test("budgets.seedFromPrevious is a no-op returning the existing budget when the month already has one", async () => {
  const context = createTestContext();
  const rent = await makeCategory(context, "Loyer", "expense");

  await seedBudget(context, "2026-03", 300_000, 250_000);
  // The target month already has its own budget with a distinct line.
  await seedBudget(context, "2026-04", 320_000, 260_000);
  await call(
    appRouter.budgets.setLine,
    { month: "2026-04", categoryId: rent, amount: 80_000 },
    { context }
  );

  const result = await call(
    appRouter.budgets.seedFromPrevious,
    { month: "2026-04" },
    { context }
  );

  // Untouched — it keeps its own values, not March's.
  expect(result).toEqual({
    month: "2026-04",
    income: 320_000,
    totalBudget: 260_000,
    lines: [{ categoryId: rent, amount: 80_000 }],
    everythingElse: 180_000,
  });
});

test("budgets.seedFromPrevious returns null when no earlier month exists", async () => {
  const context = createTestContext();

  // Nothing at all yet.
  expect(
    await call(
      appRouter.budgets.seedFromPrevious,
      { month: "2026-03" },
      { context }
    )
  ).toBeNull();

  // Only a *later* month exists — still nothing to copy from.
  await seedBudget(context, "2026-05", 300_000, 250_000);
  expect(
    await call(
      appRouter.budgets.seedFromPrevious,
      { month: "2026-03" },
      { context }
    )
  ).toBeNull();
});

test("budgets.applyToFuture overwrites every strictly-posterior existing month with the source's income, total and lines", async () => {
  const context = createTestContext();
  const rent = await makeCategory(context, "Loyer", "expense");
  const groceries = await makeCategory(context, "Courses", "expense");

  // Source month with two lines.
  await seedBudget(context, "2026-03", 300_000, 250_000);
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

  // Two later months with their own, different values and lines.
  await seedBudget(context, "2026-04", 100_000, 80_000);
  await call(
    appRouter.budgets.setLine,
    { month: "2026-04", categoryId: rent, amount: 10_000 },
    { context }
  );
  await seedBudget(context, "2026-06", 120_000, 90_000);

  const result = await call(
    appRouter.budgets.applyToFuture,
    { month: "2026-03" },
    { context }
  );

  expect(result).toEqual({ affectedMonths: ["2026-04", "2026-06"] });

  // Both later months now mirror the source exactly — income, total and lines.
  const expectedView = {
    income: 300_000,
    totalBudget: 250_000,
    lines: [
      { categoryId: rent, amount: 90_000 },
      { categoryId: groceries, amount: 60_000 },
    ],
    everythingElse: 100_000,
  };
  const april = await call(
    appRouter.budgets.get,
    { month: "2026-04" },
    { context }
  );
  const june = await call(
    appRouter.budgets.get,
    { month: "2026-06" },
    { context }
  );
  expect(april).toMatchObject(expectedView);
  expect(june).toMatchObject(expectedView);
});

test("budgets.applyToFuture leaves the source month and all earlier months untouched", async () => {
  const context = createTestContext();
  const rent = await makeCategory(context, "Loyer", "expense");

  await seedBudget(context, "2026-01", 200_000, 150_000);
  await call(
    appRouter.budgets.setLine,
    { month: "2026-01", categoryId: rent, amount: 20_000 },
    { context }
  );
  await seedBudget(context, "2026-03", 300_000, 250_000);
  await seedBudget(context, "2026-05", 100_000, 80_000);

  await call(
    appRouter.budgets.applyToFuture,
    { month: "2026-03" },
    { context }
  );

  // The earlier month keeps its own values and line.
  const january = await call(
    appRouter.budgets.get,
    { month: "2026-01" },
    { context }
  );
  expect(january).toMatchObject({
    income: 200_000,
    totalBudget: 150_000,
    lines: [{ categoryId: rent, amount: 20_000 }],
  });

  // The source month itself is unchanged.
  const march = await call(
    appRouter.budgets.get,
    { month: "2026-03" },
    { context }
  );
  expect(march).toMatchObject({ income: 300_000, totalBudget: 250_000 });
});

test("budgets.applyToFuture does not create months that did not already exist", async () => {
  const context = createTestContext();

  await seedBudget(context, "2026-03", 300_000, 250_000);
  // Only one later month exists; the gaps around it must stay empty.
  await seedBudget(context, "2026-07", 100_000, 80_000);

  const result = await call(
    appRouter.budgets.applyToFuture,
    { month: "2026-03" },
    { context }
  );

  expect(result).toEqual({ affectedMonths: ["2026-07"] });

  // A future month that never had a budget is still absent.
  expect(
    await call(appRouter.budgets.get, { month: "2026-05" }, { context })
  ).toBeNull();
});

test("budgets.applyToFuture from a past month never rewrites months at or before it", async () => {
  const context = createTestContext();

  // A past month is edited to fix a typo, then propagated forward.
  await seedBudget(context, "2026-02", 210_000, 180_000);
  await seedBudget(context, "2026-04", 300_000, 250_000);
  await seedBudget(context, "2026-06", 120_000, 90_000);

  const result = await call(
    appRouter.budgets.applyToFuture,
    { month: "2026-04" },
    { context }
  );

  // Only strictly-posterior months are affected; the past (2026-02) and the
  // edited month (2026-04) are never propagated over.
  expect(result).toEqual({ affectedMonths: ["2026-06"] });
  const february = await call(
    appRouter.budgets.get,
    { month: "2026-02" },
    { context }
  );
  expect(february).toMatchObject({ income: 210_000, totalBudget: 180_000 });
});

test("budgets.applyToFuture with no later months returns an empty affectedMonths", async () => {
  const context = createTestContext();

  await seedBudget(context, "2026-03", 300_000, 250_000);
  // An earlier month exists but must not be affected.
  await seedBudget(context, "2026-01", 200_000, 150_000);

  const result = await call(
    appRouter.budgets.applyToFuture,
    { month: "2026-03" },
    { context }
  );

  expect(result).toEqual({ affectedMonths: [] });
});

test("budgets.applyToFuture clears lines of a future month the source has none of", async () => {
  const context = createTestContext();
  const rent = await makeCategory(context, "Loyer", "expense");

  // Source has no lines; the future month does — propagation must clear them.
  await seedBudget(context, "2026-03", 300_000, 250_000);
  await seedBudget(context, "2026-05", 100_000, 80_000);
  await call(
    appRouter.budgets.setLine,
    { month: "2026-05", categoryId: rent, amount: 30_000 },
    { context }
  );

  await call(
    appRouter.budgets.applyToFuture,
    { month: "2026-03" },
    { context }
  );

  const may = await call(
    appRouter.budgets.get,
    { month: "2026-05" },
    { context }
  );
  expect(may).toMatchObject({
    income: 300_000,
    totalBudget: 250_000,
    lines: [],
    everythingElse: 250_000,
  });
});

test("budgets.applyToFuture on a month with no budget is rejected", async () => {
  const context = createTestContext();

  await expect(
    call(appRouter.budgets.applyToFuture, { month: "2026-03" }, { context })
  ).rejects.toThrow();
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
