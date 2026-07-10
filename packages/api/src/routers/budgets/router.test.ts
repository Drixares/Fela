import { call } from "@orpc/server";
import { expect, test } from "vitest";

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
