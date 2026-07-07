import { useQuery } from '@tanstack/react-query'

import Versions from './components/Versions'
import { orpc } from './lib/orpc'
import { strings } from './lib/strings'

function App(): React.JSX.Element {
  const { data: accounts, isLoading } = useQuery(orpc.accounts.list.queryOptions())

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">{strings.app.name}</h1>
        <p className="text-muted-foreground">{strings.app.tagline}</p>
      </header>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-medium uppercase tracking-wide">{strings.accounts.title}</h2>
        <p className="text-muted-foreground">
          {isLoading || !accounts
            ? strings.accounts.loading
            : accounts.length === 0
              ? strings.accounts.empty
              : strings.accounts.count(accounts.length)}
        </p>
      </section>

      <Versions />
    </main>
  )
}

export default App
