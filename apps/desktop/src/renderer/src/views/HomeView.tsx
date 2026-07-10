import { BudgetCard } from '../components/dashboard/BudgetCard'
import { CreditScoreCard } from '../components/dashboard/CreditScoreCard'
import { NetWorthCard } from '../components/dashboard/NetWorthCard'
import { OnboardingCard } from '../components/dashboard/OnboardingCard'
import { RecapCard } from '../components/dashboard/RecapCard'
import { SpendingCard } from '../components/dashboard/SpendingCard'

/** Vue d'ensemble : reproduction du dashboard Origin sur données mockées. */
export function HomeView(): React.JSX.Element {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 p-8 pt-2">
      <div className="flex min-w-0 flex-col gap-6">
        <NetWorthCard />
        <SpendingCard />
      </div>
      <div className="flex flex-col gap-6">
        <OnboardingCard />
        <RecapCard />
        <BudgetCard />
        <CreditScoreCard />
      </div>
    </div>
  )
}
