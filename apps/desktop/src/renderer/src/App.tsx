import { AccountsPanel } from './components/accounts/AccountsPanel'
import { BackupsPanel } from './components/backups/BackupsPanel'
import { CategoriesPanel } from './components/categories/CategoriesPanel'
import { ExportPanel } from './components/exports/ExportPanel'
import { CashFlowPanel } from './components/reports/CashFlowPanel'
import { ReportsPanel } from './components/reports/ReportsPanel'
import { RulesPanel } from './components/rules/RulesPanel'
import { TransactionsPanel } from './components/transactions/TransactionsPanel'

function App(): React.JSX.Element {
  return (
    <main className="mx-auto flex flex-col gap-6 p-8">
      <AccountsPanel />
      <ReportsPanel />
      <CashFlowPanel />
      <TransactionsPanel />
      <CategoriesPanel />
      <RulesPanel />
      <BackupsPanel />
      <ExportPanel />
    </main>
  )
}

export default App
