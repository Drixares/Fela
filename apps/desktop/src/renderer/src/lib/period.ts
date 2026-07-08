/**
 * The report period selector lives entirely in the renderer: the API contract
 * only ever knows the resulting date bounds (see the V1 PRD #1, story 38, and
 * issue #14). This module turns a chosen preset — « ce mois », « mois dernier »,
 * « 3/6/12 mois », or a custom range — into the inclusive `{ from, to }` pair
 * the report procedures take, so the presets are defined in one place and the
 * components only render.
 */

import { fromDateInputValue, fromDateInputValueEndOfDay, toDateInputValue } from './datetime'

/** The built-in period presets, plus the escape hatch to a hand-picked range. */
export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'last3' | 'last6' | 'last12' | 'custom'

/** The order presets appear in the selector. `custom` is handled on its own. */
export const PERIOD_PRESETS: Exclude<PeriodPreset, 'custom'>[] = [
  'thisMonth',
  'lastMonth',
  'last3',
  'last6',
  'last12'
]

/** An inclusive date range — the only thing the report API understands. */
export interface Period {
  from: Date
  to: Date
}

/** Midnight at the start of `date`'s day, in the local timezone. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** The last representable instant of `date`'s day, in the local timezone. */
function endOfDay(date: Date): Date {
  const end = startOfDay(date)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * The `{ from, to }` a non-custom preset resolves to, relative to `now`.
 * « Ce mois » runs from the first of the current month to the end of today;
 * « mois dernier » covers the whole previous calendar month; « 3/6/12 mois »
 * are rolling windows ending today. `now` is injected so the result is
 * deterministic and testable.
 */
export function resolvePreset(preset: Exclude<PeriodPreset, 'custom'>, now = new Date()): Period {
  const to = endOfDay(now)
  switch (preset) {
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      // Day 0 of the current month is the last day of the previous one.
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
      return { from, to: end }
    }
    case 'last3':
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())),
        to
      }
    case 'last6':
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())),
        to
      }
    case 'last12':
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())),
        to
      }
  }
}

/**
 * The `{ from, to }` for a custom range typed as two `yyyy-mm-dd` values, or
 * `null` when either end is missing or the start is after the end — so the
 * caller can hold the previous period rather than query an impossible one. The
 * upper bound covers the whole `to` day (see `fromDateInputValueEndOfDay`).
 */
export function resolveCustom(from: string, to: string): Period | null {
  if (from === '' || to === '') return null
  const start = fromDateInputValue(from)
  const end = fromDateInputValueEndOfDay(to)
  if (start > end) return null
  return { from: start, to: end }
}

/** A preset's bounds seeded into the two custom `<input type="date">` fields. */
export function presetAsInputs(preset: Exclude<PeriodPreset, 'custom'>): {
  from: string
  to: string
} {
  const { from, to } = resolvePreset(preset)
  return { from: toDateInputValue(from), to: toDateInputValue(to) }
}
