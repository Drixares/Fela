import z from "zod";

export const listAccountsSchema = z
  .object({ includeArchived: z.boolean().default(false) })
  .optional();
