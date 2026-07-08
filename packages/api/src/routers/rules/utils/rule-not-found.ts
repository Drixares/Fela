import { ORPCError } from "@orpc/server";

export const ruleNotFound = (id: number): ORPCError<"NOT_FOUND", undefined> =>
  new ORPCError("NOT_FOUND", {
    message: `No categorization rule with id ${id}`,
  });
