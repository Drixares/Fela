import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouterClient } from '@repo/api/client'

/**
 * An account row as the renderer receives it — the account plus its derived
 * balance. Inferred from the client contract so it can never drift from what
 * the `accounts.list` procedure actually returns.
 */
export type Account = Awaited<ReturnType<AppRouterClient['accounts']['list']>>[number]

/**
 * The category tree the renderer receives from `categories.overview` — every
 * group with its leaf categories nested, plus the categories that belong to no
 * group. Inferred from the client contract so these types can never drift from
 * what the procedure returns.
 */
export type CategoriesOverview = Awaited<ReturnType<AppRouterClient['categories']['overview']>>
export type CategoryGroupWithCategories = CategoriesOverview['groups'][number]
export type Category = CategoryGroupWithCategories['categories'][number]

/**
 * A categorization rule as the renderer receives it from `rules.list` — « si
 * le libellé contient X → catégorie Y », in application order. Inferred from
 * the client contract so it can never drift from what the procedure returns.
 */
export type Rule = Awaited<ReturnType<AppRouterClient['rules']['list']>>[number]

/**
 * What the renderer receives from `transactions.list` — the rows matching the
 * filters plus their count and signed sum, aggregated in SQL. Each row is the
 * movement plus the display names (account, and category when filed) resolved on
 * the server. Inferred from the client contract so these types can never drift
 * from what the procedure returns.
 */
export type TransactionList = Awaited<ReturnType<AppRouterClient['transactions']['list']>>
export type Transaction = TransactionList['transactions'][number]

/**
 * The top-level expense breakdown the renderer receives from `reports.byGroup`
 * (see issue #14) — one segment per category group (a `null` group being the
 * « Sans groupe » bucket) plus the « Non classé » uncategorized total. Inferred
 * from the client contract so it can never drift from what the procedure returns.
 */
export type ExpensesByGroup = Awaited<ReturnType<AppRouterClient['reports']['byGroup']>>
export type ExpenseGroupSegment = ExpensesByGroup['groups'][number]

const { port1: clientPort, port2: serverPort } = new MessageChannel()

window.postMessage('start-orpc-client', '*', [serverPort])

const link = new RPCLink({ port: clientPort })

clientPort.start()

export const client: AppRouterClient = createORPCClient(link)

/**
 * TanStack Query utils bound to the oRPC client. Use these to drive queries and
 * mutations from components, e.g. `useQuery(orpc.accounts.list.queryOptions())`
 * or `useMutation(orpc.accounts.create.mutationOptions())`, instead of calling
 * the client directly inside effects.
 */
export const orpc = createTanstackQueryUtils(client)
