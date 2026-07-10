import { ORPCError } from "@orpc/server";

export const budgetNotFound = (
  month: string
): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No budget for month ${month}` });

export const budgetAlreadyExists = (
  month: string
): ORPCError<"CONFLICT", undefined> =>
  new ORPCError("CONFLICT", {
    message: `A budget already exists for month ${month}`,
  });
