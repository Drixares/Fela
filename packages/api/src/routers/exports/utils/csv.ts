/**
 * One CSV cell (RFC 4180): null → empty, dates → ISO 8601, and any value
 * containing the separator, a quote or a newline is quoted with inner quotes
 * doubled, so free text like payees and notes can never break the row grid.
 */
export function csvCell(
  value: string | number | boolean | Date | null | undefined
): string {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A titled CSV section: `# name`, the header row, then one row per record with
 * `columns` picked in header order. Sections keep the export a single file
 * while every table stays separately parseable.
 */
export function csvSection<
  T extends Record<string, string | number | boolean | Date | null>,
>(name: string, columns: (keyof T & string)[], rows: T[]): string {
  const lines = [
    `# ${name}`,
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(",")
    ),
  ];
  return lines.join("\n");
}
