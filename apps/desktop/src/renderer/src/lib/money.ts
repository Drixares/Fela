/**
 * Money is stored everywhere as a signed integer number of cents (minor units)
 * — see the ledger schema. These helpers are the single crossing point between
 * that representation and the euros a person reads and types, so rounding and
 * locale formatting live in one place instead of being re-derived at each call
 * site.
 */

import { z } from 'zod'

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
})

/** Format a cent amount as a French euro string, e.g. `7_500` → « 75,00 € ». */
export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100)
}

/**
 * Render a cent amount as a plain decimal euros string suitable for seeding an
 * edit form's input (no currency symbol, `.` decimal): `7_500` → `"75"`,
 * `-1_250` → `"-12.5"`.
 */
export function centsToInput(cents: number): string {
  return String(cents / 100)
}

/**
 * Parse a euros amount typed by the user into integer cents. Accepts both `,`
 * and `.` as the decimal separator and tolerates spaces (thousands). An empty
 * string means "zero". Returns `null` when the input is not a number, so the
 * caller can reject the form rather than silently writing a wrong balance.
 */
export function parseEurToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return 0

  const euros = Number(normalized)
  if (!Number.isFinite(euros)) return null

  return Math.round(euros * 100)
}

/**
 * A reusable form field that reads a *positive* euros amount the user typed and
 * yields integer cents, failing with the caller's own message at each step. Both
 * the transaction and the transfer form take a positive amount this way, so the
 * empty → invalid → non-positive parse ladder lives here instead of once per
 * form. The three messages are passed in because each form phrases them itself.
 */
export function positiveEurCentsField(messages: {
  required: string
  invalid: string
  positive: string
}): z.ZodType<number, string> {
  return z.string().transform((value, ctx) => {
    if (value.trim() === '') {
      ctx.addIssue({ code: 'custom', message: messages.required })
      return z.NEVER
    }
    const cents = parseEurToCents(value)
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: messages.invalid })
      return z.NEVER
    }
    if (cents <= 0) {
      ctx.addIssue({ code: 'custom', message: messages.positive })
      return z.NEVER
    }
    return cents
  })
}
