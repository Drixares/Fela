import { call } from "@orpc/server";

import { base } from "../../context.js";
import {
  applyRetroactiveBase,
  applyRetroactiveHandler,
} from "./mutations/apply-retroactive.js";
import { createRuleBase, createRuleHandler } from "./mutations/create-rule.js";
import { deleteRuleBase, deleteRuleHandler } from "./mutations/delete-rule.js";
import {
  reorderRulesBase,
  reorderRulesHandler,
} from "./mutations/reorder-rules.js";
import { updateRuleBase, updateRuleHandler } from "./mutations/update-rule.js";
import { listRulesHandler } from "./queries/list-rules.js";
import {
  matchingCountBase,
  matchingCountHandler,
} from "./queries/matching-count.js";

/**
 * Categorization-rule procedures (see issue #13): « si le libellé contient X
 * → catégorie Y ». Rules classify *incoming* rows at import time; they never
 * rewrite the ledger. `sortOrder` is the application order — imports try the
 * rules lowest-first and the first match wins — so the management screen must
 * present the list in this exact order.
 */
export const rulesRouter = base.router({
  list: base.handler(async ({ context }) => {
    return await call(listRulesHandler, undefined, { context });
  }),

  create: createRuleBase.handler(async ({ context, input }) => {
    return await call(createRuleHandler, input, { context });
  }),

  update: updateRuleBase.handler(async ({ context, input }) => {
    return await call(updateRuleHandler, input, { context });
  }),

  delete: deleteRuleBase.handler(async ({ context, input }) => {
    return await call(deleteRuleHandler, input, { context });
  }),

  reorder: reorderRulesBase.handler(async ({ context, input }) => {
    return await call(reorderRulesHandler, input, { context });
  }),

  // Retroactive application (issue #15): how many existing rows a pattern would
  // reclassify, and — on explicit demand only — the reclassification itself.
  matchingCount: matchingCountBase.handler(async ({ context, input }) => {
    return await call(matchingCountHandler, input, { context });
  }),

  applyRetroactive: applyRetroactiveBase.handler(async ({ context, input }) => {
    return await call(applyRetroactiveHandler, input, { context });
  }),
});
