import { os } from "@orpc/server";
import { messages } from "@repo/db";
import { z } from "zod/mini";
import type { ServerContext } from "../../context.js";

const base = os.$context<ServerContext>();

export const messagesRouter = base.router({
  add: base
    .input(z.object({ content: z.string().check(z.minLength(1)) }))
    .handler(async ({ input, context }) => {
      const [message] = await context.db
        .insert(messages)
        .values({ content: input.content })
        .returning();

      return message;
    }),
});
