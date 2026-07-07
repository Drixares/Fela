import { call } from "@orpc/server";
import { categories, seedDefaultCategories, transactions } from "@repo/db";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";

import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/** A checking account to hang transactions off of in the move/delete tests. */
async function anAccount(context: ReturnType<typeof createTestContext>) {
  return call(
    appRouter.accounts.create,
    { name: "Compte courant", type: "checking" },
    { context }
  );
}

// ── Seed ────────────────────────────────────────────────────────────────────

test("seedDefaultCategories fills a fresh database with the French default set", async () => {
  const context = createTestContext();

  const seeded = seedDefaultCategories(context.db);
  expect(seeded).toBe(true);

  const overview = await call(appRouter.categories.overview, undefined, {
    context,
  });

  // ~8 groups, ~25 categories, all grouped (nothing ungrouped in the seed).
  expect(overview.groups.length).toBeGreaterThanOrEqual(8);
  const total = overview.groups.reduce((n, g) => n + g.categories.length, 0);
  expect(total).toBeGreaterThanOrEqual(25);
  expect(overview.ungrouped).toEqual([]);

  // Revenus comes first (sortOrder) and holds income categories.
  expect(overview.groups[0]?.name).toBe("Revenus");
  expect(overview.groups[0]?.categories.every((c) => c.kind === "income")).toBe(
    true
  );
});

test("seedDefaultCategories never re-seeds a database that already has data", async () => {
  const context = createTestContext();

  expect(seedDefaultCategories(context.db)).toBe(true);
  const afterFirst = context.db.select().from(categories).all().length;

  // Even after the user deletes part of the set, a second run is a no-op.
  const first = context.db.select().from(categories).all()[0]!;
  context.db.delete(categories).where(eq(categories.id, first.id)).run();

  expect(seedDefaultCategories(context.db)).toBe(false);
  expect(context.db.select().from(categories).all().length).toBe(
    afterFirst - 1
  );
});

// ── Groups ──────────────────────────────────────────────────────────────────

test("createGroup, renameGroup then the overview reflects both", async () => {
  const context = createTestContext();

  const group = await call(
    appRouter.categories.createGroup,
    { name: "Logement" },
    { context }
  );
  expect(group).toMatchObject({ name: "Logement" });
  expect(group.id).toBeGreaterThan(0);

  const renamed = await call(
    appRouter.categories.renameGroup,
    { id: group.id, name: "Maison" },
    { context }
  );
  expect(renamed.name).toBe("Maison");

  const overview = await call(appRouter.categories.overview, undefined, {
    context,
  });
  expect(overview.groups.map((g) => g.name)).toEqual(["Maison"]);
});

test("deleteGroup removes the group but keeps its categories, now ungrouped", async () => {
  const context = createTestContext();
  const account = await anAccount(context);

  const group = await call(
    appRouter.categories.createGroup,
    { name: "Logement" },
    { context }
  );
  const category = await call(
    appRouter.categories.create,
    { name: "Loyer", kind: "expense", groupId: group.id },
    { context }
  );
  // A transaction classified under that category.
  context.db
    .insert(transactions)
    .values({
      accountId: account.id,
      categoryId: category.id,
      amount: -1000,
      date: new Date(),
    })
    .run();

  await call(appRouter.categories.deleteGroup, { id: group.id }, { context });

  const overview = await call(appRouter.categories.overview, undefined, {
    context,
  });
  expect(overview.groups).toEqual([]);
  expect(overview.ungrouped.map((c) => c.name)).toEqual(["Loyer"]);

  // The transaction still points at the surviving category.
  const rows = context.db
    .select()
    .from(transactions)
    .where(eq(transactions.categoryId, category.id))
    .all();
  expect(rows).toHaveLength(1);
});

test("renameGroup on a missing group rejects", async () => {
  const context = createTestContext();
  await expect(
    call(appRouter.categories.renameGroup, { id: 999, name: "X" }, { context })
  ).rejects.toThrow();
});

// ── Categories ────────────────────────────────────────────────────────────────

test("create rejects a blank name and an unknown kind", async () => {
  const context = createTestContext();

  await expect(
    call(
      appRouter.categories.create,
      { name: "  ", kind: "expense" },
      { context }
    )
  ).rejects.toThrow();

  await expect(
    call(
      appRouter.categories.create,
      // @ts-expect-error — exercising a kind the contract forbids
      { name: "Bizarre", kind: "transfer" },
      { context }
    )
  ).rejects.toThrow();
});

test("create rejects a groupId that does not exist", async () => {
  const context = createTestContext();
  await expect(
    call(
      appRouter.categories.create,
      { name: "Loyer", kind: "expense", groupId: 999 },
      { context }
    )
  ).rejects.toThrow();
});

test("update renames and retypes a category", async () => {
  const context = createTestContext();
  const category = await call(
    appRouter.categories.create,
    { name: "Salaire", kind: "income" },
    { context }
  );

  const updated = await call(
    appRouter.categories.update,
    { id: category.id, name: "Salaire net", kind: "income" },
    { context }
  );
  expect(updated).toMatchObject({ name: "Salaire net", kind: "income" });
});

test("move a category between groups, and out of any group, keeps its transactions", async () => {
  const context = createTestContext();
  const account = await anAccount(context);

  const from = await call(
    appRouter.categories.createGroup,
    { name: "Logement" },
    { context }
  );
  const to = await call(
    appRouter.categories.createGroup,
    { name: "Charges" },
    { context }
  );
  const category = await call(
    appRouter.categories.create,
    { name: "Électricité", kind: "expense", groupId: from.id },
    { context }
  );
  context.db
    .insert(transactions)
    .values({
      accountId: account.id,
      categoryId: category.id,
      amount: -5000,
      date: new Date(),
    })
    .run();

  // Move into another group…
  const moved = await call(
    appRouter.categories.move,
    { id: category.id, groupId: to.id },
    { context }
  );
  expect(moved.groupId).toBe(to.id);

  // …then out of any group.
  const ungrouped = await call(
    appRouter.categories.move,
    { id: category.id, groupId: null },
    { context }
  );
  expect(ungrouped.groupId).toBeNull();

  // The classified transaction survived both moves untouched.
  const rows = context.db
    .select()
    .from(transactions)
    .where(eq(transactions.categoryId, category.id))
    .all();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.amount).toBe(-5000);
});

test("delete a category reassigns its transactions to another category", async () => {
  const context = createTestContext();
  const account = await anAccount(context);

  const old = await call(
    appRouter.categories.create,
    { name: "Divers", kind: "expense" },
    { context }
  );
  const keep = await call(
    appRouter.categories.create,
    { name: "Courses", kind: "expense" },
    { context }
  );
  context.db
    .insert(transactions)
    .values([
      {
        accountId: account.id,
        categoryId: old.id,
        amount: -1000,
        date: new Date(),
      },
      {
        accountId: account.id,
        categoryId: old.id,
        amount: -2000,
        date: new Date(),
      },
    ])
    .run();

  const result = await call(
    appRouter.categories.delete,
    { id: old.id, reassignToId: keep.id },
    { context }
  );
  expect(result.reassigned).toBe(2);

  // The old category is gone…
  const remaining = context.db
    .select()
    .from(categories)
    .where(eq(categories.id, old.id))
    .all();
  expect(remaining).toHaveLength(0);

  // …and both transactions now belong to the kept category — no orphans.
  const moved = context.db
    .select()
    .from(transactions)
    .where(eq(transactions.categoryId, keep.id))
    .all();
  expect(moved).toHaveLength(2);
});

test("delete without a reassignment target leaves its transactions uncategorised", async () => {
  const context = createTestContext();
  const account = await anAccount(context);

  const category = await call(
    appRouter.categories.create,
    { name: "Divers", kind: "expense" },
    { context }
  );
  const tx = context.db
    .insert(transactions)
    .values({
      accountId: account.id,
      categoryId: category.id,
      amount: -1000,
      date: new Date(),
    })
    .returning()
    .get();

  await call(appRouter.categories.delete, { id: category.id }, { context });

  const row = context.db
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id))
    .get();
  expect(row?.categoryId).toBeNull();
});

test("delete rejects reassigning to the category being deleted", async () => {
  const context = createTestContext();
  const category = await call(
    appRouter.categories.create,
    { name: "Divers", kind: "expense" },
    { context }
  );
  await expect(
    call(
      appRouter.categories.delete,
      { id: category.id, reassignToId: category.id },
      { context }
    )
  ).rejects.toThrow();
});

test("createGroup appends new groups after existing ones", async () => {
  const context = createTestContext();
  await call(appRouter.categories.createGroup, { name: "A" }, { context });
  await call(appRouter.categories.createGroup, { name: "B" }, { context });

  const overview = await call(appRouter.categories.overview, undefined, {
    context,
  });
  // Assigned sortOrder preserves creation order, not alphabetical.
  expect(overview.groups.map((g) => g.name)).toEqual(["A", "B"]);
});
