import { base } from "src/context";

import { retroactiveMatchIds } from "../utils/retroactive-matches";
import { matchingCountSchema } from "../validators";

export const matchingCountBase = base.input(matchingCountSchema);

/**
 * How many existing transactions the pattern would reclassify to the target
 * category (issue #15) — the number behind the « N transactions existantes
 * correspondent » offer shown at rule creation. Counts only rows that would
 * actually change (see {@link retroactiveMatchIds}); it writes nothing.
 */
export const matchingCountHandler = matchingCountBase.handler(
  ({ context, input }) => {
    const ids = retroactiveMatchIds(
      context.db,
      input.pattern,
      input.categoryId
    );
    return { count: ids.length };
  }
);
