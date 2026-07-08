import { base } from "src/context";

import { storedMapping } from "../utils/stored-mapping";
import { getMappingSchema } from "../validators";

export const getMappingBase = base.input(getMappingSchema);

/**
 * The column mapping remembered from the account's previous imports, or
 * `null` before the first one — the renderer shows the mapping step only
 * when this is null.
 */
export const getMappingHandler = getMappingBase.handler(
  async ({ context, input }) => {
    return storedMapping(context.db, input.accountId);
  }
);
