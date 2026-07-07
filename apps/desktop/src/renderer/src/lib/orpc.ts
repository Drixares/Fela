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
 * A transaction row as the renderer receives it from `transactions.list` — the
 * movement plus the display names (account, and category when filed) resolved on
 * the server. Inferred from the client contract so it can never drift from what
 * the procedure returns.
 */
export type Transaction = Awaited<ReturnType<AppRouterClient['transactions']['list']>>[number]

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
