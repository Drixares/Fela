import z from "zod";

import { CATEGORY_KINDS } from "src/client";

const nameSchema = z.string().trim().min(1).max(100);
const kindSchema = z.enum(CATEGORY_KINDS);
const idSchema = z.int().positive();

export const createGroupSchema = z.object({ name: nameSchema });

export const renameGroupSchema = z.object({ id: idSchema, name: nameSchema });

export const deleteGroupSchema = z.object({ id: idSchema });

export const createCategorySchema = z.object({
  name: nameSchema,
  kind: kindSchema,
  groupId: idSchema.nullish(),
});

export const updateCategorySchema = z.object({
  id: idSchema,
  name: nameSchema.optional(),
  kind: kindSchema.optional(),
});

export const moveCategorySchema = z.object({
  id: idSchema,
  groupId: idSchema.nullable(),
});

export const deleteCategorySchema = z.object({
  id: idSchema,
  reassignToId: idSchema.optional(),
});
