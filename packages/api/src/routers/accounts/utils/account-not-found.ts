import { ORPCError } from "@orpc/server";

export const accountNotFound = (
  id: number
): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No account with id ${id}` });
