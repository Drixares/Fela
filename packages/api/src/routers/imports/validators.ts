import z from "zod";

const idSchema = z.int().positive();

/** Column indexes (0-based) for the three values an import needs. */
export const mappingSchema = z.object({
  dateColumn: z.int().nonnegative(),
  amountColumn: z.int().nonnegative(),
  labelColumn: z.int().nonnegative(),
});

export type Mapping = z.infer<typeof mappingSchema>;

/**
 * The user's per-row corrections to the categories the rules announced in the
 * preview (issue #13), keyed by the same row identity the preview reported
 * (CSV line / OFX row index). `categoryId: null` un-classifies a row a rule
 * matched; an id classifies the row under that category instead.
 */
export const categoryOverrideSchema = z.object({
  categoryId: idSchema.nullable(),
});

export const inspectSchema = z.object({ content: z.string() });

export const getMappingSchema = z.object({ accountId: idSchema });

export const previewSchema = z.object({
  accountId: idSchema,
  content: z.string(),
  // Omitted after the first import — the memorised mapping takes over.
  mapping: mappingSchema.optional(),
});

export const commitSchema = z.object({
  accountId: idSchema,
  content: z.string(),
  // Omitted after the first import — the memorised mapping takes over.
  mapping: mappingSchema.optional(),
  // CSV lines (1-based, as `preview` reports them) the user judged false
  // positives and chose to import despite the probable-duplicate flag.
  forceLines: z.array(z.int().positive()).optional(),
  // Corrections to the categories the preview announced, keyed by the
  // same 1-based CSV lines. Untouched lines keep the rules' verdict; a
  // correction on a line that ends up skipped (a probable duplicate the
  // user didn't force) is deliberately ignored — the row writes nothing
  // to classify.
  categoryOverrides: categoryOverrideSchema
    .extend({ line: z.int().positive() })
    .array()
    .optional(),
});

export const previewOfxSchema = z.object({
  accountId: idSchema,
  content: z.string(),
});

export const commitOfxSchema = z.object({
  accountId: idSchema,
  content: z.string(),
  // Corrections to the categories the preview announced, keyed by the
  // row's 0-based position in the statement — the order `previewOfx`
  // reported. Untouched rows keep the rules' verdict; a correction on a
  // row that ends up skipped as a duplicate is deliberately ignored —
  // the row writes nothing to classify.
  categoryOverrides: categoryOverrideSchema
    .extend({ index: z.int().nonnegative() })
    .array()
    .optional(),
});
