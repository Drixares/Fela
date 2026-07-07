import { AccountsPanel } from './components/accounts/AccountsPanel'
import { BackupsPanel } from './components/backups/BackupsPanel'
import { CategoriesPanel } from './components/categories/CategoriesPanel'
import { strings } from './lib/strings'

function App(): React.JSX.Element {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">{strings.app.name}</h1>
        <p className="text-muted-foreground">{strings.app.tagline}</p>
      </header>

      <AccountsPanel />
      <CategoriesPanel />
      <BackupsPanel />
    </main>
  )
}

export default App
