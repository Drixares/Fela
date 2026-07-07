import { base } from "../../context.js";
import { z } from "zod/mini";

export const testRouter = base.router({
  log: base.input(z.object({ message: z.string() })).handler(({ input }) => {
    console.log("[server]", input.message);

    return { receivedAt: new Date().toISOString() };
  }),
});
