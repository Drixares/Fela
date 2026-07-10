const TABS = ['Overview', 'Breakdown & budget', 'Transactions', 'Recurring', 'Reports'] as const

/** Barre d'onglets statique de la page Spending : seul « Overview » est actif (non fonctionnel). */
export function SpendingTabs(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-sm">
      {TABS.map((tab) => {
        const active = tab === 'Overview'
        return (
          <span
            key={tab}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-md bg-muted px-3 py-1.5 font-medium text-foreground'
                : 'rounded-md px-3 py-1.5 text-muted-foreground'
            }
          >
            {tab}
          </span>
        )
      })}
    </div>
  )
}
