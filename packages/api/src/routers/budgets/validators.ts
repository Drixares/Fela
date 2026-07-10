import z from "zod";

// "YYYY-MM" month key: readable, lexicographically sortable, timezone-independent.
const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format");
// Net income / total budget in minor units (cents); always positive.
const amountSchema = z.int().positive();

export const getBudgetSchema = z.object({ month: monthSchema });

export const seedFromPreviousSchema = z.object({ month: monthSchema });

export const applyToFutureSchema = z.object({ month: monthSchema });

export const createBudgetSchema = z.object({
  month: monthSchema,
  income: amountSchema,
  totalBudget: amountSchema,
});

export const updateBudgetSchema = z.object({
  month: monthSchema,
  income: amountSchema.optional(),
  totalBudget: amountSchema.optional(),
});

// A category id referenced by a budget line.
const categoryIdSchema = z.int().positive();

export const setLineSchema = z.object({
  month: monthSchema,
  categoryId: categoryIdSchema,
  // Allocated amount in minor units (cents); non-negative (0 is allowed — the
  // line still exists, it just carves out nothing).
  amount: z.int().nonnegative(),
});

export const removeLineSchema = z.object({
  month: monthSchema,
  categoryId: categoryIdSchema,
});
