import { ORPCError } from "@orpc/server";

export const groupNotFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No category group with id ${id}` });

export const categoryNotFound = (
  id: number
): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No category with id ${id}` });
