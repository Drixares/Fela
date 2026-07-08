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
