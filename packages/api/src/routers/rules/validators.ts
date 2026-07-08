import z from "zod";

const idSchema = z.int().positive();
// The substring looked for in incoming labels. Trimmed so an all-space
// pattern (which would match every label) is refused as empty.
const patternSchema = z.string().trim().min(1).max(100);

export const createRuleSchema = z.object({
  pattern: patternSchema,
  categoryId: idSchema,
});

export const updateRuleSchema = z.object({
  id: idSchema,
  pattern: patternSchema.optional(),
  categoryId: idSchema.optional(),
});

export const deleteRuleSchema = z.object({ id: idSchema });

export const reorderRulesSchema = z.object({ orderedIds: z.array(idSchema) });

/**
 * How many existing transactions a would-be rule (pattern + target category)
 * would reclassify (issue #15) — asked before the rule exists, so it takes the
 * pattern and target directly rather than a rule id, to offer « N transactions
 * existantes correspondent » at creation time.
 */
export const matchingCountSchema = z.object({
  pattern: patternSchema,
  categoryId: idSchema,
});

/**
 * Apply an existing rule to the transactions already in the ledger (issue #15).
 * Only ever runs on this explicit call — creating a rule never rewrites the
 * ledger — so the retroactive clean-up happens strictly on demand.
 */
export const applyRetroactiveSchema = z.object({ id: idSchema });
