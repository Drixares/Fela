import { useEffect, useState } from 'react'

import Versions from './components/Versions'
import { client } from './lib/orpc'
import { strings } from './lib/strings'

function App(): React.JSX.Element {
  const [accountCount, setAccountCount] = useState<number | null>(null)

  useEffect(() => {
    client.accounts
      .list()
      .then((accounts) => setAccountCount(accounts.length))
      .catch((error) => console.error(error))
  }, [])

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">{strings.app.name}</h1>
        <p className="text-muted-foreground">{strings.app.tagline}</p>
      </header>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-medium uppercase tracking-wide">{strings.accounts.title}</h2>
        <p className="text-muted-foreground">
          {accountCount === null
            ? strings.accounts.loading
            : accountCount === 0
              ? strings.accounts.empty
              : strings.accounts.count(accountCount)}
        </p>
      </section>

      <Versions />
    </main>
  )
}

export default App
