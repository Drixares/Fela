import { ORPCError } from "@orpc/server";

export const transactionNotFound = (
  id: number
): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No transaction with id ${id}` });
