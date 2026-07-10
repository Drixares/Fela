import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import { WalletIcon } from 'lucide-react'
import { useState } from 'react'

import { BudgetPromoCard } from '../components/spending-overview/BudgetPromoCard'
import { CategoryBreakdownCard } from '../components/spending-overview/CategoryBreakdownCard'
import { LatestTransactionsCard } from '../components/spending-overview/LatestTransactionsCard'
import { SpendTrendCard } from '../components/spending-overview/SpendTrendCard'
import { SpendingTabs, type SpendingTab } from '../components/spending-overview/SpendingTabs'
import { UpcomingTransactionsCard } from '../components/spending-overview/UpcomingTransactionsCard'
import { strings } from '../lib/strings'

const t = strings.spending

/** Spending : reproduction de l'onglet Overview du dashboard Origin (données mockées). */
export function SpendingView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SpendingTab>('overview')

  return (
    <div className="flex flex-col gap-6 p-8">
      <SpendingTabs active={activeTab} onSelect={setActiveTab} />
      {activeTab === 'budget' ? (
        // Placeholder : le budget mensuel se câble dans une slice ultérieure (issue #33).
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon />
            </EmptyMedia>
            <EmptyTitle>{t.budget.title}</EmptyTitle>
            <EmptyDescription>{t.budget.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Cette slice ne câble que Budget : les autres onglets (Breakdown,
        // Transactions, Recurring, Reports) partagent encore la maquette Overview.
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
      )}
    </div>
  )
}
