/**
 * Pure CSV-import computation: parsing the file grammar, applying a column
 * mapping, and coercing French bank-export values (dd/mm/yyyy dates, comma
 * decimals, space thousands separators) into ledger rows. No database access —
 * the router queries and writes; this module only transforms (see issue #8).
 *
 * Every failure throws {@link CsvImportError} with a message precise enough to
 * show the user which line and value were refused; the router surfaces it as a
 * BAD_REQUEST and nothing is written.
 */

/** A CSV import refusal — unreadable file, incoherent mapping or bad value. */
export class CsvImportError extends Error {}

/** Which column (0-based) holds each of the three values an import needs. */
export interface ColumnMapping {
  dateColumn: number;
  amountColumn: number;
  labelColumn: number;
}

/** The file split into records: one header row, then the data rows. */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** One data row coerced into ledger values, tagged with its 1-based CSV line. */
export interface ImportRow {
  line: number;
  date: Date;
  /** Signed minor units (cents): negative = outflow. */
  amount: number;
  label: string;
}

/** An import row tagged with its dedup identity and verdict. */
export interface FlaggedRow extends ImportRow {
  fingerprint: string;
  /** True when a stored row already carries the same fingerprint. */
  duplicate: boolean;
}

/**
 * The heuristic dedup identity of a row: account + calendar day + amount +
 * normalised label. Two exports of overlapping periods describe the same
 * movement with the same four values, so re-imports collide here; the label is
 * lower-cased and whitespace-collapsed to survive cosmetic export differences.
 */
export function fingerprintOf(accountId: number, row: ImportRow): string {
  const day = row.date.toISOString().slice(0, 10);
  const label = row.label.toLowerCase().replace(/\s+/g, " ").trim();
  return `${accountId}|${day}|${row.amount}|${label}`;
}

/**
 * Tag each row as new or probable duplicate, given how many stored rows
 * already carry each fingerprint. Multiset semantics: a fingerprint stored N
 * times absorbs only the file's first N occurrences, so two genuinely
 * identical movements in one file (two coffees, same day, same price) both
 * import — yet re-importing that same file later skips both.
 */
export function flagDuplicates(
  accountId: number,
  rows: ImportRow[],
  storedCounts: Map<string, number>
): FlaggedRow[] {
  const remaining = new Map(storedCounts);
  return rows.map((row) => {
    const fingerprint = fingerprintOf(accountId, row);
    const stored = remaining.get(fingerprint) ?? 0;
    if (stored > 0) {
      remaining.set(fingerprint, stored - 1);
    }
    return { ...row, fingerprint, duplicate: stored > 0 };
  });
}

const DELIMITERS = [";", ",", "\t"] as const;

/** Pick the delimiter that splits the header line the most — `;` for French
 * exports, `,` for anglo ones, tab for some tools. */
function detectDelimiter(headerLine: string): string {
  let best: string = DELIMITERS[0];
  let bestCount = 0;
  for (const candidate of DELIMITERS) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Parse the raw file content into records — first record is the header row.
 * Handles quoted fields (embedded delimiters, doubled quotes, newlines), CRLF
 * line endings and a leading BOM.
 *
 * @throws CsvImportError if the file has no data rows or a quote never closes.
 */
export function parseCsv(content: string): ParsedCsv {
  const text = content.replace(/^\uFEFF/, "");
  const firstLineEnd = text.search(/\r?\n/);
  const delimiter = detectDelimiter(
    firstLineEnd === -1 ? text : text.slice(0, firstLineEnd)
  );

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = (): void => {
    record.push(field);
    field = "";
  };
  const endRecord = (): void => {
    endField();
    // A fully blank record is file padding (trailing newline), not data.
    if (record.some((value) => value.trim() !== "")) {
      records.push(record);
    }
    record = [];
  };

  while (i < text.length) {
    const char = text[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"' && field === "") {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      endField();
      i += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      endRecord();
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (inQuotes) {
    throw new CsvImportError("Unreadable CSV: a quoted field never closes");
  }
  if (field !== "" || record.length > 0) {
    endRecord();
  }

  const [headers, ...rows] = records;
  if (!headers || rows.length === 0) {
    throw new CsvImportError(
      "Unreadable CSV: expected a header line followed by at least one data row"
    );
  }
  return { headers: headers.map((h) => h.trim()), rows };
}

/**
 * Parse a date cell — `dd/mm/yyyy` (French exports, `-` or `.` also accepted
 * as separator) or ISO `yyyy-mm-dd`. Returns a UTC-midnight date; refuses
 * impossible dates like 32/01 by checking the round-trip.
 */
function parseDateCell(value: string, line: number): Date {
  const cell = value.trim();
  const french = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(cell);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cell);

  let year: number, month: number, day: number;
  if (french) {
    day = Number(french[1]);
    month = Number(french[2]);
    year = Number(french[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    throw new CsvImportError(
      `Line ${line}: cannot parse "${cell}" as a date (expected dd/mm/yyyy or yyyy-mm-dd)`
    );
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!roundTrips) {
    throw new CsvImportError(
      `Line ${line}: "${cell}" is not a valid calendar date`
    );
  }
  return date;
}

/**
 * Parse an amount cell into signed minor units (cents). Accepts French
 * (`-1 234,56`) and anglo (`-1,234.56` / `-1234.56`) notations, a `€` suffix,
 * and any space flavour as thousands separator. When both `.` and `,` appear,
 * the rightmost is the decimal separator.
 */
function parseAmountCell(value: string, line: number): number {
  // \s already covers no-break and narrow no-break spaces (French thousands).
  let cell = value.trim().replace(/[\s\u20ac]/gu, "");
  const refuse = (): never => {
    throw new CsvImportError(
      `Line ${line}: cannot parse "${value.trim()}" as an amount`
    );
  };
  if (cell === "") refuse();

  const lastComma = cell.lastIndexOf(",");
  const lastDot = cell.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the rightmost separates decimals, the other groups thousands.
    const decimal = lastComma > lastDot ? "," : ".";
    cell = cell
      .split(decimal === "," ? "." : ",")
      .join("")
      .replace(decimal, ".");
  } else if (lastComma !== -1) {
    if (lastComma !== cell.indexOf(",")) refuse(); // several commas, no dot
    cell = cell.replace(",", ".");
  } else if (lastDot !== -1 && lastDot !== cell.indexOf(".")) {
    refuse(); // several dots, no comma
  }

  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(cell)) refuse();
  const cents = Math.round(Number(cell) * 100);
  if (!Number.isSafeInteger(cents)) refuse();
  if (cents === 0) {
    throw new CsvImportError(
      `Line ${line}: a zero amount cannot be imported as a movement`
    );
  }
  return cents;
}

/** Read one mapped cell from a row, refusing rows too short for the mapping. */
function cellAt(
  row: string[],
  column: number,
  what: string,
  line: number
): string {
  const cell = row[column];
  if (cell === undefined) {
    throw new CsvImportError(
      `Line ${line}: no ${what} in column ${column + 1} — the row has only ${row.length} column(s); check the column mapping`
    );
  }
  return cell;
}

/**
 * Apply the column mapping to every parsed data row, coercing each value.
 * Refuses a mapping that points outside the header row or maps two values to
 * the same column, and any row whose date, amount or label cannot be read —
 * one bad row refuses the whole file, keeping imports all-or-nothing.
 */
export function mapRows(
  parsed: ParsedCsv,
  mapping: ColumnMapping
): ImportRow[] {
  const { dateColumn, amountColumn, labelColumn } = mapping;
  const columns = [dateColumn, amountColumn, labelColumn];
  if (new Set(columns).size !== columns.length) {
    throw new CsvImportError(
      "Incoherent mapping: two values are mapped to the same column"
    );
  }
  if (columns.some((c) => c >= parsed.headers.length)) {
    throw new CsvImportError(
      `Incoherent mapping: the file has ${parsed.headers.length} column(s), but the mapping points beyond them`
    );
  }

  return parsed.rows.map((row, index) => {
    // Line 1 is the header, so data row N sits on CSV line N + 1.
    const line = index + 2;
    const label = cellAt(row, labelColumn, "label", line).trim();
    if (label === "") {
      throw new CsvImportError(`Line ${line}: the label column is empty`);
    }
    return {
      line,
      date: parseDateCell(cellAt(row, dateColumn, "date", line), line),
      amount: parseAmountCell(cellAt(row, amountColumn, "amount", line), line),
      label,
    };
  });
}
