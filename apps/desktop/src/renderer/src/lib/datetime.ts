/**
 * French locale formatting for the timestamps and file sizes the UI shows.
 * Centralised so the locale and format live in one place, like `money.ts` does
 * for amounts.
 */

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium'
})

/** Format an epoch-milliseconds instant as a French date and time. */
export function formatDateTime(epochMs: number): string {
  return dateTimeFormatter.format(new Date(epochMs))
}

/** Format a date as a French day-only string, e.g. « 1 mars 2026 ». */
export function formatDate(date: Date): string {
  return dateFormatter.format(date)
}

const monthShortFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC'
})

const monthLongFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

/**
 * Format a `YYYY-MM` month key (as `reports.cashFlow` returns them, in UTC) into
 * a French month label. `long` gives « mars 2026 » for tooltips; the default
 * short form gives « mars 26 » for a compact axis. Formatted in UTC so the month
 * never shifts across a timezone boundary the way a local parse could.
 */
export function formatMonthKey(key: string, variant: 'short' | 'long' = 'short'): string {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return (variant === 'long' ? monthLongFormatter : monthShortFormatter).format(date)
}

/** The current month as a `YYYY-MM` key, from the local clock. */
export function currentMonthKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Shift a `YYYY-MM` key by a whole number of months (negative steps back). The
 * arithmetic runs in UTC so the month never drifts across a timezone boundary,
 * matching `formatMonthKey`.
 */
export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${shiftedMonth}`
}

/**
 * A date as `yyyy-mm-dd` in the local timezone — the value a native
 * `<input type="date">` expects. Built from the local parts (not `toISOString`,
 * which is UTC and can shift the day across midnight).
 */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a `yyyy-mm-dd` input value into a local `Date` at midnight. Built from
 * the parts rather than `new Date(value)`, which would read the string as UTC
 * and land on the previous day in negative-offset zones.
 */
export function fromDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Parse a `yyyy-mm-dd` input value into a local `Date` at the last instant of
 * that day — the inclusive upper bound of a period filter, so transactions
 * carrying any time on the chosen day still fall inside the period.
 */
export function fromDateInputValueEndOfDay(value: string): Date {
  const date = fromDateInputValue(value)
  date.setHours(23, 59, 59, 999)
  return date
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
