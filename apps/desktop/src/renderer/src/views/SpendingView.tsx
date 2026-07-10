import { BudgetPromoCard } from '../components/spending-overview/BudgetPromoCard'
import { CategoryBreakdownCard } from '../components/spending-overview/CategoryBreakdownCard'
import { LatestTransactionsCard } from '../components/spending-overview/LatestTransactionsCard'
import { SpendTrendCard } from '../components/spending-overview/SpendTrendCard'
import { SpendingTabs } from '../components/spending-overview/SpendingTabs'
import { UpcomingTransactionsCard } from '../components/spending-overview/UpcomingTransactionsCard'

/** Spending : reproduction de l'onglet Overview du dashboard Origin (données mockées). */
export function SpendingView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <SpendingTabs />
      <div className="grid grid-cols-[1fr_360px] items-start gap-6">
        <div className="flex flex-col gap-6">
          <SpendTrendCard />
          <div className="grid grid-cols-2 gap-6">
            <LatestTransactionsCard />
            <UpcomingTransactionsCard />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <BudgetPromoCard />
          <CategoryBreakdownCard />
        </div>
      </div>
    </div>
  )
}
