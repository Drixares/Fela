import z from "zod";

import { ACCOUNT_TYPES } from "src/client";

const accountTypeSchema = z.enum(ACCOUNT_TYPES);
const nameSchema = z.string().trim().min(1).max(100);
// Opening balance in minor units (cents); may be negative (e.g. an overdraft).
const balanceSchema = z.int();
const idSchema = z.int().positive();

export const listAccountsSchema = z
  .object({ includeArchived: z.boolean().default(false) })
  .optional();

export const createAccountSchema = z.object({
  name: nameSchema,
  type: accountTypeSchema,
  initialBalance: balanceSchema.default(0),
});

export const updateAccountSchema = z.object({
  id: idSchema,
  name: nameSchema.optional(),
  type: accountTypeSchema.optional(),
  initialBalance: balanceSchema.optional(),
});

export const archiveAccountSchema = z.object({
  id: idSchema,
  archived: z.boolean().default(true),
});
