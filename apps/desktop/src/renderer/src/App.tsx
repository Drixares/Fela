import { Button, buttonVariants } from '@repo/ui/components/button'
import { useState } from 'react'

import electronLogo from './assets/electron.svg'
import Versions from './components/Versions'
import { client } from './lib/orpc'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  const [receivedAt, setReceivedAt] = useState<string | null>(null)

  const logOnServer = async (): Promise<void> => {
    const { createdAt } = await client.messages.add({ content: 'Hello from renderer' })
    setReceivedAt(createdAt.toISOString())
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={ipcHandle}>Send IPC</Button>

        <Button variant="secondary" onClick={logOnServer}>
          Log on server
        </Button>

        <a
          href="https://electron-vite.org/"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'outline' })}
        >
          Documentation
        </a>
      </div>
      {receivedAt && <p className="tip">Server received at {receivedAt}</p>}
      <Versions></Versions>
    </>
  )
}

export default App
