import { call } from "@orpc/server";

import { base } from "../../context.js";
import {
  createBudgetBase,
  createBudgetHandler,
} from "./mutations/create-budget.js";
import { removeLineBase, removeLineHandler } from "./mutations/remove-line.js";
import {
  seedFromPreviousBase,
  seedFromPreviousHandler,
} from "./mutations/seed-from-previous.js";
import { setLineBase, setLineHandler } from "./mutations/set-line.js";
import {
  updateBudgetBase,
  updateBudgetHandler,
} from "./mutations/update-budget.js";
import { getBudgetBase, getBudgetHandler } from "./queries/get-budget.js";

/**
 * Monthly budget procedures — the Origin-style envelope (see roadmap decision
 * #13, reopened in `docs/adr/0001-origin-budget-model.md`): one net income plus
 * a total to distribute, with a derived "everything else" remainder. No YNAB
 * rollover, no cumulative money-to-assign.
 */
export const budgetsRouter = base.router({
  get: getBudgetBase
    .route({ method: "GET" })
    .handler(async ({ context, input }) => {
      return await call(getBudgetHandler, input, { context });
    }),

  create: createBudgetBase.handler(async ({ context, input }) => {
    return await call(createBudgetHandler, input, { context });
  }),

  seedFromPrevious: seedFromPreviousBase.handler(async ({ context, input }) => {
    return await call(seedFromPreviousHandler, input, { context });
  }),

  update: updateBudgetBase.handler(async ({ context, input }) => {
    return await call(updateBudgetHandler, input, { context });
  }),

  setLine: setLineBase.handler(async ({ context, input }) => {
    return await call(setLineHandler, input, { context });
  }),

  removeLine: removeLineBase.handler(async ({ context, input }) => {
    return await call(removeLineHandler, input, { context });
  }),
});
