import { AccountsPanel } from './components/accounts/AccountsPanel'
import { BackupsPanel } from './components/backups/BackupsPanel'
import { CategoriesPanel } from './components/categories/CategoriesPanel'
import { ExportPanel } from './components/exports/ExportPanel'
import { TransactionsPanel } from './components/transactions/TransactionsPanel'

function App(): React.JSX.Element {
  return (
    <main className="mx-auto flex flex-col gap-6 p-8">
      <AccountsPanel />
      <TransactionsPanel />
      <CategoriesPanel />
      <BackupsPanel />
      <ExportPanel />
    </main>
  )
}

export default App
