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
