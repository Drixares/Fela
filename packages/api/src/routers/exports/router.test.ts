import { call } from "@orpc/server";
import { expect, test } from "vitest";

import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/**
 * Fill a fresh database with one of everything the export must carry: two
 * accounts, a category group, a categorized manual transaction and a transfer
 * (two linked legs). Returns the created rows so tests can assert the export
 * against exactly what went in.
 */
async function seedLedger(context: ReturnType<typeof createTestContext>) {
  const checking = await call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking", initialBalance: 10_000 },
    { context }
  );
  const savings = await call(
    appRouter.accounts.create,
    { name: "Livret A", type: "savings" },
    { context }
  );

  const group = await call(
    appRouter.categories.createGroup,
    { name: "Alimentation" },
    { context }
  );
  const category = await call(
    appRouter.categories.create,
    { name: "Courses", kind: "expense", groupId: group.id },
    { context }
  );

  const groceries = await call(
    appRouter.transactions.create,
    {
      accountId: checking.id,
      amount: -2350,
      date: new Date("2026-07-01T00:00:00.000Z"),
      payee: "Carrefour",
      categoryId: category.id,
      note: "Courses de la semaine",
    },
    { context }
  );

  const transfer = await call(
    appRouter.transfers.create,
    {
      fromAccountId: checking.id,
      toAccountId: savings.id,
      amount: 5000,
      date: new Date("2026-07-02T00:00:00.000Z"),
      payee: "Épargne mensuelle",
    },
    { context }
  );

  return { checking, savings, group, category, groceries, transfer };
}

/**
 * The shape of a transaction row as the JSON export serialises it — what the
 * tests read back after `JSON.parse` (dates become ISO strings).
 */
interface ExportedTransaction {
  id: number;
  accountId: number;
  categoryId: number | null;
  amount: number;
  transferId: string | null;
}

// ── JSON ────────────────────────────────────────────────────────────────────

test("exports.json contains accounts, groups, categories and transactions exactly as stored", async () => {
  const context = createTestContext();
  const { checking, savings, group, category, groceries, transfer } =
    await seedLedger(context);

  const file = await call(appRouter.exports.json, undefined, { context });

  expect(file.fileName).toMatch(/^fela-export-\d{4}-\d{2}-\d{2}\.json$/);

  const data = JSON.parse(file.content) as Record<string, unknown> & {
    transactions: ExportedTransaction[];
  };

  expect(data.accounts).toEqual([
    {
      id: checking.id,
      name: "Compte courant",
      type: "checking",
      currency: "EUR",
      initialBalance: 10_000,
      archived: false,
      createdAt: checking.createdAt.toISOString(),
    },
    {
      id: savings.id,
      name: "Livret A",
      type: "savings",
      currency: "EUR",
      initialBalance: 0,
      archived: false,
      createdAt: savings.createdAt.toISOString(),
    },
  ]);

  expect(data.categoryGroups).toEqual([
    {
      id: group.id,
      name: "Alimentation",
      sortOrder: group.sortOrder,
      createdAt: group.createdAt.toISOString(),
    },
  ]);

  expect(data.categories).toEqual([
    {
      id: category.id,
      name: "Courses",
      kind: "expense",
      groupId: group.id,
      createdAt: category.createdAt.toISOString(),
    },
  ]);

  // Three movements: the manual entry plus the transfer's two legs.
  expect(data.transactions).toHaveLength(3);

  const manual = data.transactions.find((t) => t.id === groceries.id);
  expect(manual).toEqual({
    id: groceries.id,
    accountId: checking.id,
    categoryId: category.id,
    amount: -2350,
    date: "2026-07-01T00:00:00.000Z",
    payee: "Carrefour",
    note: "Courses de la semaine",
    transferId: null,
    importFingerprint: null,
    importExternalId: null,
    createdAt: groceries.createdAt.toISOString(),
  });

  // The transfer is identifiable: its two legs share the transferId, mirror
  // amounts across the two accounts and carry no category.
  const legs = data.transactions.filter(
    (t) => t.transferId === transfer.transferId
  );
  expect(legs).toHaveLength(2);
  expect(legs.map((l) => l.amount).sort((a, b) => a - b)).toEqual([
    -5000, 5000,
  ]);
  expect(legs.every((l) => l.categoryId === null)).toBe(true);
  expect(new Set(legs.map((l) => l.accountId))).toEqual(
    new Set([checking.id, savings.id])
  );
});

// ── CSV ─────────────────────────────────────────────────────────────────────

test("exports.csv lays every table out as a titled section, transfers identifiable", async () => {
  const context = createTestContext();
  const { checking, savings, group, category, groceries, transfer } =
    await seedLedger(context);

  const file = await call(appRouter.exports.csv, undefined, { context });

  expect(file.fileName).toMatch(/^fela-export-\d{4}-\d{2}-\d{2}\.csv$/);

  // One section per table, in a fixed order, separated by blank lines.
  const sections = file.content.split("\n\n");
  expect(sections.map((s) => s.split("\n")[0])).toEqual([
    "# accounts",
    "# categoryGroups",
    "# categories",
    "# transactions",
  ]);

  const [accountsSection, groupsSection, categoriesSection, txSection] =
    sections.map((s) => s.split("\n"));

  expect(accountsSection).toEqual([
    "# accounts",
    "id,name,type,currency,initialBalance,archived,createdAt",
    `${checking.id},Compte courant,checking,EUR,10000,false,${checking.createdAt.toISOString()}`,
    `${savings.id},Livret A,savings,EUR,0,false,${savings.createdAt.toISOString()}`,
  ]);

  expect(groupsSection).toEqual([
    "# categoryGroups",
    "id,name,sortOrder,createdAt",
    `${group.id},Alimentation,${group.sortOrder},${group.createdAt.toISOString()}`,
  ]);

  expect(categoriesSection).toEqual([
    "# categories",
    "id,name,kind,groupId,createdAt",
    `${category.id},Courses,expense,${group.id},${category.createdAt.toISOString()}`,
  ]);

  expect(txSection?.[1]).toBe(
    "id,accountId,categoryId,amount,date,payee,note,transferId,importFingerprint,importExternalId,createdAt"
  );
  const txRows = txSection!.slice(2);
  expect(txRows).toHaveLength(3);
  expect(txRows[0]).toBe(
    `${groceries.id},${checking.id},${category.id},-2350,2026-07-01T00:00:00.000Z,Carrefour,Courses de la semaine,,,,${groceries.createdAt.toISOString()}`
  );
  // The transfer's two legs carry the shared transferId in their own column.
  const legRows = txRows.filter((row) => row.includes(transfer.transferId));
  expect(legRows).toHaveLength(2);
  expect(legRows.some((row) => row.includes(",-5000,"))).toBe(true);
  expect(legRows.some((row) => row.includes(",5000,"))).toBe(true);
});

test("exports.csv quotes fields containing separators, quotes or newlines", async () => {
  const context = createTestContext();
  const account = await call(
    appRouter.accounts.create,
    { name: 'Compte "perso", joint', type: "checking" },
    { context }
  );
  await call(
    appRouter.transactions.create,
    {
      accountId: account.id,
      amount: -100,
      date: new Date("2026-07-03T00:00:00.000Z"),
      payee: "Boulangerie, place du marché",
      note: 'Dit "merci"\nsur deux lignes',
    },
    { context }
  );

  const file = await call(appRouter.exports.csv, undefined, { context });

  expect(file.content).toContain('"Compte ""perso"", joint"');
  expect(file.content).toContain('"Boulangerie, place du marché"');
  expect(file.content).toContain('"Dit ""merci""\nsur deux lignes"');
});

test("exports.json of an empty database yields empty collections", async () => {
  const context = createTestContext();

  const file = await call(appRouter.exports.json, undefined, { context });
  const data = JSON.parse(file.content);

  expect(data.accounts).toEqual([]);
  expect(data.categoryGroups).toEqual([]);
  expect(data.categories).toEqual([]);
  expect(data.transactions).toEqual([]);
});
