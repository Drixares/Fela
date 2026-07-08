/** Trim a free-text field, collapsing an empty or whitespace-only value to null. */
export function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
