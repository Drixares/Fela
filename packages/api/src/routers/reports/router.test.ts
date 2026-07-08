import { call } from "@orpc/server";
import { expect, test } from "vitest";

import type { ServerContext } from "../../context.js";
import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/** Create an account and return its id — a fixture for the report tests. */
async function makeAccount(
  context: ServerContext,
  name = "Compte courant",
  initialBalance = 1_000_000
): Promise<number> {
  const account = await call(
    appRouter.accounts.create,
    { name, type: "checking", initialBalance },
    { context }
  );
  return account.id;
}

/** Create a category group and return its id. */
async function makeGroup(
  context: ServerContext,
  name: string
): Promise<number> {
  const group = await call(
    appRouter.categories.createGroup,
    { name },
    {
      context,
    }
  );
  return group.id;
}

/** Create a leaf category and return its id. */
async function makeCategory(
  context: ServerContext,
  name: string,
  kind: "income" | "expense",
  groupId?: number
): Promise<number> {
  const category = await call(
    appRouter.categories.create,
    { name, kind, groupId },
    { context }
  );
  return category.id;
}

/** Record a single transaction (signed cents). */
async function makeTx(
  context: ServerContext,
  input: {
    accountId: number;
    amount: number;
    date: Date;
    categoryId?: number | null;
    payee?: string;
  }
): Promise<void> {
  await call(appRouter.transactions.create, input, { context });
}

const MARCH = {
  from: new Date("2026-03-01"),
  to: new Date("2026-03-31T23:59:59.999"),
};

test("reports.byGroup breaks expenses down by category group over the period", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const food = await makeGroup(context, "Alimentation");
  const courses = await makeCategory(context, "Courses", "expense", food);
  const resto = await makeCategory(context, "Restaurants", "expense", food);
  const transport = await makeGroup(context, "Transport");
  const fuel = await makeCategory(context, "Carburant", "expense", transport);

  await makeTx(context, {
    accountId,
    amount: -4_000,
    date: new Date("2026-03-02"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -1_000,
    date: new Date("2026-03-10"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -3_000,
    date: new Date("2026-03-12"),
    categoryId: resto,
  });
  await makeTx(context, {
    accountId,
    amount: -2_000,
    date: new Date("2026-03-20"),
    categoryId: fuel,
  });

  const report = await call(appRouter.reports.byGroup, MARCH, { context });

  // Alimentation = 40 + 10 + 30 = 80.00 €, Transport = 20.00 €, total 100.00 €.
  expect(report.total).toBe(10_000);
  expect(report.uncategorized).toBe(0);
  expect(report.groups).toEqual([
    { groupId: food, name: "Alimentation", total: 8_000 },
    { groupId: transport, name: "Transport", total: 2_000 },
  ]);
});

test("reports.byGroup never counts internal transfers as an expense", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 1_000_000);
  const to = await makeAccount(context, "Livret", 0);
  const group = await makeGroup(context, "Alimentation");
  const courses = await makeCategory(context, "Courses", "expense", group);

  await makeTx(context, {
    accountId: from,
    amount: -5_000,
    date: new Date("2026-03-05"),
    categoryId: courses,
  });
  // Moving one's own money — a negative leg on `from` — must never show up.
  await call(
    appRouter.transfers.create,
    {
      fromAccountId: from,
      toAccountId: to,
      amount: 50_000,
      date: new Date("2026-03-06"),
    },
    { context }
  );

  const report = await call(appRouter.reports.byGroup, MARCH, { context });

  expect(report.total).toBe(5_000);
  expect(report.groups).toEqual([
    { groupId: group, name: "Alimentation", total: 5_000 },
  ]);
});

test("reports.byGroup surfaces uncategorized outflows as a « Non classé » total", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const group = await makeGroup(context, "Alimentation");
  const courses = await makeCategory(context, "Courses", "expense", group);

  await makeTx(context, {
    accountId,
    amount: -3_000,
    date: new Date("2026-03-05"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -1_500,
    date: new Date("2026-03-07"),
  }); // no category
  await makeTx(context, {
    accountId,
    amount: -500,
    date: new Date("2026-03-08"),
    categoryId: null,
  });

  const report = await call(appRouter.reports.byGroup, MARCH, { context });

  expect(report.uncategorized).toBe(2_000);
  expect(report.total).toBe(5_000); // categorized + uncategorized
  expect(report.groups).toEqual([
    { groupId: group, name: "Alimentation", total: 3_000 },
  ]);
});

test("reports.byGroup buckets categories with no group under a null group", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const loose = await makeCategory(context, "Divers", "expense"); // no group

  await makeTx(context, {
    accountId,
    amount: -2_500,
    date: new Date("2026-03-09"),
    categoryId: loose,
  });

  const report = await call(appRouter.reports.byGroup, MARCH, { context });

  expect(report.groups).toEqual([{ groupId: null, name: null, total: 2_500 }]);
});

test("reports.byGroup counts only outflows and only within the period", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const spending = await makeGroup(context, "Alimentation");
  const courses = await makeCategory(context, "Courses", "expense", spending);
  const incomeGroup = await makeGroup(context, "Revenus");
  const salary = await makeCategory(context, "Salaire", "income", incomeGroup);

  await makeTx(context, {
    accountId,
    amount: -3_000,
    date: new Date("2026-03-15"),
    categoryId: courses,
  });
  // Inflow — not an expense, must not appear.
  await makeTx(context, {
    accountId,
    amount: 250_000,
    date: new Date("2026-03-01"),
    categoryId: salary,
  });
  // Outflow just outside the period on both ends.
  await makeTx(context, {
    accountId,
    amount: -9_999,
    date: new Date("2026-02-28"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -8_888,
    date: new Date("2026-04-01"),
    categoryId: courses,
  });

  const report = await call(appRouter.reports.byGroup, MARCH, { context });

  expect(report.total).toBe(3_000);
  expect(report.groups).toEqual([
    { groupId: spending, name: "Alimentation", total: 3_000 },
  ]);
});

test("reports.byCategory drills a group down into its categories", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const food = await makeGroup(context, "Alimentation");
  const courses = await makeCategory(context, "Courses", "expense", food);
  const resto = await makeCategory(context, "Restaurants", "expense", food);

  await makeTx(context, {
    accountId,
    amount: -6_000,
    date: new Date("2026-03-02"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -2_000,
    date: new Date("2026-03-12"),
    categoryId: resto,
  });
  await makeTx(context, {
    accountId,
    amount: -1_000,
    date: new Date("2026-03-13"),
    categoryId: resto,
  });

  const report = await call(
    appRouter.reports.byCategory,
    { ...MARCH, groupId: food },
    { context }
  );

  expect(report.total).toBe(9_000);
  expect(report.categories).toEqual([
    { categoryId: courses, name: "Courses", total: 6_000 },
    { categoryId: resto, name: "Restaurants", total: 3_000 },
  ]);
});

test("reports.byCategory drills the null group down into ungrouped categories", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const grouped = await makeGroup(context, "Alimentation");
  const courses = await makeCategory(context, "Courses", "expense", grouped);
  const loose = await makeCategory(context, "Divers", "expense"); // no group

  await makeTx(context, {
    accountId,
    amount: -4_000,
    date: new Date("2026-03-02"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -2_500,
    date: new Date("2026-03-09"),
    categoryId: loose,
  });

  const report = await call(
    appRouter.reports.byCategory,
    { ...MARCH, groupId: null },
    { context }
  );

  expect(report.categories).toEqual([
    { categoryId: loose, name: "Divers", total: 2_500 },
  ]);
});

test("reports procedures reject a period whose start is after its end", async () => {
  const context = createTestContext();
  await expect(
    call(
      appRouter.reports.byGroup,
      { from: new Date("2026-03-31"), to: new Date("2026-03-01") },
      { context }
    )
  ).rejects.toThrow();
});

// A whole quarter, in UTC so month bucketing is deterministic wherever the test
// runs (see `reports.cashFlow`, which buckets by UTC calendar month).
const Q1 = {
  from: new Date("2026-01-01T00:00:00Z"),
  to: new Date("2026-03-31T23:59:59.999Z"),
};

test("reports.cashFlow splits income and expenses per month over the period", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const salary = await makeCategory(context, "Salaire", "income");
  const courses = await makeCategory(context, "Courses", "expense");

  // January: 2000 in, 500 out.
  await makeTx(context, {
    accountId,
    amount: 200_000,
    date: new Date("2026-01-05T00:00:00Z"),
    categoryId: salary,
  });
  await makeTx(context, {
    accountId,
    amount: -50_000,
    date: new Date("2026-01-20T00:00:00Z"),
    categoryId: courses,
  });
  // February: nothing — the month must still appear, at zero.
  // March: 2000 in, 300 out.
  await makeTx(context, {
    accountId,
    amount: 200_000,
    date: new Date("2026-03-05T00:00:00Z"),
    categoryId: salary,
  });
  await makeTx(context, {
    accountId,
    amount: -30_000,
    date: new Date("2026-03-25T00:00:00Z"),
    categoryId: courses,
  });

  const report = await call(appRouter.reports.cashFlow, Q1, { context });

  expect(report.months).toEqual([
    { month: "2026-01", income: 200_000, expenses: 50_000, net: 150_000 },
    { month: "2026-02", income: 0, expenses: 0, net: 0 },
    { month: "2026-03", income: 200_000, expenses: 30_000, net: 170_000 },
  ]);
  expect(report.income).toBe(400_000);
  expect(report.expenses).toBe(80_000);
  expect(report.net).toBe(320_000);
});

test("reports.cashFlow never counts internal transfers on either side", async () => {
  const context = createTestContext();
  const from = await makeAccount(context, "Compte courant", 1_000_000);
  const to = await makeAccount(context, "Livret", 0);
  const salary = await makeCategory(context, "Salaire", "income");
  const courses = await makeCategory(context, "Courses", "expense");

  await makeTx(context, {
    accountId: from,
    amount: 200_000,
    date: new Date("2026-02-03T00:00:00Z"),
    categoryId: salary,
  });
  await makeTx(context, {
    accountId: from,
    amount: -50_000,
    date: new Date("2026-02-10T00:00:00Z"),
    categoryId: courses,
  });
  // Moving one's own money — a leg on each account — is neither income nor an
  // expense, so it must not shift either column.
  await call(
    appRouter.transfers.create,
    {
      fromAccountId: from,
      toAccountId: to,
      amount: 100_000,
      date: new Date("2026-02-15T00:00:00Z"),
    },
    { context }
  );

  const report = await call(appRouter.reports.cashFlow, Q1, { context });

  const february = report.months.find((m) => m.month === "2026-02");
  expect(february).toEqual({
    month: "2026-02",
    income: 200_000,
    expenses: 50_000,
    net: 150_000,
  });
  expect(report.income).toBe(200_000);
  expect(report.expenses).toBe(50_000);
  // A transfer leg has no category but is not an uncategorized movement.
  expect(report.uncategorizedCount).toBe(0);
});

test("reports.cashFlow separates by category kind, not by amount sign", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const salary = await makeCategory(context, "Salaire", "income");
  const courses = await makeCategory(context, "Courses", "expense");

  // An expense-kind refund (positive) nets against the expense column rather
  // than being read as income: 500 out, 100 back = 400 net expense.
  await makeTx(context, {
    accountId,
    amount: -50_000,
    date: new Date("2026-01-08T00:00:00Z"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: 10_000,
    date: new Date("2026-01-09T00:00:00Z"),
    categoryId: courses,
  });
  // An income-kind clawback (negative) nets against income: 300 in, 50 back.
  await makeTx(context, {
    accountId,
    amount: 30_000,
    date: new Date("2026-01-10T00:00:00Z"),
    categoryId: salary,
  });
  await makeTx(context, {
    accountId,
    amount: -5_000,
    date: new Date("2026-01-11T00:00:00Z"),
    categoryId: salary,
  });

  const report = await call(appRouter.reports.cashFlow, Q1, { context });

  const january = report.months.find((m) => m.month === "2026-01");
  expect(january).toEqual({
    month: "2026-01",
    income: 25_000,
    expenses: 40_000,
    net: -15_000,
  });
});

test("reports.cashFlow ignores uncategorized movements", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const salary = await makeCategory(context, "Salaire", "income");
  const courses = await makeCategory(context, "Courses", "expense");

  await makeTx(context, {
    accountId,
    amount: 100_000,
    date: new Date("2026-01-05T00:00:00Z"),
    categoryId: salary,
  });
  await makeTx(context, {
    accountId,
    amount: -20_000,
    date: new Date("2026-01-06T00:00:00Z"),
    categoryId: courses,
  });
  // No category — no income/expense type, so it belongs to neither column.
  await makeTx(context, {
    accountId,
    amount: -9_999,
    date: new Date("2026-01-07T00:00:00Z"),
  });
  await makeTx(context, {
    accountId,
    amount: 8_888,
    date: new Date("2026-01-08T00:00:00Z"),
    categoryId: null,
  });

  const report = await call(appRouter.reports.cashFlow, Q1, { context });

  expect(report.income).toBe(100_000);
  expect(report.expenses).toBe(20_000);
  // The two uncategorized movements are counted so the renderer can flag the
  // report as incomplete, even though they sit in neither column.
  expect(report.uncategorizedCount).toBe(2);
});

test("reports.cashFlow counts only movements within the period", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);
  const courses = await makeCategory(context, "Courses", "expense");

  await makeTx(context, {
    accountId,
    amount: -30_000,
    date: new Date("2026-02-15T00:00:00Z"),
    categoryId: courses,
  });
  // Just outside the quarter on both ends — must not appear.
  await makeTx(context, {
    accountId,
    amount: -9_999,
    date: new Date("2025-12-31T00:00:00Z"),
    categoryId: courses,
  });
  await makeTx(context, {
    accountId,
    amount: -8_888,
    date: new Date("2026-04-01T00:00:00Z"),
    categoryId: courses,
  });

  const report = await call(appRouter.reports.cashFlow, Q1, { context });

  expect(report.months.map((m) => m.month)).toEqual([
    "2026-01",
    "2026-02",
    "2026-03",
  ]);
  expect(report.expenses).toBe(30_000);
  expect(report.income).toBe(0);
});

test("reports.cashFlow rejects a period whose start is after its end", async () => {
  const context = createTestContext();
  await expect(
    call(
      appRouter.reports.cashFlow,
      { from: new Date("2026-03-31"), to: new Date("2026-01-01") },
      { context }
    )
  ).rejects.toThrow();
});
