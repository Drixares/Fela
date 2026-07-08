import z from "zod";

const idSchema = z.int().positive();

// The closed date range every report procedure needs (see the V1 PRD #1, story
// 38): the period selector — « ce mois », « mois dernier », « 3/6/12 mois »,
// plage personnalisée — lives entirely in the renderer, so the API contract
// only ever knows the resulting bounds. `from`/`to` are inclusive instants; the
// renderer passes the last instant of the day for `to` (see
// `fromDateInputValueEndOfDay`). An inverted range is nonsensical, so both
// schemas reject it — the predicate and its message are shared to stay in step.
const boundsShape = { from: z.date(), to: z.date() };
const inOrder = (p: { from: Date; to: Date }): boolean => p.from <= p.to;
const ORDER_ERROR = "The period's start must not be after its end";

/** The plain period a report procedure takes. */
export const periodSchema = z
  .object(boundsShape)
  .refine(inOrder, { error: ORDER_ERROR });

/**
 * A period plus the group being drilled into (see issue #14). `groupId` is
 * `null` to drill into the categories that belong to no group — the same
 * « Sans groupe » bucket the group-level breakdown surfaces.
 */
export const groupBreakdownSchema = z
  .object({ ...boundsShape, groupId: idSchema.nullable() })
  .refine(inOrder, { error: ORDER_ERROR });
