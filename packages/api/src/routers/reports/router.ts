import { call } from "@orpc/server";

import { base } from "../../context.js";
import { byCategoryBase, byCategoryHandler } from "./queries/by-category.js";
import { byGroupBase, byGroupHandler } from "./queries/by-group.js";
import { cashFlowBase, cashFlowHandler } from "./queries/cash-flow.js";

/**
 * Report procedures — « où part mon argent ? » and « est-ce que je vis au-dessus
 * de mes moyens ? » (see the V1 PRD, #1, and issues #14 and #16). Expenses over
 * a chosen period broken down by category group, then by category on drill-down;
 * and the monthly cash flow, income vs expenses. The transactions of a category
 * are read back through `transactions.list` filtered by category and period, so
 * this router only owns the aggregation.
 *
 * Every procedure takes date bounds and nothing else: the period selector (« ce
 * mois », « mois dernier », « 3/6/12 mois », plage personnalisée) is a renderer
 * concern, and the contract only ever knows `from`/`to`. All aggregation runs
 * in SQL — transfers excluded, uncategorized outflows surfaced — so reports are
 * never silently wrong.
 */
export const reportsRouter = base.router({
  byGroup: byGroupBase.handler(async ({ context, input }) => {
    return await call(byGroupHandler, input, { context });
  }),

  byCategory: byCategoryBase.handler(async ({ context, input }) => {
    return await call(byCategoryHandler, input, { context });
  }),

  cashFlow: cashFlowBase.handler(async ({ context, input }) => {
    return await call(cashFlowHandler, input, { context });
  }),
});
