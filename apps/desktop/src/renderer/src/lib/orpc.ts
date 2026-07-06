import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import type { AppRouterClient } from '@repo/api/client'

const { port1: clientPort, port2: serverPort } = new MessageChannel()

window.postMessage('start-orpc-client', '*', [serverPort])

const link = new RPCLink({ port: clientPort })

clientPort.start()

export const client: AppRouterClient = createORPCClient(link)
