import { ORPCError } from "@orpc/server";

export const transferNotFound = (
  id: string
): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", { message: `No transfer with id ${id}` });
