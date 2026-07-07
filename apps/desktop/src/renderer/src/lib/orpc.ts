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
