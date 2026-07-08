import { call } from "@orpc/server";

import { base } from "../../context.js";
import { commitOfxBase, commitOfxHandler } from "./mutations/commit-ofx.js";
import { commitBase, commitHandler } from "./mutations/commit-csv.js";
import { getMappingBase, getMappingHandler } from "./queries/get-mapping.js";
import { inspectBase, inspectHandler } from "./queries/inspect.js";
import { previewBase, previewHandler } from "./queries/preview-csv.js";
import { previewOfxBase, previewOfxHandler } from "./queries/preview-ofx.js";

/**
 * CSV and OFX import procedures (see the V1 PRD, #1, and issues #8 and #11).
 * The main process reads the chosen file and passes its **content as a
 * string** — never a path. `inspect` and the previews are pure computation;
 * only `commit` / `commitOfx` write, each in one SQL transaction.
 */
export const importsRouter = base.router({
  inspect: inspectBase.handler(async ({ context, input }) => {
    return await call(inspectHandler, input, { context });
  }),

  preview: previewBase.handler(async ({ context, input }) => {
    return await call(previewHandler, input, { context });
  }),

  commit: commitBase.handler(async ({ context, input }) => {
    return await call(commitHandler, input, { context });
  }),

  getMapping: getMappingBase.handler(async ({ context, input }) => {
    return await call(getMappingHandler, input, { context });
  }),

  previewOfx: previewOfxBase.handler(async ({ context, input }) => {
    return await call(previewOfxHandler, input, { context });
  }),

  commitOfx: commitOfxBase.handler(async ({ context, input }) => {
    return await call(commitOfxHandler, input, { context });
  }),
});
