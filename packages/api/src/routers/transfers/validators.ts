import z from "zod";

const idSchema = z.int().positive();
// A transfer moves a strictly positive amount, in minor units (cents); the sign
// (which account loses, which gains) is carried by the two legs, not the input.
const amountSchema = z.int().positive();
// Free-text fields, shared by both legs; blank input collapses to null.
const payeeSchema = z.string().max(200).nullish();
const noteSchema = z.string().max(1000).nullish();
// A transferId is the shared uuid of the two legs (see createTransfer in @repo/db).
const transferIdSchema = z.string().min(1);

export const createTransferSchema = z.object({
  fromAccountId: idSchema,
  toAccountId: idSchema,
  amount: amountSchema,
  date: z.date(),
  payee: payeeSchema,
  note: noteSchema,
});

export const updateTransferSchema = z.object({
  transferId: transferIdSchema,
  fromAccountId: idSchema.optional(),
  toAccountId: idSchema.optional(),
  amount: amountSchema.optional(),
  date: z.date().optional(),
  payee: payeeSchema,
  note: noteSchema,
});

export const deleteTransferSchema = z.object({
  transferId: transferIdSchema,
});
