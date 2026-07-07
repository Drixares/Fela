import { AccountsPanel } from './components/accounts/AccountsPanel'
import { BackupsPanel } from './components/backups/BackupsPanel'
import { CategoriesPanel } from './components/categories/CategoriesPanel'
import { TransactionsPanel } from './components/transactions/TransactionsPanel'

function App(): React.JSX.Element {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <AccountsPanel />
      <TransactionsPanel />
      <CategoriesPanel />
      <BackupsPanel />
    </main>
  )
}

export default App
