/**
 * French locale formatting for the timestamps and file sizes the UI shows.
 * Centralised so the locale and format live in one place, like `money.ts` does
 * for amounts.
 */

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

/** Format an epoch-milliseconds instant as a French date and time. */
export function formatDateTime(epochMs: number): string {
  return dateTimeFormatter.format(new Date(epochMs))
}

/** Format a byte count as a short human-readable size, e.g. `1 536` → « 1,5 Ko ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  const units = ['Ko', 'Mo', 'Go']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${units[unit]}`
}
