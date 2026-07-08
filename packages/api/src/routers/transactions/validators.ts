import z from "zod";

const idSchema = z.int().positive();
// Signed minor units (cents): negative = outflow, positive = inflow. A zero
// movement is meaningless, so it is rejected rather than stored as noise.
const amountSchema = z
  .int()
  .refine((n) => n !== 0, { error: "Amount must not be zero" });
// Free-text fields; blank input is normalised to null (see normalizeText).
const payeeSchema = z.string().max(200).nullish();
const noteSchema = z.string().max(1000).nullish();

/**
 * Combinable filters over the ledger (see issue #9). Every field is optional
 * and they compose with AND, so the list narrows as filters stack.
 *
 * `categoryId` carries three states: absent = any category, an id = that
 * category only, `null` = uncategorized. The `null` case excludes transfer
 * legs — they carry no category by design, so they are never a filing todo.
 *
 * `minAmount`/`maxAmount` bound the amount's *magnitude* in minor units: a
 * person thinks « plus de 30 € » whatever the direction, while storage is
 * signed.
 */
export const listFiltersSchema = z
  .object({
    accountId: idSchema.optional(),
    categoryId: idSchema.nullish(),
    search: z.string().max(200).optional(),
    from: z.date().optional(),
    to: z.date().optional(),
    minAmount: z.int().nonnegative().optional(),
    maxAmount: z.int().nonnegative().optional(),
  })
  .optional();

export const createTransactionSchema = z.object({
  accountId: idSchema,
  amount: amountSchema,
  date: z.date(),
  payee: payeeSchema,
  categoryId: idSchema.nullish(),
  note: noteSchema,
});

export const updateTransactionSchema = z.object({
  id: idSchema,
  accountId: idSchema.optional(),
  amount: amountSchema.optional(),
  date: z.date().optional(),
  payee: payeeSchema,
  categoryId: idSchema.nullish(),
  note: noteSchema,
});

export const deleteTransactionSchema = z.object({ id: idSchema });

export const bulkCategorizeSchema = z.object({
  ids: z.array(idSchema).min(1),
  categoryId: idSchema.nullable(),
});
