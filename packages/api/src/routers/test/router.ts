import { os } from "@orpc/server";
import { z } from "zod/mini";

export const testRouter = os.router({
  log: os.input(z.object({ message: z.string() })).handler(({ input }) => {
    console.log("[server]", input.message);

    return { receivedAt: new Date().toISOString() };
  }),
});
