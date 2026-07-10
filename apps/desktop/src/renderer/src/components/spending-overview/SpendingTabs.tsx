import { strings } from '../../lib/strings'

const t = strings.spending.tabs

/**
 * Ordre des onglets de la page Spending. « Breakdown » et « Budget » sont deux
 * onglets distincts (l'ancien « Breakdown & budget » est scindé) : le budget
 * mensuel se câble dans une slice ultérieure et a besoin d'un onglet à lui.
 */
const SPENDING_TABS = [
  'overview',
  'breakdown',
  'budget',
  'transactions',
  'recurring',
  'reports'
] as const

export type SpendingTab = (typeof SPENDING_TABS)[number]

interface SpendingTabsProps {
  active: SpendingTab
  onSelect: (tab: SpendingTab) => void
}

/** Barre d'onglets de la page Spending : l'onglet actif est piloté par l'état parent. */
export function SpendingTabs({ active, onSelect }: SpendingTabsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-sm">
      {SPENDING_TABS.map((tab) => {
        const isActive = tab === active
        return (
          <button
            key={tab}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect(tab)}
            className={
              isActive
                ? 'rounded-md bg-muted px-3 py-1.5 font-medium text-foreground'
                : 'rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground'
            }
          >
            {t[tab]}
          </button>
        )
      })}
    </div>
  )
}
