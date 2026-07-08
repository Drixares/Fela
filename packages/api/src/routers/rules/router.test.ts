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
