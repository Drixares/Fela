import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { useEffect, useMemo, useState } from 'react'

import { strings } from '../../lib/strings'
import {
  PERIOD_PRESETS,
  type Period,
  type PeriodPreset,
  presetAsInputs,
  resolveCustom,
  resolvePreset
} from '../../lib/period'

const p = strings.reports.period

/**
 * The report period selector shared by every report (see the V1 PRD #1, story
 * 38, and issue #14): a row of presets — « ce mois », « mois dernier », « 3/6/12
 * mois » — plus a custom range. It owns the preset/range choice and hands the
 * parent only the resolved `{ from, to }` bounds, so the API contract stays
 * ignorant of presets and the panel only re-queries when the bounds change.
 *
 * A custom range with a missing bound, or a start after its end, resolves to
 * nothing: the parent simply keeps the last valid period rather than querying an
 * impossible one, and the invalid hint is shown.
 */
export function PeriodSelector({
  onChange,
  defaultPreset = 'thisMonth'
}: {
  onChange: (period: Period) => void
  /** Which preset is selected on first render — « ce mois » unless a report
   * wants another default (the cash flow opens on « 12 mois », see issue #16). */
  defaultPreset?: Exclude<PeriodPreset, 'custom'>
}): React.JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const period = useMemo(
    () => (preset === 'custom' ? resolveCustom(customFrom, customTo) : resolvePreset(preset)),
    [preset, customFrom, customTo]
  )

  // Emit only when the resolved bounds actually change. The parent hands a
  // stable (memoised) handler, so depending on it here does not re-fire on
  // every render — it just keeps the effect honest to the exhaustive-deps rule.
  useEffect(() => {
    if (period) onChange(period)
  }, [period, onChange])

  function chooseCustom(): void {
    // Seed the range from the current preset so the fields open filled, not blank.
    if (customFrom === '' && customTo === '' && preset !== 'custom') {
      const seed = presetAsInputs(preset)
      setCustomFrom(seed.from)
      setCustomTo(seed.to)
    }
    setPreset('custom')
  }

  const customInvalid =
    preset === 'custom' && customFrom !== '' && customTo !== '' && period === null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_PRESETS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={preset === key ? 'default' : 'outline'}
            aria-pressed={preset === key}
            onClick={() => setPreset(key)}
          >
            {p[key]}
          </Button>
        ))}
        <Button
          size="sm"
          variant={preset === 'custom' ? 'default' : 'outline'}
          aria-pressed={preset === 'custom'}
          onClick={chooseCustom}
        >
          {p.custom}
        </Button>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="h-8 w-fit"
            aria-label={p.fromLabel}
            aria-invalid={customInvalid}
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">{p.toLabel}</span>
          <Input
            type="date"
            className="h-8 w-fit"
            aria-label={p.toLabel}
            aria-invalid={customInvalid}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          {customInvalid && <span className="text-sm text-destructive">{p.invalid}</span>}
        </div>
      )}
    </div>
  )
}
