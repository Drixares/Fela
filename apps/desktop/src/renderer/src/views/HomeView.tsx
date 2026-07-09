import { AccountsPanel } from '../components/accounts/AccountsPanel'
import { CashFlowPanel } from '../components/reports/CashFlowPanel'
import { ReportsPanel } from '../components/reports/ReportsPanel'

/** Vue d'ensemble : comptes, rapports et flux de trésorerie. */
export function HomeView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <AccountsPanel />
      <ReportsPanel />
      <CashFlowPanel />
    </div>
  )
}
