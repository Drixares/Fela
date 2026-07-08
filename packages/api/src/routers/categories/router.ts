import { call } from "@orpc/server";

import { base } from "../../context.js";
import {
  createCategoryBase,
  createCategoryHandler,
} from "./mutations/create-category.js";
import {
  createGroupBase,
  createGroupHandler,
} from "./mutations/create-group.js";
import {
  deleteCategoryBase,
  deleteCategoryHandler,
} from "./mutations/delete-category.js";
import {
  deleteGroupBase,
  deleteGroupHandler,
} from "./mutations/delete-group.js";
import {
  moveCategoryBase,
  moveCategoryHandler,
} from "./mutations/move-category.js";
import {
  renameGroupBase,
  renameGroupHandler,
} from "./mutations/rename-group.js";
import {
  updateCategoryBase,
  updateCategoryHandler,
} from "./mutations/update-category.js";
import { overviewHandler } from "./queries/overview.js";

/**
 * Category procedures — the two-level classification slice (see the V1 PRD, #1,
 * and issue #4). Categories are the leaf every transaction points at; groups are
 * an optional presentational level above them. Because transactions reference
 * only the leaf, groups can be renamed, deleted or reshuffled, and categories
 * moved between them, without ever touching — or corrupting — the ledger.
 *
 * Referential clean-up (un-grouping a group's categories, re-pointing a deleted
 * category's transactions) is done explicitly inside a SQL transaction rather
 * than via FK actions, since the app does not enable SQLite's foreign-key
 * enforcement. This keeps reports from ever silently losing a classification.
 */
export const categoriesRouter = base.router({
  overview: base.handler(async ({ context }) => {
    return await call(overviewHandler, undefined, { context });
  }),

  createGroup: createGroupBase.handler(async ({ context, input }) => {
    return await call(createGroupHandler, input, { context });
  }),

  renameGroup: renameGroupBase.handler(async ({ context, input }) => {
    return await call(renameGroupHandler, input, { context });
  }),

  deleteGroup: deleteGroupBase.handler(async ({ context, input }) => {
    return await call(deleteGroupHandler, input, { context });
  }),

  create: createCategoryBase.handler(async ({ context, input }) => {
    return await call(createCategoryHandler, input, { context });
  }),

  update: updateCategoryBase.handler(async ({ context, input }) => {
    return await call(updateCategoryHandler, input, { context });
  }),

  move: moveCategoryBase.handler(async ({ context, input }) => {
    return await call(moveCategoryHandler, input, { context });
  }),

  delete: deleteCategoryBase.handler(async ({ context, input }) => {
    return await call(deleteCategoryHandler, input, { context });
  }),
});
