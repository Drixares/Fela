import { transactions } from "@repo/db";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type z from "zod";

import type { listFiltersSchema } from "../validators";

export type ListFilters = NonNullable<z.output<typeof listFiltersSchema>>;

/**
 * Translate the list filters into one SQL WHERE clause — filtering happens in
 * the database, never by sifting rows in JS, so the same clause can drive both
 * the rows query and the aggregates query and the two can never disagree.
 */
export function listFilterClause(
  input: ListFilters | undefined
): SQL | undefined {
  if (!input) return undefined;
  const conditions: SQL[] = [];

  if (input.accountId !== undefined) {
    conditions.push(eq(transactions.accountId, input.accountId));
  }

  if (input.categoryId === null) {
    conditions.push(isNull(transactions.categoryId));
    conditions.push(isNull(transactions.transferId));
  } else if (input.categoryId !== undefined) {
    conditions.push(eq(transactions.categoryId, input.categoryId));
  }

  const search = input.search?.trim();
  if (search) {
    // Escape LIKE's wildcards so the person's text is matched literally.
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      sql`(${transactions.payee} LIKE ${pattern} ESCAPE '\\' OR ${transactions.note} LIKE ${pattern} ESCAPE '\\')`
    );
  }

  if (input.from !== undefined) {
    conditions.push(gte(transactions.date, input.from));
  }
  if (input.to !== undefined) {
    conditions.push(lte(transactions.date, input.to));
  }

  if (input.minAmount !== undefined) {
    conditions.push(sql`abs(${transactions.amount}) >= ${input.minAmount}`);
  }
  if (input.maxAmount !== undefined) {
    conditions.push(sql`abs(${transactions.amount}) <= ${input.maxAmount}`);
  }

  return and(...conditions);
}
