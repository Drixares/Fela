import { CategoriesPanel } from '../components/categories/CategoriesPanel'
import { RulesPanel } from '../components/rules/RulesPanel'
import { TransactionsPanel } from '../components/transactions/TransactionsPanel'

/** Dépenses : transactions, catégories et règles de catégorisation. */
export function SpendingView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <TransactionsPanel />
      <CategoriesPanel />
      <RulesPanel />
    </div>
  )
}
