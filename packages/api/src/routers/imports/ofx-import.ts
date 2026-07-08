/**
 * Pure OFX-import computation: parsing the OFX grammar and coercing each
 * statement transaction into a ledger row. No database access — the router
 * queries and writes; this module only transforms (see issue #11).
 *
 * Unlike CSV, OFX carries its own field tags, so there is no column-mapping
 * step: every value is read by name. Dedup is exact rather than heuristic —
 * each movement carries a bank-assigned transaction id (FITID) that re-exports
 * of overlapping periods repeat verbatim.
 *
 * Every failure throws {@link OfxImportError} with a French message precise
 * enough to show the user; the router surfaces it as a BAD_REQUEST and nothing
 * is written.
 */

/**
 * An OFX import refusal — unreadable file or an unusable transaction value.
 *
 * Like {@link CsvImportError}, these messages are French product copy: the
 * import dialog shows them verbatim so the user knows what was refused.
 */
export class OfxImportError extends Error {}

/** One statement transaction coerced into ledger values. */
export interface OfxRow {
  /** The bank's own transaction id — the exact dedup key. */
  fitid: string;
  date: Date;
  /** Signed minor units (cents): negative = outflow. */
  amount: number;
  label: string;
}

/** An OFX row tagged with its dedup verdict. */
export interface FlaggedOfxRow extends OfxRow {
  /** True when a stored row on the account already carries the same FITID. */
  duplicate: boolean;
}

/**
 * Tag each row as new or duplicate against the FITIDs already stored on the
 * account. Set semantics — a FITID identifies one movement, so any repeat (a
 * stored one, or a second occurrence within the same file) is a duplicate.
 */
export function flagOfxDuplicates(
  rows: OfxRow[],
  storedIds: Set<string>
): FlaggedOfxRow[] {
  const seen = new Set(storedIds);
  return rows.map((row) => {
    const duplicate = seen.has(row.fitid);
    seen.add(row.fitid);
    return { ...row, duplicate };
  });
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decode the handful of XML/SGML entities an OFX value may carry. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Read a leaf element's value from an aggregate block. OFX 1.x SGML leaves the
 * closing tag off leaf elements, so the value runs from `<TAG>` to the next
 * `<` (which starts the next tag); OFX 2.x XML closes them, which this reads
 * the same way. Returns undefined if the tag is absent.
 */
function readField(block: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<]*)`, "i").exec(block);
  return match ? decodeEntities(match[1]!).trim() : undefined;
}

/**
 * Parse an OFX date/time (`DTPOSTED`) into a UTC-midnight date. OFX stamps are
 * `YYYYMMDD` optionally followed by `HHMMSS`, milliseconds and a timezone — we
 * keep only the posting day, matching the CSV path's calendar-day granularity.
 *
 * @throws OfxImportError on a value that is not a real calendar date.
 */
function parseOfxDate(value: string, fitid: string): Date {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!match) {
    throw new OfxImportError(
      `Transaction ${fitid} : impossible de lire « ${value.trim()} » comme une date`
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!roundTrips) {
    throw new OfxImportError(
      `Transaction ${fitid} : « ${value.trim()} » n'est pas une date du calendrier`
    );
  }
  return date;
}

/**
 * Parse an OFX amount (`TRNAMT`) into signed minor units (cents). The spec uses
 * a plain decimal with `.` or `,` as the separator and no thousands grouping.
 *
 * @throws OfxImportError on a value that is not a number.
 */
function parseOfxAmount(value: string, fitid: string): number {
  const cell = value.trim().replace(",", ".");
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(cell)) {
    throw new OfxImportError(
      `Transaction ${fitid} : impossible de lire « ${value.trim()} » comme un montant`
    );
  }
  const cents = Math.round(Number(cell) * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new OfxImportError(
      `Transaction ${fitid} : montant « ${value.trim()} » hors limites`
    );
  }
  return cents;
}

/**
 * Extract every `<STMTTRN>` aggregate from an OFX file and coerce it into a
 * ledger row. Leaf values are read by {@link readField}.
 *
 * A file with no statement transaction is refused as unreadable. A transaction
 * missing its FITID, or with an unreadable date or amount, refuses the whole
 * file — imports stay all-or-nothing, exactly like the CSV path.
 */
export function parseOfx(content: string): OfxRow[] {
  // Bound each transaction by the opening `<STMTTRN>` tag rather than a matching
  // closing one: OFX 1.x SGML may leave aggregate tags unclosed, so a valid file
  // can have `<STMTTRN>` blocks with no `</STMTTRN>`. Each chunk runs to its
  // closing tag when present, else to the next `<STMTTRN>` (the split boundary);
  // readField reads the first matching leaf, so any trailing container tags left
  // on the final chunk are harmless.
  const chunks = content.split(/<STMTTRN>/i).slice(1);
  if (chunks.length === 0) {
    throw new OfxImportError(
      "Fichier illisible : aucune transaction OFX (<STMTTRN>) trouvée"
    );
  }

  return chunks.map((chunk) => {
    const block = chunk.split(/<\/STMTTRN>/i)[0]!;
    const fitid = readField(block, "FITID");
    if (!fitid) {
      throw new OfxImportError(
        "Fichier illisible : une transaction OFX n'a pas d'identifiant FITID"
      );
    }
    const rawDate = readField(block, "DTPOSTED");
    if (!rawDate) {
      throw new OfxImportError(
        `Transaction ${fitid} : date (DTPOSTED) absente`
      );
    }
    const rawAmount = readField(block, "TRNAMT");
    if (!rawAmount) {
      throw new OfxImportError(
        `Transaction ${fitid} : montant (TRNAMT) absent`
      );
    }
    // NAME is the payee; some banks put the useful text in MEMO instead. Either
    // is fine — the row's identity is the FITID, not its label.
    const label = readField(block, "NAME") ?? readField(block, "MEMO") ?? "";
    // Unlike the CSV path, a zero-amount row is kept rather than dropped as
    // noise: it carries the bank's FITID, so it is an identified, dedupable
    // movement, not a heuristic guess — dropping it would lose a statement line.
    return {
      fitid,
      date: parseOfxDate(rawDate, fitid),
      amount: parseOfxAmount(rawAmount, fitid),
      label,
    };
  });
}
